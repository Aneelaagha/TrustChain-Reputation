import { Router, type IRouter } from "express";
import { db, usersTable, signalsTable, vouchesTable } from "@workspace/db";
import { ExplainScoreBody, ExplainScoreResponse } from "@workspace/api-zod";
import { computeTrustScores } from "../lib/trustScore";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/explain", async (req, res): Promise<void> => {
  const parsed = ExplainScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = parsed.data;

  const users = await db.select().from(usersTable);
  const signals = await db.select().from(signalsTable);
  const vouches = await db.select().from(vouchesTable);

  const user = users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const userIds = users.map((u) => u.id);
  const userSignals = users.map((u) => ({
    userId: u.id,
    signals: signals
      .filter((s) => s.userId === u.id)
      .map((s) => ({ type: s.type, months_consistent: s.monthsConsistent })),
  }));
  const vouchEdges = vouches.map((v) => ({
    voucherId: v.voucherId,
    voucheeId: v.voucheeId,
    strength: v.strength,
  }));

  const scores = computeTrustScores(userIds, userSignals, vouchEdges);
  const score = scores[userId] ?? 300;

  const userSigs = signals.filter((s) => s.userId === userId);
  const rentMonths = userSigs.filter((s) => s.type === "rent").reduce((a, b) => a + b.monthsConsistent, 0);
  const utilityMonths = userSigs.filter((s) => s.type === "utility").reduce((a, b) => a + b.monthsConsistent, 0);
  const mobileMonths = userSigs.filter((s) => s.type === "mobile").reduce((a, b) => a + b.monthsConsistent, 0);
  const defaults = userSigs.filter((s) => s.type === "default").reduce((a, b) => a + b.monthsConsistent, 0);
  const vouchCount = vouches.filter((v) => v.voucheeId === userId).length;

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    res.json(ExplainScoreResponse.parse({
      explanation: `Your TrustChain score of ${score}/850 reflects your financial history and community trust. Keep building your signals to improve your score.`,
    }));
    return;
  }

  const callAnthropic = async (): Promise<string | null> => {
    const models = ["claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicApiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 300,
              system:
                "You are TrustChain, a financial reputation system. Explain a person's trust score in 2-3 warm, encouraging sentences. Be specific about what's helping and what could improve. Never be condescending.",
              messages: [
                {
                  role: "user",
                  content: `User has score ${score}/850. Signals: ${rentMonths} months rent on time, ${utilityMonths} months utility bills, ${mobileMonths} months mobile top-ups, ${defaults} defaults. They have ${vouchCount} vouchers. Explain their score.`,
                },
              ],
            }),
          });

          if (response.status === 529 || response.status === 503) {
            logger.warn({ status: response.status, model, attempt }, "Anthropic overloaded, retrying");
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }

          if (!response.ok) {
            const errText = await response.text();
            logger.error({ status: response.status, body: errText }, "Anthropic API error");
            return null;
          }

          const data = await response.json() as {
            content: Array<{ type: string; text: string }>;
          };
          return data.content?.[0]?.text ?? null;
        } catch (err) {
          logger.error({ err }, "Failed to call Anthropic API");
          return null;
        }
      }
    }
    return null;
  };

  try {
    const aiText = await callAnthropic();
    const explanation = aiText ?? `Your TrustChain score of ${score}/850 reflects your payment history across ${rentMonths + utilityMonths + mobileMonths} months of signals and ${vouchCount} community vouch${vouchCount !== 1 ? "es" : ""}. Keep building consistent records to grow your score.`;
    res.json(ExplainScoreResponse.parse({ explanation }));
  } catch (err) {
    logger.error({ err }, "Explain route error");
    res.json(ExplainScoreResponse.parse({
      explanation: `Your TrustChain score of ${score}/850 is based on your payment history and vouches from your community. Keep building consistent payment records to grow your score.`,
    }));
  }
});

export default router;

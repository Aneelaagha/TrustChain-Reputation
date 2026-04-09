import { Router, type IRouter } from "express";
import { db, usersTable, signalsTable, vouchesTable } from "@workspace/db";
import { GetAllScoresResponse, GetUserScoreResponse } from "@workspace/api-zod";
import { computeTrustScores, computeScoreBreakdown } from "../lib/trustScore";

const router: IRouter = Router();

async function getScoresData() {
  const users = await db.select().from(usersTable);
  const signals = await db.select().from(signalsTable);
  const vouches = await db.select().from(vouchesTable);

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

  return { users, signals, vouches, userIds, userSignals, vouchEdges };
}

router.get("/scores", async (_req, res): Promise<void> => {
  const { userIds, userSignals, vouchEdges } = await getScoresData();
  const scores = computeTrustScores(userIds, userSignals, vouchEdges);
  res.json(GetAllScoresResponse.parse(scores));
});

router.get("/scores/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const { users, signals, vouches, userIds, userSignals, vouchEdges } = await getScoresData();

  const user = users.find((u) => u.id === rawId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const scores = computeTrustScores(userIds, userSignals, vouchEdges);
  const score = scores[rawId] ?? 300;

  const userSigs = signals
    .filter((s) => s.userId === rawId)
    .map((s) => ({ type: s.type, months_consistent: s.monthsConsistent }));

  const incomingVouches = vouches.filter((v) => v.voucheeId === rawId);
  const breakdown = computeScoreBreakdown(rawId, userSigs, incomingVouches.length, score);

  const vouchers = await Promise.all(
    incomingVouches.map(async (v) => {
      const voucherUser = users.find((u) => u.id === v.voucherId);
      return {
        id: v.voucherId,
        name: voucherUser?.name ?? "Unknown",
        score: scores[v.voucherId] ?? 300,
        strength: v.strength,
      };
    })
  );

  res.json(
    GetUserScoreResponse.parse({
      userId: rawId,
      score,
      breakdown,
      vouchers,
    })
  );
});

export default router;

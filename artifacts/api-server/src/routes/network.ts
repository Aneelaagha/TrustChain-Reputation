import { Router, type IRouter } from "express";
import { db, usersTable, vouchesTable, signalsTable } from "@workspace/db";
import { GetNetworkResponse } from "@workspace/api-zod";
import { computeTrustScores } from "../lib/trustScore";

const router: IRouter = Router();

router.get("/network", async (_req, res): Promise<void> => {
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

  const scores = computeTrustScores(userIds, userSignals, vouchEdges);

  const nodes = users.map((u) => ({
    id: u.id,
    name: u.name,
    score: scores[u.id] ?? 300,
  }));

  const links = vouches.map((v) => ({
    source: v.voucherId,
    target: v.voucheeId,
    strength: v.strength,
  }));

  res.json(GetNetworkResponse.parse({ nodes, links }));
});

export default router;

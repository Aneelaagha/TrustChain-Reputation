import { Router, type IRouter } from "express";
import { db, signalsTable } from "@workspace/db";
import { AddSignalBody, AddSignalResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/signal", async (req, res): Promise<void> => {
  const parsed = AddSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, type, months_consistent } = parsed.data;

  const [signal] = await db
    .insert(signalsTable)
    .values({
      userId,
      type,
      monthsConsistent: months_consistent,
    })
    .returning();

  res.json(AddSignalResponse.parse({
    id: signal.id,
    user_id: signal.userId,
    type: signal.type,
    months_consistent: signal.monthsConsistent,
    created_at: signal.createdAt.toISOString(),
  }));
});

export default router;

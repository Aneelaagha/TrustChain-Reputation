import { Router, type IRouter } from "express";
import { db, vouchesTable } from "@workspace/db";
import { AddVouchBody, AddVouchResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/vouch", async (req, res): Promise<void> => {
  const parsed = AddVouchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { voucherId, voucheeId, strength } = parsed.data;

  const [vouch] = await db
    .insert(vouchesTable)
    .values({ voucherId, voucheeId, strength })
    .returning();

  res.json(AddVouchResponse.parse({
    id: vouch.id,
    voucher_id: vouch.voucherId,
    vouchee_id: vouch.voucheeId,
    strength: vouch.strength,
    created_at: vouch.createdAt.toISOString(),
  }));
});

export default router;

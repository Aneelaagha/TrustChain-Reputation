import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  CreateOrFindUserBody,
  CreateOrFindUserResponse,
  GetAllUsersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateOrFindUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email } = parsed.data;

  // Try to find existing user
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.json(CreateOrFindUserResponse.parse({
      id: existing[0].id,
      name: existing[0].name,
      email: existing[0].email,
      created_at: existing[0].createdAt.toISOString(),
    }));
    return;
  }

  // Create new user
  const [user] = await db
    .insert(usersTable)
    .values({ name, email })
    .returning();

  res.json(CreateOrFindUserResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt.toISOString(),
  }));
});

router.get("/users/all", async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json(GetAllUsersResponse.parse(users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    created_at: u.createdAt.toISOString(),
  }))));
});

export default router;

import { Router, type IRouter } from "express";
import { db, usersTable, signalsTable, vouchesTable } from "@workspace/db";
import { SeedDatabaseResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const FAKE_NAMES = [
  "Amara Diallo", "Kofi Mensah", "Fatima Al-Hassan", "Ibrahim Traoré",
  "Zainab Okafor", "Kwame Asante", "Laila Benali", "Moussa Coulibaly",
  "Priya Nair", "Rohan Sharma", "Meera Patel", "Arjun Krishnan",
  "Sofia Morales", "Carlos Reyes", "Ana García", "Miguel Santos",
  "Yuki Tanaka", "Kenji Yamamoto", "Min-Ji Park", "Hui Zhang",
  "Ama Agyei", "Kweku Boateng", "Efua Asante", "Nana Akua",
  "Leila Hassan", "Omar Abdullah", "Aisha Mohammed", "Yusuf Ibrahim",
  "Blessing Eze", "Chidi Obi",
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get("/seed", async (req, res): Promise<void> => {
  req.log.info("Starting database seed");

  // Clear existing data
  await db.delete(vouchesTable);
  await db.delete(signalsTable);
  await db.delete(usersTable);

  // Create 30 fake users
  const createdUsers = [];
  for (let i = 0; i < FAKE_NAMES.length; i++) {
    const name = FAKE_NAMES[i];
    const emailSafe = name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
    const email = `${emailSafe}${i}@trustchain.example`;

    const [user] = await db
      .insert(usersTable)
      .values({ name, email })
      .returning();

    createdUsers.push(user);
  }

  // Create randomized signals for each user
  const signalTypes = ["rent", "utility", "mobile", "default"] as const;
  for (const user of createdUsers) {
    // Each user gets 2-4 signal types
    const numSignals = randomBetween(2, 4);
    const shuffled = [...signalTypes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < numSignals; i++) {
      const type = shuffled[i];
      let monthsConsistent: number;

      if (type === "default") {
        // Defaults are rare — 70% chance of 0, otherwise 1-2
        monthsConsistent = Math.random() > 0.7 ? randomBetween(1, 2) : 0;
        if (monthsConsistent === 0) continue;
      } else {
        monthsConsistent = randomBetween(3, 36);
      }

      await db.insert(signalsTable).values({
        userId: user.id,
        type,
        monthsConsistent,
      });
    }
  }

  // Create random vouch relationships (each user vouches for 1-4 others)
  for (const voucher of createdUsers) {
    const numVouches = randomBetween(1, 4);
    const candidates = createdUsers.filter((u) => u.id !== voucher.id);
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numVouches, shuffled.length); i++) {
      const vouchee = shuffled[i];
      await db.insert(vouchesTable).values({
        voucherId: voucher.id,
        voucheeId: vouchee.id,
        strength: randomBetween(3, 10),
      });
    }
  }

  logger.info({ usersCreated: createdUsers.length }, "Database seeded");

  res.json(SeedDatabaseResponse.parse({
    message: "Database seeded successfully",
    usersCreated: createdUsers.length,
  }));
});

export default router;

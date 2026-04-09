import { pgTable, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const vouchesTable = pgTable("vouches", {
  id: uuid("id").primaryKey().defaultRandom(),
  voucherId: uuid("voucher_id").references(() => usersTable.id).notNull(),
  voucheeId: uuid("vouchee_id").references(() => usersTable.id).notNull(),
  strength: integer("strength").notNull().default(5), // 1-10
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVouchSchema = createInsertSchema(vouchesTable).omit({ id: true, createdAt: true });
export type InsertVouch = z.infer<typeof insertVouchSchema>;
export type Vouch = typeof vouchesTable.$inferSelect;

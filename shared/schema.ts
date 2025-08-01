import { z } from "zod";
import { pgTable, text, real, bigint, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Database Tables
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").$type<"in" | "out">().notNull(),
  amount: real("amount").notNull(),
  remark: text("remark").notNull(),
  user: text("user").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const pendingPayments = pgTable("pending_payments", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  remark: text("remark").notNull(),
  user: text("user").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const meterReadings = pgTable("meter_readings", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  reading: real("reading").notNull(),
  remark: text("remark").notNull(),
  user: text("user").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  user: text("user").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Zod Schemas
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertPendingPaymentSchema = createInsertSchema(pendingPayments).omit({ id: true });
export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({ id: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Types
export type Transaction = typeof transactions.$inferSelect;
export type PendingPayment = typeof pendingPayments.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type User = typeof users.$inferSelect;

export type InsertTransaction = typeof transactions.$inferInsert;
export type InsertPendingPayment = typeof pendingPayments.$inferInsert;
export type InsertMeterReading = typeof meterReadings.$inferInsert;
export type InsertNote = typeof notes.$inferInsert;
export type InsertUser = typeof users.$inferInsert;

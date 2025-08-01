CREATE TABLE "meter_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"reading" real NOT NULL,
	"remark" text NOT NULL,
	"user" text NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"user" text NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"amount" real NOT NULL,
	"remark" text NOT NULL,
	"user" text NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"amount" real NOT NULL,
	"remark" text NOT NULL,
	"user" text NOT NULL,
	"timestamp" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

DROP TABLE IF EXISTS "public"."credentials";
CREATE SEQUENCE IF NOT EXISTS credentials_id_seq;
CREATE TABLE "public"."credentials" (
    "id" int4 NOT NULL DEFAULT nextval('credentials_id_seq'::regclass),
    "access_token" text NOT NULL,
    "refresh_token" text,
    "user_id" text NOT NULL,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."runs";
CREATE SEQUENCE IF NOT EXISTS runs_id_seq;
CREATE TABLE "public"."runs" (
    "id" int4 NOT NULL DEFAULT nextval('runs_id_seq'::regclass),
    "date" timestamp NOT NULL DEFAULT now(),
    "credentials_id" int4 NOT NULL,
    PRIMARY KEY ("id")
);

ALTER TABLE "public"."runs" ADD FOREIGN KEY ("credentials_id") REFERENCES "public"."credentials"("id");
CREATE UNIQUE INDEX "user_id_unique" ON "public"."credentials" USING BTREE ("user_id");
ALTER TABLE "public"."runs" DROP CONSTRAINT "runs_credentials_id_fkey";
ALTER TABLE "public"."runs" ADD FOREIGN KEY ("credentials_id") REFERENCES "public"."credentials" ("id") ON DELETE CASCADE;
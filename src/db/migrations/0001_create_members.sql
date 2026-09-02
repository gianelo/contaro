-- Members (#3). Identity only: a person, and the Google account they sign in
-- with. Which Spaces a Member belongs to arrives with #4.
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_google_subject_unique" UNIQUE("google_subject")
);

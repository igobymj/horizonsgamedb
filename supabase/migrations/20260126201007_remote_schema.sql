


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academicTerm') THEN
        CREATE TYPE "public"."academicTerm" AS ENUM ('Fall', 'Winter', 'Spring', 'Summer');
    END IF;
END$$;


ALTER TYPE "public"."academicTerm" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."genres" (
    "id" integer NOT NULL,
    "genre" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."genres" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."genres_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."genres_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."genres_id_seq" OWNED BY "public"."genres"."id";



CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" integer NOT NULL,
    "institutionname" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "used_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."keywords" (
    "id" integer NOT NULL,
    "keyword" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."keywords" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."keywords_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."keywords_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."keywords_id_seq" OWNED BY "public"."keywords"."id";



CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "contactlink" "text",
    "institution_id" integer,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "institution_other" "text",
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "user_type" "text" DEFAULT 'student'::"text" NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "bio" "text",
    "website" "text",
    "linkedin_url" "text",
    "social_media_url" "text",
    "graduation_year" integer,
    "degree" "text",
    "is_public" boolean DEFAULT true,
    CONSTRAINT "people_type_check" CHECK (("user_type" = ANY (ARRAY['admin'::"text", 'instructor'::"text", 'student'::"text", 'contributor'::"text"]))),
    CONSTRAINT "check_institution" CHECK (((("institution_id" IS NOT NULL) AND ("institution_other" IS NULL)) OR (("institution_id" IS NULL) AND ("institution_other" IS NOT NULL))))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people_projects" (
    "project_id" integer NOT NULL,
    "person_id" integer NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "people_projects_role_check" CHECK (("role" = ANY (ARRAY['creator'::"text", 'instructor'::"text"])))
);


ALTER TABLE "public"."people_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "genre" "text",
    "year" integer,
    "term" "text",
    "classnumber" "text",
    "briefdescription" "text",
    "fulldescription" "text",
    "image_urls" "text"[],
    "videolink" "text",
    "downloadlink" "text",
    "repolink" "text",
    "keywords" "text"[],
    "created_at" timestamp without time zone DEFAULT "now"(),
    "institution_id" integer,
    "coursename" "text",
    "assignment" "text",
    "techused" "text"[],
    "genre_id" integer,
    "genres" "text"[],
    "testproject_flag" boolean,
    CONSTRAINT "projects_term_check" CHECK (("term" = ANY (ARRAY['Fall'::"text", 'Winter'::"text", 'Spring'::"text", 'Summer'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."institutions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."institutions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."institutions_id_seq" OWNED BY "public"."institutions"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."people_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."people_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."people_id_seq" OWNED BY "public"."people"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."projects_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."projects_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."projects_id_seq" OWNED BY "public"."projects"."id";



ALTER TABLE ONLY "public"."genres" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."genres_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."institutions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."institutions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."keywords" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."keywords_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."people" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."people_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."projects" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."projects_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_genre_key" UNIQUE ("genre");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_keyword_key" UNIQUE ("keyword");



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_institutionname_key" UNIQUE ("institutionname");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people_projects"
    ADD CONSTRAINT "people_projects_pkey" PRIMARY KEY ("project_id", "person_id", "role");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



CREATE INDEX "idxinvites_code" ON "public"."invites" USING "btree" ("code");



CREATE INDEX "idxinvites_email" ON "public"."invites" USING "btree" ("email");



CREATE INDEX "idxpeople_email" ON "public"."people" USING "btree" ("email");



CREATE INDEX "idxpeople_institution" ON "public"."people" USING "btree" ("institution_id");



CREATE INDEX "idxpeople_user_id" ON "public"."people" USING "btree" ("user_id");



CREATE INDEX "idxpeople_projects_person" ON "public"."people_projects" USING "btree" ("person_id");



CREATE INDEX "idxpeople_projects_project" ON "public"."people_projects" USING "btree" ("project_id");



CREATE INDEX "idxprojects_year_term" ON "public"."projects" USING "btree" ("year", "term");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."keywords"
    ADD CONSTRAINT "keywords_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."people_projects"
    ADD CONSTRAINT "people_projects_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people_projects"
    ADD CONSTRAINT "people_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can read invites" ON "public"."invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."people"
  WHERE (("people"."user_id" = "auth"."uid"()) AND ("people"."user_type" = 'admin'::"text")))));



CREATE POLICY "Allow signup inserts with valid invitation code" ON "public"."people" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."invites"
  WHERE (("invites"."email" = "people"."email") AND ("invites"."is_active" = true) AND ("invites"."used_at" IS NULL)))));



CREATE POLICY "Anyone can view institutions" ON "public"."institutions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view people" ON "public"."people" FOR SELECT USING (true);



CREATE POLICY "Anyone can view people_projects" ON "public"."people_projects" FOR SELECT USING (true);



CREATE POLICY "Anyone can view projects" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete institutions" ON "public"."institutions" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete people" ON "public"."people" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete people_projects" ON "public"."people_projects" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete projects" ON "public"."projects" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert institutions" ON "public"."institutions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert people" ON "public"."people" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert people_projects" ON "public"."people_projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update institutions" ON "public"."institutions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update people" ON "public"."people" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."people_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invites_delete_admin" ON "public"."invites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."people"
  WHERE (("people"."user_id" = "auth"."uid"()) AND ("people"."user_type" = 'admin'::"text")))));



CREATE POLICY "invites_insert_admin" ON "public"."invites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."people"
  WHERE (("people"."user_id" = "auth"."uid"()) AND ("people"."user_type" = 'admin'::"text")))));



CREATE POLICY "invites_select_all" ON "public"."invites" FOR SELECT USING (true);



CREATE POLICY "invites_update_admin" ON "public"."invites" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."people"
  WHERE (("people"."user_id" = "auth"."uid"()) AND ("people"."user_type" = 'admin'::"text")))));



CREATE POLICY "invites_update_anon" ON "public"."invites" FOR UPDATE TO "anon" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."genres" TO "anon";
GRANT ALL ON TABLE "public"."genres" TO "authenticated";
GRANT ALL ON TABLE "public"."genres" TO "service_role";


GRANT ALL ON SEQUENCE "public"."genres_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."genres_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."genres_id_seq" TO "service_role";


GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";


GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";


GRANT ALL ON TABLE "public"."keywords" TO "anon";
GRANT ALL ON TABLE "public"."keywords" TO "authenticated";
GRANT ALL ON TABLE "public"."keywords" TO "service_role";


GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."keywords_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."people_projects" TO "anon";
GRANT ALL ON TABLE "public"."people_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."people_projects" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."institutions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."institutions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."institutions_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."people_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."projects_id_seq" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


drop extension if exists "pg_net";

-- Create the 'project-images' bucket (Force public=true if exists)
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do update set public = true;

-- Ensure RLS is enabled or policies won't work
alter table storage.objects enable row level security;

-- Storage policies for project-images bucket

-- 1. View (Select) for Authenticated
DROP POLICY IF EXISTS "Authenticated User Can See Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'project-images' );

-- 2. Upload (Insert) for Authenticated
DROP POLICY IF EXISTS "Authenticated User Can Add Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'project-images' );

-- 3. Update for Authenticated
DROP POLICY IF EXISTS "Authenticated User Can Update Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'project-images' );

-- 4. Delete for Authenticated
DROP POLICY IF EXISTS "Authenticated User Can Delete Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'project-images' );

-- 5. View (Select) for Public
DROP POLICY IF EXISTS "Public Can See Images" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view images" ON storage.objects;
CREATE POLICY "Public users can view images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'project-images' );

-- 6. Upload (Insert) for Public
DROP POLICY IF EXISTS "Public Can Add Images" ON storage.objects;
DROP POLICY IF EXISTS "Public users can upload images" ON storage.objects;
CREATE POLICY "Public users can upload images"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'project-images' );








































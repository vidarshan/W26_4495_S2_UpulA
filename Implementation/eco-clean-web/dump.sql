--
-- PostgreSQL database dump
--

\restrict 1VTPcufyqXioZ9JTHLfPJ675eXgTloJxyiEWSfCAh9CdhgT9UkQ5IiE1Iv9yDrT

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

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

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED',
    'LATE'
);


ALTER TYPE public."AppointmentStatus" OWNER TO vidarshanrathnayake;

--
-- Name: JobType; Type: TYPE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TYPE public."JobType" AS ENUM (
    'ONE_OFF',
    'RECURRING'
);


ALTER TYPE public."JobType" OWNER TO vidarshanrathnayake;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'STAFF',
    'CLIENT'
);


ALTER TYPE public."Role" OWNER TO vidarshanrathnayake;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    street1 text NOT NULL,
    street2 text,
    city text NOT NULL,
    province text NOT NULL,
    "postalCode" text NOT NULL,
    country text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isBilling" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Address" OWNER TO vidarshanrathnayake;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    "startTime" timestamp(6) with time zone NOT NULL,
    "endTime" timestamp(6) with time zone NOT NULL,
    status public."AppointmentStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completionSent" boolean DEFAULT false NOT NULL,
    "reminder1dSent" boolean DEFAULT false NOT NULL,
    "reminder5dSent" boolean DEFAULT false NOT NULL,
    "jobId" text NOT NULL,
    "timeSpent" integer,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."Appointment" OWNER TO vidarshanrathnayake;

--
-- Name: AppointmentImage; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."AppointmentImage" (
    id text NOT NULL,
    "appointmentId" text NOT NULL,
    url text NOT NULL,
    "fileKey" text
);


ALTER TABLE public."AppointmentImage" OWNER TO vidarshanrathnayake;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    title text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "companyName" text,
    email text NOT NULL,
    phone text NOT NULL,
    "preferredContact" text NOT NULL,
    "leadSource" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Client" OWNER TO vidarshanrathnayake;

--
-- Name: ClientNote; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."ClientNote" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ClientNote" OWNER TO vidarshanrathnayake;

--
-- Name: Job; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."Job" (
    id text NOT NULL,
    title text NOT NULL,
    type public."JobType" NOT NULL,
    "clientId" text NOT NULL,
    "addressId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isAnytime" boolean DEFAULT false NOT NULL,
    "visitInstructions" text
);


ALTER TABLE public."Job" OWNER TO vidarshanrathnayake;

--
-- Name: JobLineItem; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."JobLineItem" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    name text NOT NULL,
    quantity integer NOT NULL,
    "unitCost" double precision,
    "unitPrice" double precision,
    total double precision,
    description text
);


ALTER TABLE public."JobLineItem" OWNER TO vidarshanrathnayake;

--
-- Name: JobNote; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."JobNote" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    content text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."JobNote" OWNER TO vidarshanrathnayake;

--
-- Name: JobNoteImage; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."JobNoteImage" (
    id text NOT NULL,
    "noteId" text NOT NULL,
    url text NOT NULL
);


ALTER TABLE public."JobNoteImage" OWNER TO vidarshanrathnayake;

--
-- Name: Recurrence; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."Recurrence" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    frequency text NOT NULL,
    "interval" integer NOT NULL,
    "endsOn" timestamp(3) without time zone,
    "endType" text NOT NULL,
    "endsAfter" integer
);


ALTER TABLE public."Recurrence" OWNER TO vidarshanrathnayake;

--
-- Name: User; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    password text NOT NULL
);


ALTER TABLE public."User" OWNER TO vidarshanrathnayake;

--
-- Name: VisitNote; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."VisitNote" (
    id text NOT NULL,
    content text NOT NULL,
    "isClientVisible" boolean DEFAULT false NOT NULL,
    "appointmentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VisitNote" OWNER TO vidarshanrathnayake;

--
-- Name: _AppointmentStaff; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public."_AppointmentStaff" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_AppointmentStaff" OWNER TO vidarshanrathnayake;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: vidarshanrathnayake
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO vidarshanrathnayake;

--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Address" (id, "clientId", street1, street2, city, province, "postalCode", country, "isPrimary", "isBilling", "createdAt") FROM stdin;
cf794d55-acf0-4dc2-bd45-5e0ea331e63a	5a4f94a2-31f0-4739-81a7-785b932ea856	2017 Seventh Ave		NW	BC	V3M 2L5	Canada	t	f	2026-02-17 00:44:52.14
c1862bb0-395f-4bff-b050-c5f8c8f047ac	5a4f94a2-31f0-4739-81a7-785b932ea856	5017 Chambers St		Vancouver	BC	V11 H90	Canada	f	f	2026-02-17 00:44:52.14
\.


--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Appointment" (id, "startTime", "endTime", status, "createdAt", "completionSent", "reminder1dSent", "reminder5dSent", "jobId", "timeSpent", "completedAt") FROM stdin;
5f7f69a1-1a7e-43c1-bec8-4028330d246c	2026-02-17 16:30:00-08	2026-02-17 17:30:00-08	SCHEDULED	2026-02-20 04:35:51.698-08	f	f	f	fd8a4b39-3be6-45c1-b745-b743174e12af	\N	\N
ed9c77a2-89cf-45b7-8285-3e5a45220a2e	2026-02-21 15:30:00-08	2026-02-21 17:30:00-08	SCHEDULED	2026-02-20 07:52:01.321-08	f	f	f	14c381f8-6fb1-4edf-8d2a-fedd996447ff	\N	\N
0fac0606-71d1-4fa2-9918-94709b1fdc01	2026-02-12 18:00:00-08	2026-02-12 20:00:00-08	SCHEDULED	2026-02-19 06:04:47.822-08	f	f	f	78e1e30e-cc63-4cf1-8bd2-4249c9c7fe68	\N	\N
04f0c99b-a87c-465a-a80d-8c6ff8531862	2026-03-05 17:00:00-08	2026-03-05 18:30:00-08	SCHEDULED	2026-02-20 00:18:18.118-08	f	f	f	8f73968b-6d7f-4be9-baf1-8dc763038aaf	\N	\N
4b7f46c8-3d50-4c06-9368-d509e6d79e12	2026-03-12 16:00:00-07	2026-03-12 17:30:00-07	SCHEDULED	2026-02-20 00:18:18.12-08	f	f	f	8f73968b-6d7f-4be9-baf1-8dc763038aaf	\N	\N
4533d131-bd05-460b-ad3f-347fbd45e02b	2026-03-09 16:00:00-07	2026-03-09 18:00:00-07	SCHEDULED	2026-02-20 00:20:08.926-08	f	f	f	58930173-d733-47d6-b452-51243c17cc93	\N	\N
311624ae-2b37-4fcb-bad0-41655b0df91b	2026-04-09 16:00:00-07	2026-04-09 18:00:00-07	SCHEDULED	2026-02-20 00:20:08.929-08	f	f	f	58930173-d733-47d6-b452-51243c17cc93	\N	\N
636c0fed-bd95-4586-944a-f39da46afecc	2026-05-09 16:00:00-07	2026-05-09 18:00:00-07	SCHEDULED	2026-02-20 00:20:08.932-08	f	f	f	58930173-d733-47d6-b452-51243c17cc93	\N	\N
5a30951e-5054-40c8-a591-89bbca60a7c4	2026-06-09 16:00:00-07	2026-06-09 18:00:00-07	SCHEDULED	2026-02-20 00:20:08.934-08	f	f	f	58930173-d733-47d6-b452-51243c17cc93	\N	\N
f941e46b-b801-4f24-8f0a-4545c49c1979	2026-02-09 17:00:00-08	2026-02-09 20:00:00-08	SCHEDULED	2026-02-20 00:20:08.92-08	f	f	f	58930173-d733-47d6-b452-51243c17cc93	\N	\N
ad617def-57e7-4f05-8145-35fac590e678	2026-03-06 05:00:00-08	2026-03-06 06:30:00-08	SCHEDULED	2026-02-20 00:18:18.114-08	f	f	f	8f73968b-6d7f-4be9-baf1-8dc763038aaf	\N	\N
692ff8f0-8b99-463d-8f05-1497b4f202b9	2026-02-23 16:00:00-08	2026-02-24 06:30:00-08	SCHEDULED	2026-02-20 00:18:18.107-08	f	f	f	8f73968b-6d7f-4be9-baf1-8dc763038aaf	\N	\N
93776477-aebe-40a0-8423-58d9243765f1	2026-02-18 15:00:00-08	2026-02-18 16:00:00-08	SCHEDULED	2026-02-20 07:05:34.025-08	f	f	f	6805abdd-3eca-4401-b72e-67ec3886668e	\N	\N
928883d5-ebc8-452a-9984-65f1cdb8a509	2026-02-19 15:00:00-08	2026-02-19 18:00:00-08	SCHEDULED	2026-02-20 07:11:53.817-08	f	f	f	379107a2-8cf8-4e1e-ae53-eb74adde9abd	\N	\N
d5b6e4eb-c6da-4110-b12a-e54f5c41a5cb	2026-02-16 15:00:00-08	2026-02-16 21:00:00-08	SCHEDULED	2026-02-20 07:13:05.396-08	f	f	f	ec4f63fa-0829-42ff-bedd-6e4a92baa15f	\N	\N
a8f747c7-83f5-4658-8fe4-93184d3a8ba4	2026-02-18 16:30:00-08	2026-02-18 18:30:00-08	SCHEDULED	2026-02-20 07:39:17.436-08	f	f	f	27934d05-68ce-408c-b8ab-d3965d6956d7	\N	\N
21272441-71c5-42b5-a3b7-bc8059e4b557	2026-02-20 18:00:00-08	2026-02-20 21:00:00-08	SCHEDULED	2026-02-20 07:43:06.276-08	f	f	f	042f8024-feb7-40b4-b4dd-c99b1729bca6	\N	\N
cd31303d-5d91-477d-b6f3-43163846f386	2026-02-17 19:30:00-08	2026-02-17 22:30:00-08	SCHEDULED	2026-02-20 07:45:18.213-08	f	f	f	9a2d65b3-9f6d-4994-a941-1b919d00d91f	\N	\N
\.


--
-- Data for Name: AppointmentImage; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."AppointmentImage" (id, "appointmentId", url, "fileKey") FROM stdin;
bf480107-c8f2-4a9b-9b99-cb433b5d2057	a8f747c7-83f5-4658-8fe4-93184d3a8ba4	https://utfs.io/f/WjmiRJuFC5OJ3w2PEREm1uUJ0CTKFNlMfdxABt2Qp7Ei4DbH	\N
f58e8ea0-57fb-44ec-b63a-e08ec2314035	a8f747c7-83f5-4658-8fe4-93184d3a8ba4	https://utfs.io/f/WjmiRJuFC5OJGjQloi6xVvltki1wCWS9N0prc6DEYRT4s5AX	\N
0f922979-ebe5-4c27-9595-fea2d346625e	21272441-71c5-42b5-a3b7-bc8059e4b557	https://utfs.io/f/WjmiRJuFC5OJJKnbfZDTYaoj5xveT6dNM07qpOBC2W84PbgI	\N
56ecc7b5-4ed2-4e36-ac7d-eceab5a9b777	21272441-71c5-42b5-a3b7-bc8059e4b557	https://utfs.io/f/WjmiRJuFC5OJEVuMD6PSikRbf0VP4L5ZUYHKn3IwmQlDBOc7	\N
760e215b-cf71-449d-9a2f-81a80157db27	21272441-71c5-42b5-a3b7-bc8059e4b557	https://utfs.io/f/WjmiRJuFC5OJy2j9tXa3frgeCJAMSO5UHZosklW679yz140i	\N
92c269ff-3686-4a93-8ad5-dcc437cbc467	21272441-71c5-42b5-a3b7-bc8059e4b557	https://utfs.io/f/WjmiRJuFC5OJKK0kAinKCGQguW2hoBM1iHEl9yJXSzfaTRwN	\N
6eae5f95-1ea3-4469-8ba2-fb8d258a757b	cd31303d-5d91-477d-b6f3-43163846f386	https://utfs.io/f/WjmiRJuFC5OJ7zkJzuqNsjY4qGFnvBrb5eT3J1hUa2tfZMdL	\N
8bc5261f-6fb7-4576-9edb-e9fd1dd7e2a0	cd31303d-5d91-477d-b6f3-43163846f386	https://utfs.io/f/WjmiRJuFC5OJlxW6TFFp9xEXJoLF82m7ZsnjyYWfIBeUHVt3	\N
e6ae716d-4320-4fae-ac07-5864af2f99a0	cd31303d-5d91-477d-b6f3-43163846f386	https://utfs.io/f/WjmiRJuFC5OJleHz1dp9xEXJoLF82m7ZsnjyYWfIBeUHVt3g	\N
6b85d9c9-22c3-4e36-b595-b7899ce41ee1	ed9c77a2-89cf-45b7-8285-3e5a45220a2e	https://utfs.io/f/WjmiRJuFC5OJYV6oGl8HuSiD75algQ0TILPwtCAcfXkeKOv1	WjmiRJuFC5OJYV6oGl8HuSiD75algQ0TILPwtCAcfXkeKOv1
9b868df4-80b4-427f-ab01-951b2ab000d3	ed9c77a2-89cf-45b7-8285-3e5a45220a2e	https://utfs.io/f/WjmiRJuFC5OJbsQq0Kc3MJz5xraXyYpD0juQ4cqwhTR9bLek	WjmiRJuFC5OJbsQq0Kc3MJz5xraXyYpD0juQ4cqwhTR9bLek
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Client" (id, title, "firstName", "lastName", "companyName", email, phone, "preferredContact", "leadSource", "createdAt", "updatedAt") FROM stdin;
5a4f94a2-31f0-4739-81a7-785b932ea856	No title	Test Fname	Test Lname	\N	test@gmail.com	7786682326	email		2026-02-17 00:44:52.131	2026-02-17 00:44:52.131
\.


--
-- Data for Name: ClientNote; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."ClientNote" (id, "clientId", content, "createdAt") FROM stdin;
\.


--
-- Data for Name: Job; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Job" (id, title, type, "clientId", "addressId", "createdAt", "updatedAt", "isAnytime", "visitInstructions") FROM stdin;
78e1e30e-cc63-4cf1-8bd2-4249c9c7fe68	New Appointment	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-19 06:04:47.814	2026-02-19 06:04:47.814	f	
8f73968b-6d7f-4be9-baf1-8dc763038aaf	Recur	RECURRING	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 00:18:18.091	2026-02-20 00:18:18.091	f	
58930173-d733-47d6-b452-51243c17cc93	recur monday	RECURRING	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 00:20:08.912	2026-02-20 00:20:08.912	f	
fd8a4b39-3be6-45c1-b745-b743174e12af	test img	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 04:35:51.685	2026-02-20 04:35:51.685	f	
6805abdd-3eca-4401-b72e-67ec3886668e	test img del	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	cf794d55-acf0-4dc2-bd45-5e0ea331e63a	2026-02-20 07:05:34.017	2026-02-20 07:05:34.017	f	
379107a2-8cf8-4e1e-ae53-eb74adde9abd	Img Test	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 07:11:53.808	2026-02-20 07:11:53.808	f	
ec4f63fa-0829-42ff-bedd-6e4a92baa15f	Img Test 2	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 07:13:05.386	2026-02-20 07:13:05.386	f	
27934d05-68ce-408c-b8ab-d3965d6956d7	img del	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	cf794d55-acf0-4dc2-bd45-5e0ea331e63a	2026-02-20 07:39:17.43	2026-02-20 07:39:17.43	f	
042f8024-feb7-40b4-b4dd-c99b1729bca6	endpoint img	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	cf794d55-acf0-4dc2-bd45-5e0ea331e63a	2026-02-20 07:43:06.269	2026-02-20 07:43:06.269	f	
9a2d65b3-9f6d-4994-a941-1b919d00d91f	img fkey	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	cf794d55-acf0-4dc2-bd45-5e0ea331e63a	2026-02-20 07:45:18.208	2026-02-20 07:45:18.208	f	
14c381f8-6fb1-4edf-8d2a-fedd996447ff	img recur	ONE_OFF	5a4f94a2-31f0-4739-81a7-785b932ea856	c1862bb0-395f-4bff-b050-c5f8c8f047ac	2026-02-20 07:52:01.314	2026-02-20 07:52:01.314	f	
\.


--
-- Data for Name: JobLineItem; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."JobLineItem" (id, "jobId", name, quantity, "unitCost", "unitPrice", total, description) FROM stdin;
954272e0-5c7e-49e5-a367-493bf1444fc4	78e1e30e-cc63-4cf1-8bd2-4249c9c7fe68	Test Line	1	0	0	\N	LIne Desc
e423db3e-f87f-41a4-9064-93e7b0b89af7	8f73968b-6d7f-4be9-baf1-8dc763038aaf	test	1	0	0	\N	feefe
a84c8e5b-d9e0-4b94-be97-c6082d3d9a4c	58930173-d733-47d6-b452-51243c17cc93	clean	1	0	0	\N	ff
41751422-d62d-4663-bfb1-fe675b1d9f95	58930173-d733-47d6-b452-51243c17cc93	wash	1	0	0	\N	fff
81a3ad88-7bcc-452e-9de8-541a071520a2	fd8a4b39-3be6-45c1-b745-b743174e12af	test v	1	0	0	\N	gfnhfhgfhg
9ceac5d3-c300-4b25-8d7a-f742e9743bf3	6805abdd-3eca-4401-b72e-67ec3886668e	test	1	0	0	\N	wefewf
a943aa26-90ff-436e-93b0-a2155084914f	379107a2-8cf8-4e1e-ae53-eb74adde9abd	Test 1	1	0	0	\N	test desc
312885cf-06d0-46e1-9ef2-aea26e364600	ec4f63fa-0829-42ff-bedd-6e4a92baa15f	test service	1	0	0	\N	desc
772393eb-d754-4554-821f-763e8d2eb127	27934d05-68ce-408c-b8ab-d3965d6956d7	wefwfew	1	0	0	\N	dssdcs
a39e8a41-45ce-43a8-85cd-09eba327c091	042f8024-feb7-40b4-b4dd-c99b1729bca6	eveveve	1	0	0	\N	
dcddf162-6ca7-4fa7-8038-90cb29302e02	9a2d65b3-9f6d-4994-a941-1b919d00d91f	dvvds	1	0	0	\N	sdvsvsvd
575fb96c-ab26-4e43-b9e1-d6e7068d9116	14c381f8-6fb1-4edf-8d2a-fedd996447ff	sddsvdsdv	1	0	0	\N	xvvcvx
\.


--
-- Data for Name: JobNote; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."JobNote" (id, "jobId", content, "createdAt") FROM stdin;
\.


--
-- Data for Name: JobNoteImage; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."JobNoteImage" (id, "noteId", url) FROM stdin;
\.


--
-- Data for Name: Recurrence; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Recurrence" (id, "jobId", frequency, "interval", "endsOn", "endType", "endsAfter") FROM stdin;
54dcefdb-be97-41ef-9a5c-9664210782b4	8f73968b-6d7f-4be9-baf1-8dc763038aaf	weekly	1	\N	after	4
75021bc9-fb9e-47ef-ad0a-22aa7c312e16	58930173-d733-47d6-b452-51243c17cc93	monthly	1	\N	after	5
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."User" (id, name, email, role, "createdAt", password) FROM stdin;
cbf11646-b327-4e23-ad8f-00d8447019a1	admin	admin@ecoclean.com	ADMIN	2026-02-15 07:48:17.26	$2b$10$fL9KzwwcZtRFA1UE7n51JO.YVjEVQ/ewUnFZ62qAMkMxMDp0WFHk2
e11465ad-795b-4692-b8ee-ecb7b6cfa1f2	Staff 1	staff1@ecoclean.com	STAFF	2026-02-17 00:45:43.693	$2b$10$VLWHtFrbJDmG8fjrePSEgOVGirBBoT8MkqiGvJwArCvpbzI3NE7BC
\.


--
-- Data for Name: VisitNote; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."VisitNote" (id, content, "isClientVisible", "appointmentId", "createdAt") FROM stdin;
6a3bb625-30fd-4842-8b83-d11dda6105ec	dddfdd	f	04f0c99b-a87c-465a-a80d-8c6ff8531862	2026-02-20 00:18:18.118
d1b2b122-c836-4bf2-85ed-adf677586473	dddfdd	f	4b7f46c8-3d50-4c06-9368-d509e6d79e12	2026-02-20 00:18:18.12
2f51ff8e-73b0-4b8c-9c11-923718ff7393	fdvvefv	f	4533d131-bd05-460b-ad3f-347fbd45e02b	2026-02-20 00:20:08.926
c17cd577-5eab-4d8f-8f07-b5fbfeaee947	fdvvefv	f	311624ae-2b37-4fcb-bad0-41655b0df91b	2026-02-20 00:20:08.929
387bd3d3-f052-4f8c-b423-765a95eba912	fdvvefv	f	636c0fed-bd95-4586-944a-f39da46afecc	2026-02-20 00:20:08.932
5b8c8933-b960-43a7-bc1d-494c86acee1f	fdvvefv	f	5a30951e-5054-40c8-a591-89bbca60a7c4	2026-02-20 00:20:08.934
17a3e897-ca69-4258-abcd-7b405653100b	fdvvefv	f	f941e46b-b801-4f24-8f0a-4545c49c1979	2026-02-20 00:20:08.92
e3c44b64-8c7d-4915-ac58-a11dbe00c246	dddfdd	f	ad617def-57e7-4f05-8145-35fac590e678	2026-02-20 00:18:18.114
833ce446-78e8-40b4-a084-26aadeea3eda	dddfdd	f	692ff8f0-8b99-463d-8f05-1497b4f202b9	2026-02-20 00:18:18.107
dace0690-c0bf-40ab-b271-e62ce3b60b26	gdsdfdfs	f	5f7f69a1-1a7e-43c1-bec8-4028330d246c	2026-02-20 04:35:51.698
6df1c1d3-c4d6-4240-bd01-51fe46bd587c	test	f	93776477-aebe-40a0-8423-58d9243765f1	2026-02-20 07:05:34.025
99ff3e32-cd8d-470d-82af-1d33e168030a	img staff	f	928883d5-ebc8-452a-9984-65f1cdb8a509	2026-02-20 07:11:53.817
81f6bc0f-1c0a-4117-99bd-ec971fa84f05	notes	f	d5b6e4eb-c6da-4110-b12a-e54f5c41a5cb	2026-02-20 07:13:05.396
68465ac7-244d-45df-a4b2-14d176da9fa7	cscsdcd	f	a8f747c7-83f5-4658-8fe4-93184d3a8ba4	2026-02-20 07:39:17.436
78510afd-4731-47b4-a66c-4385ffbdb139	eveve	f	21272441-71c5-42b5-a3b7-bc8059e4b557	2026-02-20 07:43:06.276
260e5cfd-67da-43d9-b3a9-14972beaa5ae	dvsdvsdv	f	cd31303d-5d91-477d-b6f3-43163846f386	2026-02-20 07:45:18.213
08339509-8233-453e-9f89-1462e0ed58fc	sdvdvdsvds	f	ed9c77a2-89cf-45b7-8285-3e5a45220a2e	2026-02-20 07:52:01.321
\.


--
-- Data for Name: _AppointmentStaff; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."_AppointmentStaff" ("A", "B") FROM stdin;
0fac0606-71d1-4fa2-9918-94709b1fdc01	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
04f0c99b-a87c-465a-a80d-8c6ff8531862	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
4b7f46c8-3d50-4c06-9368-d509e6d79e12	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
4533d131-bd05-460b-ad3f-347fbd45e02b	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
311624ae-2b37-4fcb-bad0-41655b0df91b	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
636c0fed-bd95-4586-944a-f39da46afecc	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
5a30951e-5054-40c8-a591-89bbca60a7c4	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
f941e46b-b801-4f24-8f0a-4545c49c1979	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
ad617def-57e7-4f05-8145-35fac590e678	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
692ff8f0-8b99-463d-8f05-1497b4f202b9	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
5f7f69a1-1a7e-43c1-bec8-4028330d246c	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
93776477-aebe-40a0-8423-58d9243765f1	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
928883d5-ebc8-452a-9984-65f1cdb8a509	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
d5b6e4eb-c6da-4110-b12a-e54f5c41a5cb	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
a8f747c7-83f5-4658-8fe4-93184d3a8ba4	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
21272441-71c5-42b5-a3b7-bc8059e4b557	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
cd31303d-5d91-477d-b6f3-43163846f386	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
ed9c77a2-89cf-45b7-8285-3e5a45220a2e	e11465ad-795b-4692-b8ee-ecb7b6cfa1f2
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
6fe245ab-9502-499a-8597-e07e4924ecff	91ec6c76660f2408391463737a55052a1b8e68c3ce87fc69f80731130ee6fad6	2026-02-14 23:45:53.995781-08	20260211013731_db_clients_mod	\N	\N	2026-02-14 23:45:53.97897-08	1
a6e2d049-228c-4c61-83f1-138a42573ad9	72f19f22fe63aebd58f66b099c58b4d9b3588ec3a693bbd7e8d8af25e465b969	2026-02-14 23:45:54.009608-08	20260212212653_job_system	\N	\N	2026-02-14 23:45:53.996235-08	1
37a47e73-219e-4cf5-b46f-548a95f45779	fa182b487417a71ed4ed4e0d08bce00958b7a1cee49a6b151a9110a8ae99a37e	2026-02-14 23:46:11.285613-08	20260215074611_update_job_structure	\N	\N	2026-02-14 23:46:11.278585-08	1
dcf1f7fc-3f74-4a2b-ada0-e93224264b74	370a0db08d82370bdbbfaa04fd395ae616dda8a483ca7df36ca3d73136782b74	2026-02-16 16:59:41.738872-08	20260217005941_job_datetime_alter	\N	\N	2026-02-16 16:59:41.734941-08	1
a5cb37d5-9e95-4761-975e-270e953b3238	95d6b2225ef4de0062b6f2e2ab0324b14285cc42aea0cb7fc2d0ed4b041e7490	2026-02-16 17:04:16.300345-08	20260217010416_scheduling_cleanup	\N	\N	2026-02-16 17:04:16.29339-08	1
002cd887-83d8-4505-be22-444f29476a56	82ba8d391ee4c5c2b75cd23f24895c66efe70dc73793d22e6b4cfa2ccb39cd72	2026-02-18 20:11:29.25811-08	20260219041129_move_staff_and_timespent	\N	\N	2026-02-18 20:11:29.256008-08	1
b6f20cc2-4b57-489d-909d-a536221a3e49	65b55eda5d04d7baf730e4bee8bb2508329f7af560c8f1a36f2c7507f288aa11	2026-02-18 20:31:20.103151-08	20260219043120_move_staff_and_timespent_advanced	\N	\N	2026-02-18 20:31:20.085027-08	1
75941df5-926b-4e50-9b00-b2756077f482	a7d8a4f54dd1dee845d4dd0eb96cc8046dfe7d295a86313a3d50fb1a54af61be	2026-02-18 21:27:29.316572-08	20260219052729_update_appointment_staff	\N	\N	2026-02-18 21:27:29.312933-08	1
8d97a1c7-4661-4b7f-9f43-ad65ddec4e46	0ff7327b35f4fdbc4a078b2ad43d7dea6031d4d93f41d18b052e475228522795	2026-02-19 22:29:42.147196-08	20260220062942_add_file_key_to_appointment_image	\N	\N	2026-02-19 22:29:42.146155-08	1
\.


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: AppointmentImage AppointmentImage_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."AppointmentImage"
    ADD CONSTRAINT "AppointmentImage_pkey" PRIMARY KEY (id);


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: ClientNote ClientNote_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."ClientNote"
    ADD CONSTRAINT "ClientNote_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: JobLineItem JobLineItem_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobLineItem"
    ADD CONSTRAINT "JobLineItem_pkey" PRIMARY KEY (id);


--
-- Name: JobNoteImage JobNoteImage_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNoteImage"
    ADD CONSTRAINT "JobNoteImage_pkey" PRIMARY KEY (id);


--
-- Name: JobNote JobNote_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNote"
    ADD CONSTRAINT "JobNote_pkey" PRIMARY KEY (id);


--
-- Name: Job Job_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_pkey" PRIMARY KEY (id);


--
-- Name: Recurrence Recurrence_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Recurrence"
    ADD CONSTRAINT "Recurrence_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VisitNote VisitNote_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."VisitNote"
    ADD CONSTRAINT "VisitNote_pkey" PRIMARY KEY (id);


--
-- Name: _AppointmentStaff _AppointmentStaff_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."_AppointmentStaff"
    ADD CONSTRAINT "_AppointmentStaff_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Appointment_endTime_idx; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE INDEX "Appointment_endTime_idx" ON public."Appointment" USING btree ("endTime");


--
-- Name: Appointment_startTime_idx; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE INDEX "Appointment_startTime_idx" ON public."Appointment" USING btree ("startTime");


--
-- Name: Recurrence_jobId_key; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE UNIQUE INDEX "Recurrence_jobId_key" ON public."Recurrence" USING btree ("jobId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: _AppointmentStaff_B_index; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE INDEX "_AppointmentStaff_B_index" ON public."_AppointmentStaff" USING btree ("B");


--
-- Name: Address Address_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AppointmentImage AppointmentImage_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."AppointmentImage"
    ADD CONSTRAINT "AppointmentImage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Appointment Appointment_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientNote ClientNote_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."ClientNote"
    ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobLineItem JobLineItem_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobLineItem"
    ADD CONSTRAINT "JobLineItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobNoteImage JobNoteImage_noteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNoteImage"
    ADD CONSTRAINT "JobNoteImage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public."JobNote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobNote JobNote_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNote"
    ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Job Job_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public."Address"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Job Job_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Recurrence Recurrence_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Recurrence"
    ADD CONSTRAINT "Recurrence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VisitNote VisitNote_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."VisitNote"
    ADD CONSTRAINT "VisitNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _AppointmentStaff _AppointmentStaff_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."_AppointmentStaff"
    ADD CONSTRAINT "_AppointmentStaff_A_fkey" FOREIGN KEY ("A") REFERENCES public."Appointment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _AppointmentStaff _AppointmentStaff_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."_AppointmentStaff"
    ADD CONSTRAINT "_AppointmentStaff_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1VTPcufyqXioZ9JTHLfPJ675eXgTloJxyiEWSfCAh9CdhgT9UkQ5IiE1Iv9yDrT


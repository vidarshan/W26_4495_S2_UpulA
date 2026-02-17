--
-- PostgreSQL database dump
--

\restrict WxwAdqSiyTNcXKxze96e3ndcZ2D8MyhYjtWer7N1grqUP9cl6VSo55EPGcn8VLL

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
    "jobId" text NOT NULL
);


ALTER TABLE public."Appointment" OWNER TO vidarshanrathnayake;

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
    "staffId" text,
    "addressId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    total double precision
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
b5ea20e0-643b-4c11-a77e-bd59a6a5ca08	65234cc2-c3a1-4d10-99ba-71b5b45e664b	2017 Seventh Ave		NW	BC	V3M 2L5	Canada	t	f	2026-02-13 01:49:59.961
\.


--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Appointment" (id, "startTime", "endTime", status, "createdAt", "completionSent", "reminder1dSent", "reminder5dSent", "jobId") FROM stdin;
80fa409f-8284-4fcc-a460-8cda7e353ece	2026-02-03 12:04:00-08	2026-02-04 02:06:00-08	SCHEDULED	2026-02-13 05:48:16.35-08	f	f	f	2837c2c1-e70e-491f-babd-4a2b782e9d2c
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Client" (id, title, "firstName", "lastName", "companyName", email, phone, "preferredContact", "leadSource", "createdAt", "updatedAt") FROM stdin;
129ab1f5-89f2-44c3-8cc9-0b012e1f76f1	Mr	John	Doe	Doe Cleaning Ltd	john.doe@example.com	+1-604-123-4567	email	Website	2026-02-12 16:46:18.14	2026-02-12 16:46:18.14
a6c018f9-e1df-4835-af5b-6d36a084ff75	Ms	Sarah	Lee	Lee Property Services	sarah.lee@example.com	+1-604-987-6543	phone	Referral	2026-02-12 16:46:18.14	2026-02-12 16:46:18.14
9b538a25-bdf8-43dc-a346-1d8d91ba2708	Mr	John	Doe	Doe Cleaning Ltd	john.doe@example.com	+1-604-123-4567	email	Website	2026-02-12 16:47:59.951	2026-02-12 16:47:59.951
613e1e4b-ce5a-435e-96a1-5e16c5077109	Ms	Sarah	Lee	Lee Property Services	sarah.lee@example.com	+1-604-987-6543	phone	Referral	2026-02-12 16:47:59.951	2026-02-12 16:47:59.951
3765729c-37f4-412d-8365-81d238ec19ee	Mr	David	Nguyen	Pacific Holdings	david.nguyen@example.com	+1-778-555-1122	email	Google Ads	2026-02-12 16:47:59.951	2026-02-12 16:47:59.951
0adf0bef-176b-436c-b1c5-65c155863e11	Mrs	Emma	Wilson	Wilson Rentals	emma.wilson@example.com	+1-604-333-7788	phone	Referral	2026-02-12 16:47:59.951	2026-02-12 16:47:59.951
3f3e6036-8059-450e-913a-93f08a98f4b0	Mr	Carlos	Martinez	Martinez Property Group	carlos.martinez@example.com	+1-236-888-4422	email	Facebook	2026-02-12 16:47:59.951	2026-02-12 16:47:59.951
65234cc2-c3a1-4d10-99ba-71b5b45e664b	Mr.	Test Client	With Address	\N	test@gmail.com	8920100111	email	-	2026-02-13 01:49:59.954	2026-02-13 01:49:59.954
\.


--
-- Data for Name: ClientNote; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."ClientNote" (id, "clientId", content, "createdAt") FROM stdin;
\.


--
-- Data for Name: Job; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."Job" (id, title, type, "clientId", "staffId", "addressId", "createdAt", "updatedAt") FROM stdin;
2837c2c1-e70e-491f-babd-4a2b782e9d2c	test	ONE_OFF	65234cc2-c3a1-4d10-99ba-71b5b45e664b	c8b1a6af-24bc-4df0-bd8a-f6302e87a22c	b5ea20e0-643b-4c11-a77e-bd59a6a5ca08	2026-02-13 05:48:16.343	2026-02-13 05:48:16.343
\.


--
-- Data for Name: JobLineItem; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."JobLineItem" (id, "jobId", name, quantity, "unitCost", "unitPrice", total) FROM stdin;
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

COPY public."Recurrence" (id, "jobId", frequency, "interval", "endsOn", "endsAfter") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."User" (id, name, email, role, "createdAt", password) FROM stdin;
c8b1a6af-24bc-4df0-bd8a-f6302e87a22c	Michael Brown	michael.brown@ecoclean.ca	STAFF	2026-02-12 16:48:54.142	devpassword123
c2424123-67af-4fca-9deb-f3b5304ae2df	Jessica Taylor	jessica.taylor@ecoclean.ca	STAFF	2026-02-12 16:48:54.142	devpassword123
2af3bdfd-8f55-4219-98be-ab031cece7be	Daniel Kim	daniel.kim@ecoclean.ca	STAFF	2026-02-12 16:48:54.142	devpassword123
cd64fcb0-e367-4ab2-8193-fa628f533684	Olivia Patel	olivia.patel@ecoclean.ca	STAFF	2026-02-12 16:48:54.142	devpassword123
88a42748-c088-44d0-a5ac-2fa60dd9ae99	Ryan Thompson	ryan.thompson@ecoclean.ca	STAFF	2026-02-12 16:48:54.142	devpassword123
bc7f97c0-9498-4bfb-a1a6-a8529513567c	staff	staff@ecoclean.com	STAFF	2026-02-13 01:04:06.825	$2b$10$fCmCX5wTaR.9OXTtcKSX.OQ9EFirlp3NekYimvP8r91zY0VIB7PXS
66fe890c-9beb-4416-98bf-42c956aeedd4	admin	admin@ecoclean.com	ADMIN	2026-02-13 01:05:28.759	$2b$10$Xpm.XdalwnncvVzDMTMi2OCN23Ao.iqZQSP5FMziC0OAFCsbdkwnO
\.


--
-- Data for Name: VisitNote; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public."VisitNote" (id, content, "isClientVisible", "appointmentId", "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: vidarshanrathnayake
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
5d4c089f-47c7-4a75-9a56-53450c9995e6	91ec6c76660f2408391463737a55052a1b8e68c3ce87fc69f80731130ee6fad6	2026-02-12 13:27:05.436673-08	20260211013731_db_clients_mod	\N	\N	2026-02-12 13:27:05.419085-08	1
c9a02231-7cfd-45a6-ab35-2934d06f647f	72f19f22fe63aebd58f66b099c58b4d9b3588ec3a693bbd7e8d8af25e465b969	2026-02-12 13:27:05.451724-08	20260212212653_job_system	\N	\N	2026-02-12 13:27:05.437229-08	1
\.


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


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
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Recurrence_jobId_key; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE UNIQUE INDEX "Recurrence_jobId_key" ON public."Recurrence" USING btree ("jobId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: vidarshanrathnayake
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Address Address_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Appointment Appointment_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClientNote ClientNote_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."ClientNote"
    ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: JobLineItem JobLineItem_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobLineItem"
    ADD CONSTRAINT "JobLineItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JobNoteImage JobNoteImage_noteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNoteImage"
    ADD CONSTRAINT "JobNoteImage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public."JobNote"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JobNote JobNote_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."JobNote"
    ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
-- Name: Job Job_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Recurrence Recurrence_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."Recurrence"
    ADD CONSTRAINT "Recurrence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: VisitNote VisitNote_appointmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: vidarshanrathnayake
--

ALTER TABLE ONLY public."VisitNote"
    ADD CONSTRAINT "VisitNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict WxwAdqSiyTNcXKxze96e3ndcZ2D8MyhYjtWer7N1grqUP9cl6VSo55EPGcn8VLL


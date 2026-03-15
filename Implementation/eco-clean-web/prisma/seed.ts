import "dotenv/config";
import {
  PrismaClient,
  Prisma,
  Role,
  JobType,
  AppointmentStatus,
  JobNoteCategory,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type SeedMode = "small" | "medium" | "large";

const mode = (process.argv[2] as SeedMode) || "large";
const DEFAULT_PASSWORD = "Password123!";
const SEED_TEST_EMAIL = process.env.SEED_TEST_EMAIL?.toLowerCase().trim();

const CONFIG: Record<
  SeedMode,
  {
    adminCount: number;
    staffCount: number;
    clientUserCount: number;
    clientCount: number;
    jobsPerClientMin: number;
    jobsPerClientMax: number;
    appointmentsPerJobMin: number;
    appointmentsPerJobMax: number;
  }
> = {
  small: {
    adminCount: 1,
    staffCount: 4,
    clientUserCount: 10,
    clientCount: 30,
    jobsPerClientMin: 1,
    jobsPerClientMax: 2,
    appointmentsPerJobMin: 2,
    appointmentsPerJobMax: 4,
  },
  medium: {
    adminCount: 1,
    staffCount: 8,
    clientUserCount: 25,
    clientCount: 120,
    jobsPerClientMin: 1,
    jobsPerClientMax: 3,
    appointmentsPerJobMin: 3,
    appointmentsPerJobMax: 6,
  },
  large: {
    adminCount: 1,
    staffCount: 14,
    clientUserCount: 50,
    clientCount: 320,
    jobsPerClientMin: 2,
    jobsPerClientMax: 4,
    appointmentsPerJobMin: 4,
    appointmentsPerJobMax: 8,
  },
};

const cfg = CONFIG[mode];

function randInt(min: number, max: number) {
  return faker.number.int({ min, max });
}

function pick<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr);
}

function maybe(probability = 0.5) {
  return Math.random() < probability;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function randomDateBetween(from: Date, to: Date) {
  return faker.date.between({ from, to });
}

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

function uniqueSeedEmail(prefix: string, i: number) {
  return `${prefix}${i + 1}@ecoclean.local`;
}

function fakePhone() {
  const area = faker.helpers.arrayElement(["604", "778", "236", "672"]);
  const part1 = faker.number.int({ min: 100, max: 999 });
  const part2 = faker.number.int({ min: 1000, max: 9999 });

  return `(${area}) ${part1}-${part2}`;
}

function fakePostalCode() {
  return faker.location.zipCode("A#A #A#").toUpperCase();
}

function fakePreferredContact() {
  return pick(["EMAIL", "PHONE", "TEXT"]);
}

function fakeLeadSource() {
  return pick([
    "Google",
    "Referral",
    "Instagram",
    "Facebook",
    "Walk-in",
    "Returning Customer",
    "Website",
    "Flyer",
  ]);
}

function fakeJobTitle(type: JobType) {
  const recurring = [
    "Weekly Home Cleaning",
    "Biweekly Maintenance Cleaning",
    "Recurring Condo Cleaning",
    "Office Maintenance Service",
    "Routine Deep Refresh",
  ];

  const oneOff = [
    "Move-Out Cleaning",
    "Move-In Cleaning",
    "Deep Cleaning",
    "Post-Renovation Cleaning",
    "Kitchen & Bath Intensive",
    "One-Time Office Cleaning",
  ];

  return type === JobType.RECURRING ? pick(recurring) : pick(oneOff);
}

function fakeVisitInstructions() {
  return pick([
    "Use side entrance and ring the bell once.",
    "Customer prefers eco-friendly unscented products only.",
    "Please focus on kitchen counters and bathrooms.",
    "Parking available in visitor parking stall 12.",
    "Call 10 minutes before arrival.",
    "Be aware of a friendly dog inside.",
    "Please avoid using bleach on marble surfaces.",
    "Do not start before the scheduled time.",
  ]);
}

function fakeJobNoteTitle() {
  return pick([
    "Access details",
    "Client preference",
    "Supplies needed",
    "Safety note",
    "Cleaning focus",
    "General reminder",
  ]);
}

function fakeJobNoteCategory(): JobNoteCategory {
  return pick([
    JobNoteCategory.GENERAL,
    JobNoteCategory.ACCESS,
    JobNoteCategory.CLEANING,
    JobNoteCategory.SAFETY,
    JobNoteCategory.SUPPLIES,
    JobNoteCategory.CLIENT_PREFERENCE,
  ]);
}

function fakeLineItemName() {
  return pick([
    "Base cleaning service",
    "Bathroom cleaning",
    "Kitchen deep clean",
    "Floor vacuum & mop",
    "Inside oven cleaning",
    "Inside fridge cleaning",
    "Window interior cleaning",
    "Post-renovation cleanup",
    "Office workspace cleaning",
    "Supplies surcharge",
  ]);
}

function fakeImageUrl(seed: string) {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

/**
 * Status logic for realism:
 * - Future: mostly SCHEDULED, some CANCELLED
 * - Past: mostly COMPLETED, some CANCELLED, some LATE, small number SCHEDULED
 */
function deriveAppointmentStatus(startTime: Date): AppointmentStatus {
  const now = new Date();

  if (startTime > now) {
    return Math.random() < 0.9
      ? AppointmentStatus.SCHEDULED
      : AppointmentStatus.CANCELLED;
  }

  const r = Math.random();
  if (r < 0.72) return AppointmentStatus.COMPLETED;
  if (r < 0.84) return AppointmentStatus.CANCELLED;
  if (r < 0.94) return AppointmentStatus.LATE;
  return AppointmentStatus.SCHEDULED;
}

function shouldCreateWorkSession(status: AppointmentStatus) {
  return (
    status === AppointmentStatus.COMPLETED || status === AppointmentStatus.LATE
  );
}

function computeReminderFlags(startTime: Date, status: AppointmentStatus) {
  const now = new Date();

  if (startTime > now) {
    const daysUntil =
      (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    return {
      reminder5dSent: daysUntil < 5 ? maybe(0.25) : false,
      reminder1dSent: daysUntil < 1 ? maybe(0.25) : false,
      completionSent: false,
    };
  }

  return {
    reminder5dSent: maybe(0.85),
    reminder1dSent: maybe(0.9),
    completionSent: status === AppointmentStatus.COMPLETED ? maybe(0.8) : false,
  };
}

async function resetDatabase() {
  await prisma.appointmentWorkSession.deleteMany();
  await prisma.appointmentImage.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.jobNoteImage.deleteMany();
  await prisma.jobNote.deleteMany();
  await prisma.jobLineItem.deleteMany();
  await prisma.recurrence.deleteMany();
  await prisma.job.deleteMany();
  await prisma.clientNote.deleteMany();
  await prisma.address.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  const users: Prisma.UserCreateManyInput[] = [];
  const PASSWORD = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (let i = 0; i < cfg.adminCount; i++) {
    users.push({
      name: `Admin ${i + 1}`,
      email: uniqueSeedEmail("admin", i),
      role: Role.ADMIN,
      password: PASSWORD,
    });
  }

  for (let i = 0; i < cfg.staffCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      name: fullName(firstName, lastName),
      email: uniqueSeedEmail("staff", i),
      role: Role.STAFF,
      password: PASSWORD,
    });
  }

  for (let i = 0; i < cfg.clientUserCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      name: fullName(firstName, lastName),
      email: uniqueSeedEmail("client", i),
      role: Role.CLIENT,
      password: PASSWORD,
    });
  }

  await prisma.user.createMany({ data: users });

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return {
    admins: allUsers.filter((u) => u.role === Role.ADMIN),
    staff: allUsers.filter((u) => u.role === Role.STAFF),
    clientUsers: allUsers.filter((u) => u.role === Role.CLIENT),
  };
}

async function createClients() {
  const createdClients: { id: string; email: string }[] = [];

  for (let i = 0; i < cfg.clientCount; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const hasCompany = maybe(0.3);

    const clientEmail =
      SEED_TEST_EMAIL && i < 3
        ? SEED_TEST_EMAIL
        : faker.internet.email({ firstName, lastName }).toLowerCase();

    const client = await prisma.client.create({
      data: {
        title: maybe(0.35) ? pick(["Mr.", "Ms.", "Mrs.", "Dr."]) : null,
        firstName,
        lastName,
        companyName: hasCompany ? faker.company.name() : null,
        email: clientEmail,
        phone: fakePhone(),
        preferredContact: fakePreferredContact(),
        leadSource: maybe(0.75) ? fakeLeadSource() : null,
        notes: {
          create: Array.from({ length: randInt(0, 3) }).map(() => ({
            content: faker.lorem.sentences({ min: 1, max: 3 }),
          })),
        },
        addresses: {
          create: [
            {
              street1: faker.location.streetAddress(),
              street2: maybe(0.25) ? faker.location.secondaryAddress() : null,
              city: pick([
                "Vancouver",
                "Burnaby",
                "Surrey",
                "Richmond",
                "Coquitlam",
                "New Westminster",
              ]),
              province: "BC",
              postalCode: fakePostalCode(),
              country: "Canada",
              isPrimary: true,
              isBilling: true,
            },
            ...(maybe(0.22)
              ? [
                  {
                    street1: faker.location.streetAddress(),
                    street2: maybe(0.2)
                      ? faker.location.secondaryAddress()
                      : null,
                    city: pick([
                      "Vancouver",
                      "Burnaby",
                      "Surrey",
                      "Richmond",
                      "Coquitlam",
                      "New Westminster",
                    ]),
                    province: "BC",
                    postalCode: fakePostalCode(),
                    country: "Canada",
                    isPrimary: false,
                    isBilling: false,
                  },
                ]
              : []),
          ],
        },
      },
      select: { id: true, email: true },
    });

    createdClients.push(client);
  }

  return createdClients;
}

async function createJobsForClients(
  clients: { id: string; email: string }[],
  staff: { id: string }[],
) {
  let jobsCreated = 0;
  let appointmentsCreated = 0;
  let visitNotesCreated = 0;
  let appointmentImagesCreated = 0;
  let workSessionsCreated = 0;
  let jobNotesCreated = 0;
  let jobNoteImagesCreated = 0;
  let recurrencesCreated = 0;
  let lineItemsCreated = 0;

  const now = new Date();
  const eightMonthsAgo = addDays(now, -240);
  const fourMonthsAhead = addDays(now, 120);

  for (const client of clients) {
    const addresses = await prisma.address.findMany({
      where: { clientId: client.id },
      select: { id: true },
    });

    const jobsCount = randInt(cfg.jobsPerClientMin, cfg.jobsPerClientMax);

    for (let j = 0; j < jobsCount; j++) {
      const jobType = maybe(0.45) ? JobType.RECURRING : JobType.ONE_OFF;

      const job = await prisma.job.create({
        data: {
          title: fakeJobTitle(jobType),
          type: jobType,
          clientId: client.id,
          addressId: pick(addresses).id,
          isAnytime: maybe(0.18),
          visitInstructions: maybe(0.7) ? fakeVisitInstructions() : null,
        },
        select: { id: true, type: true },
      });

      jobsCreated++;

      const lineItems = Array.from({ length: randInt(1, 5) }).map(() => {
        const quantity = randInt(1, 3);
        const unitPrice = Number(
          faker.finance.amount({ min: 35, max: 180, dec: 2 }),
        );
        const unitCost = Number(
          (
            unitPrice *
            faker.number.float({ min: 0.35, max: 0.7, fractionDigits: 2 })
          ).toFixed(2),
        );
        const total = Number((quantity * unitPrice).toFixed(2));

        return {
          jobId: job.id,
          name: fakeLineItemName(),
          quantity,
          unitCost,
          unitPrice,
          total,
          description: maybe(0.4) ? faker.lorem.sentence() : null,
        };
      });

      await prisma.jobLineItem.createMany({ data: lineItems });
      lineItemsCreated += lineItems.length;

      const createdByCandidates = staff.map((s) => s.id);

      const jobNotes = Array.from({ length: randInt(0, 4) }).map(() => ({
        jobId: job.id,
        title: maybe(0.75) ? fakeJobNoteTitle() : null,
        content: maybe(0.9) ? faker.lorem.sentences({ min: 1, max: 4 }) : null,
        category: maybe(0.85) ? fakeJobNoteCategory() : null,
        isClientVisible: maybe(0.28),
        isPinned: maybe(0.12),
        createdAt: faker.date.recent({ days: 160 }),
        createdById: maybe(0.82) ? pick(createdByCandidates) : null,
      }));

      for (const note of jobNotes) {
        const created = await prisma.jobNote.create({ data: note });
        jobNotesCreated++;

        const images = Array.from({ length: randInt(0, 3) }).map((_, idx) => ({
          noteId: created.id,
          url: fakeImageUrl(`job-note-${created.id}-${idx}`),
          fileKey: maybe(0.5) ? `job-notes/${created.id}/${idx}.jpg` : null,
        }));

        if (images.length) {
          await prisma.jobNoteImage.createMany({ data: images });
          jobNoteImagesCreated += images.length;
        }
      }

      if (job.type === JobType.RECURRING && maybe(0.9)) {
        await prisma.recurrence.create({
          data: {
            jobId: job.id,
            frequency: pick(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
            interval: pick([1, 1, 2, 4]),
            endType: pick(["NEVER", "ON_DATE", "AFTER_OCCURRENCES"]),
            endsOn: maybe(0.35) ? addDays(now, randInt(30, 240)) : null,
            endsAfter: maybe(0.25) ? randInt(8, 30) : null,
          },
        });
        recurrencesCreated++;
      }

      const appointmentsCount = randInt(
        cfg.appointmentsPerJobMin,
        cfg.appointmentsPerJobMax,
      );

      for (let a = 0; a < appointmentsCount; a++) {
        const startTime = randomDateBetween(eightMonthsAgo, fourMonthsAhead);
        const durationHours = pick([2, 2, 3, 3, 4, 5]);
        const endTime = addHours(startTime, durationHours);
        const status = deriveAppointmentStatus(startTime);

        const reminderFlags = computeReminderFlags(startTime, status);

        const assignedStaff = faker.helpers.arrayElements(
          staff.map((s) => s.id),
          { min: 1, max: Math.min(3, staff.length) },
        );

        const completedAt =
          status === AppointmentStatus.COMPLETED
            ? addMinutes(endTime, randInt(5, 75))
            : null;

        const timeSpent =
          status === AppointmentStatus.COMPLETED ||
          status === AppointmentStatus.LATE
            ? randInt(durationHours * 50, durationHours * 75)
            : null;

        const appointment = await prisma.appointment.create({
          data: {
            startTime,
            endTime,
            status,
            jobId: job.id,
            timeSpent,
            completedAt,
            completionSent: reminderFlags.completionSent,
            reminder1dSent: reminderFlags.reminder1dSent,
            reminder5dSent: reminderFlags.reminder5dSent,
            staff: {
              connect: assignedStaff.map((id) => ({ id })),
            },
          },
          include: {
            staff: { select: { id: true } },
          },
        });

        appointmentsCreated++;

        const visitNotes = Array.from({ length: randInt(0, 3) }).map(() => ({
          appointmentId: appointment.id,
          content: faker.lorem.sentences({ min: 1, max: 3 }),
          isClientVisible: maybe(0.35),
          createdAt: faker.date.between({
            from: addDays(startTime, -2),
            to: addDays(startTime, 2),
          }),
          createdById:
            maybe(0.85) && appointment.staff.length
              ? pick(appointment.staff).id
              : maybe(0.4)
                ? pick(createdByCandidates)
                : null,
        }));

        if (visitNotes.length) {
          await prisma.visitNote.createMany({ data: visitNotes });
          visitNotesCreated += visitNotes.length;
        }

        const appointmentImages = Array.from({ length: randInt(0, 4) }).map(
          (_, idx) => ({
            appointmentId: appointment.id,
            url: fakeImageUrl(`appointment-${appointment.id}-${idx}`),
            fileKey: maybe(0.55)
              ? `appointments/${appointment.id}/${idx}.jpg`
              : null,
          }),
        );

        if (appointmentImages.length) {
          await prisma.appointmentImage.createMany({ data: appointmentImages });
          appointmentImagesCreated += appointmentImages.length;
        }

        if (shouldCreateWorkSession(status) && appointment.staff.length) {
          const sessions = appointment.staff.map((member) => {
            const startedAt = addMinutes(startTime, randInt(-10, 25));
            const endedAt =
              status === AppointmentStatus.COMPLETED
                ? addMinutes(endTime, randInt(-15, 40))
                : maybe(0.5)
                  ? null
                  : addMinutes(endTime, randInt(-30, 20));

            return {
              appointmentId: appointment.id,
              staffId: member.id,
              startedAt,
              endedAt,
            };
          });

          await prisma.appointmentWorkSession.createMany({ data: sessions });
          workSessionsCreated += sessions.length;
        }
      }
    }
  }

  return {
    jobsCreated,
    appointmentsCreated,
    visitNotesCreated,
    appointmentImagesCreated,
    workSessionsCreated,
    jobNotesCreated,
    jobNoteImagesCreated,
    recurrencesCreated,
    lineItemsCreated,
  };
}

async function createGuaranteedReminderTestAppointments(
  staff: { id: string }[],
) {
  if (!SEED_TEST_EMAIL) {
    console.log(
      "ℹ️ SEED_TEST_EMAIL not set. Skipping guaranteed reminder test appointments.",
    );
    return 0;
  }

  const clients = await prisma.client.findMany({
    where: { email: SEED_TEST_EMAIL },
    take: 3,
    include: {
      addresses: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  let created = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const address = client.addresses[0];
    if (!address) continue;

    const job = await prisma.job.create({
      data: {
        title: `Reminder Test Job ${i + 1}`,
        type: JobType.ONE_OFF,
        clientId: client.id,
        addressId: address.id,
        isAnytime: false,
        visitInstructions:
          "Guaranteed seed appointment for 5-day reminder testing.",
      },
    });

    const startTime = addHours(addDays(new Date(), 5), 9 + i);
    const endTime = addHours(startTime, 3);

    await prisma.appointment.create({
      data: {
        jobId: job.id,
        startTime,
        endTime,
        status: AppointmentStatus.SCHEDULED,
        reminder5dSent: false,
        reminder1dSent: false,
        completionSent: false,
        staff: {
          connect: [{ id: staff[i % staff.length].id }],
        },
      },
    });

    created++;
  }

  return created;
}

async function main() {
  console.log(`\n🌱 Eco Clean seed started in "${mode}" mode...\n`);

  await resetDatabase();

  const users = await createUsers();
  const clients = await createClients();
  const counts = await createJobsForClients(clients, users.staff);
  const guaranteedReminderAppointments =
    await createGuaranteedReminderTestAppointments(users.staff);

  const summary = {
    mode,
    admins: users.admins.length,
    staff: users.staff.length,
    clientUsers: users.clientUsers.length,
    clients: clients.length,
    jobs: counts.jobsCreated + guaranteedReminderAppointments,
    appointments: counts.appointmentsCreated + guaranteedReminderAppointments,
    visitNotes: counts.visitNotesCreated,
    appointmentImages: counts.appointmentImagesCreated,
    workSessions: counts.workSessionsCreated,
    jobNotes: counts.jobNotesCreated,
    jobNoteImages: counts.jobNoteImagesCreated,
    recurrences: counts.recurrencesCreated,
    lineItems: counts.lineItemsCreated,
    guaranteedReminderAppointments,
    loginPassword: DEFAULT_PASSWORD,
    seedTestEmail: SEED_TEST_EMAIL || "(not set)",
  };

  console.log("✅ Seed completed successfully\n");
  console.table(summary);

  console.log("\nSeed accounts:");
  console.log("Admin:  admin1@ecoclean.local");
  console.log("Staff:  staff1@ecoclean.local");
  console.log("Client: client1@ecoclean.local");
  console.log(`Password: ${DEFAULT_PASSWORD}\n`);

  if (SEED_TEST_EMAIL) {
    console.log(
      `Guaranteed 5-day reminder test emails will go to: ${SEED_TEST_EMAIL}\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

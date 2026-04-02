import "dotenv/config";
import {
  PrismaClient,
  Prisma,
  Role,
  JobType,
  AppointmentStatus,
  JobNoteCategory,
  AssignmentStatus,
  LeaveType,
  TimesheetStatus,
  TimesheetPeriodStatus,
} from "@prisma/client";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

type SeedMode = "small" | "medium" | "large";

const mode = (process.argv[2] as SeedMode) || "small";
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
  return new Date(date.getTime() + minutes * 60000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3600000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
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
  return `(604) ${randInt(100, 999)}-${randInt(1000, 9999)}`;
}

function fakePostalCode() {
  return faker.location.zipCode("A#A #A#").toUpperCase();
}

function fakePreferredContact() {
  return pick(["EMAIL", "PHONE", "TEXT"]);
}

function fakeLeadSource() {
  return pick(["Google", "Referral", "Instagram", "Website"]);
}

function fakeJobTitle(type: JobType) {
  return type === JobType.RECURRING
    ? "Weekly Cleaning"
    : "Deep Cleaning";
}

function fakeImageUrl(seed: string) {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

async function resetDatabase() {
  await prisma.payStatement.deleteMany();
  await prisma.timesheetDay.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.staffAddress.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.appointmentAiInsight.deleteMany();
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

  const adminCount = Math.max(1, cfg.adminCount);
  const staffCount = Math.max(1, cfg.staffCount);

  for (let i = 0; i < adminCount; i++) {
    users.push({
      name: `Admin ${i + 1}`,
      email: uniqueSeedEmail("admin", i),
      role: Role.ADMIN,
      password: PASSWORD,
    });
  }

  for (let i = 0; i < staffCount; i++) {
    users.push({
      name: faker.person.fullName(),
      email: uniqueSeedEmail("staff", i),
      role: Role.STAFF,
      password: PASSWORD,
    });
  }

  for (let i = 0; i < cfg.clientUserCount; i++) {
    users.push({
      name: faker.person.fullName(),
      email: uniqueSeedEmail("client", i),
      role: Role.CLIENT,
      password: PASSWORD,
    });
  }

  await prisma.user.createMany({ data: users });

  const allUsers = await prisma.user.findMany();

  return {
    admins: allUsers.filter((u) => u.role === Role.ADMIN),
    staff: allUsers.filter((u) => u.role === Role.STAFF),
    clientUsers: allUsers.filter((u) => u.role === Role.CLIENT),
  };
}

async function createStaffProfiles(staff: { id: string }[]) {
  for (const s of staff) {
    await prisma.staffProfile.create({
      data: {
        userId: s.id,
        position: "Cleaner",
        hourlyRate: 25,
        staffProfileId: `SP-${faker.string.alphanumeric(6).toUpperCase()}`,
        staffAddress: {
          create: {
            street1: faker.location.streetAddress(),
            city: "Surrey",
            province: "BC",
            country: "Canada",
          },
        },
        emergencyContact: {
          create: {
            name: faker.person.fullName(),
            phoneNumber: fakePhone(),
            relationship: "Friend",
          },
        },
        availabilities: {
          create: {
            effectiveFrom: new Date(),
            monActive: true,
            monS1: true,
          },
        },
      },
    });
  }
}

async function createClients() {
  const clients = [];

  for (let i = 0; i < cfg.clientCount; i++) {
    const c = await prisma.client.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: fakePhone(),
        preferredContact: fakePreferredContact(),
        leadSource: fakeLeadSource(),
        addresses: {
          create: {
            street1: faker.location.streetAddress(),
            city: "Burnaby",
            province: "BC",
            postalCode: fakePostalCode(),
            country: "Canada",
            isPrimary: true,
          },
        },
      },
      include: { addresses: true },
    });

    clients.push(c);
  }

  return clients;
}

async function main() {
  console.log("🌱 Seeding...");

  await resetDatabase();

  const users = await createUsers();
  await createStaffProfiles(users.staff);
  const clients = await createClients();

  console.log("✅ Done");
  console.log("Login:");
  console.log("admin1@ecoclean.local / Password123!");
  console.log("staff1@ecoclean.local / Password123!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
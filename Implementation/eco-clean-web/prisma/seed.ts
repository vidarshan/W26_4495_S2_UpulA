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
  LeaveStatus,
  TimesheetStatus,
  TimesheetPeriodStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";
import { calculatePayroll } from "../lib/payroll/calculatePayroll";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  }),
  log: ["error"],
});

type SeedMode = "small" | "medium" | "large";
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type ShiftKey = "S1" | "S2";
type AvailabilitySnapshot = Record<
  `${DayKey}Active` | `${DayKey}${ShiftKey}`,
  boolean
>;

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
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function setTime(date: Date, hour: number, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
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

function fakePosition() {
  return pick([
    "Cleaner",
    "Senior Cleaner",
    "Team Lead",
    "Field Technician",
    "Operations Support",
  ]);
}

function fakeRelationship() {
  return pick([
    "Spouse",
    "Parent",
    "Sibling",
    "Friend",
    "Partner",
  ]);
}

function fakeBankName() {
  return pick([
    "RBC",
    "TD Canada Trust",
    "Scotiabank",
    "BMO",
    "CIBC",
  ]);
}

function fakeDigits(length: number) {
  return faker.string.numeric(length);
}

function fakeStaffLocation() {
  return {
    street1: faker.location.streetAddress(),
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
  };
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
      reminder3dSent: daysUntil < 3 ? maybe(0.25) : false,
      reminder1dSent: daysUntil < 1 ? maybe(0.25) : false,
      completionSent: false,
    };
  }

  return {
    reminder5dSent: maybe(0.85),
    reminder3dSent: maybe(0.88),
    reminder1dSent: maybe(0.9),
    completionSent: status === AppointmentStatus.COMPLETED ? maybe(0.8) : false,
  };
}

function fakeAssignmentStatus(
  appointmentStatus: AppointmentStatus,
): AssignmentStatus {
  if (appointmentStatus === AppointmentStatus.CANCELLED) {
    return AssignmentStatus.PENDING;
  }
  if (appointmentStatus === AppointmentStatus.COMPLETED) {
    return AssignmentStatus.COMPLETED;
  }
  if (appointmentStatus === AppointmentStatus.LATE) {
    return pick([
      AssignmentStatus.EN_ROUTE,
      AssignmentStatus.ON_SITE,
      AssignmentStatus.COMPLETED,
    ]);
  }
  return pick([
    AssignmentStatus.PENDING,
    AssignmentStatus.EN_ROUTE,
    AssignmentStatus.ON_SITE,
  ]);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDayKey(date: Date): DayKey {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
    date.getDay()
  ] as DayKey;
}

function getRequiredShifts(startTime: Date, endTime: Date): ShiftKey[] {
  const required: ShiftKey[] = [];
  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
  const endHour = endTime.getHours() + endTime.getMinutes() / 60;

  if (startHour < 12 && endHour > 7) required.push("S1");
  if (startHour < 17 && endHour > 12) required.push("S2");

  return required;
}

function supportsAppointmentWindow(
  availability: AvailabilitySnapshot,
  startTime: Date,
  endTime: Date,
) {
  const dayKey = getDayKey(startTime);
  const isActive = availability[`${dayKey}Active`];
  const requiredShifts = getRequiredShifts(startTime, endTime);

  if (!isActive || !requiredShifts.length) return false;

  return requiredShifts.every((shift) => availability[`${dayKey}${shift}`]);
}

function createAvailabilityPattern(variant: number): AvailabilitySnapshot {
  const baseWeekdays = {
    monActive: true,
    tueActive: true,
    wedActive: true,
    thuActive: true,
    friActive: true,
    satActive: false,
    sunActive: false,
  } as const;

  switch (variant % 4) {
    case 0:
      return {
        ...baseWeekdays,
        monS1: true,
        monS2: true,
        tueS1: true,
        tueS2: true,
        wedS1: true,
        wedS2: true,
        thuS1: true,
        thuS2: true,
        friS1: true,
        friS2: true,
        satS1: false,
        satS2: false,
        sunS1: false,
        sunS2: false,
      };
    case 1:
      return {
        ...baseWeekdays,
        monS1: true,
        monS2: false,
        tueS1: true,
        tueS2: false,
        wedS1: true,
        wedS2: false,
        thuS1: true,
        thuS2: false,
        friS1: true,
        friS2: false,
        satS1: maybe(0.45),
        satS2: false,
        sunS1: false,
        sunS2: false,
      };
    case 2:
      return {
        ...baseWeekdays,
        monS1: false,
        monS2: true,
        tueS1: false,
        tueS2: true,
        wedS1: false,
        wedS2: true,
        thuS1: false,
        thuS2: true,
        friS1: false,
        friS2: true,
        satS1: false,
        satS2: maybe(0.35),
        sunS1: false,
        sunS2: false,
      };
    default:
      return {
        ...baseWeekdays,
        monS1: true,
        monS2: true,
        tueS1: true,
        tueS2: true,
        wedS1: true,
        wedS2: false,
        thuS1: true,
        thuS2: true,
        friS1: true,
        friS2: false,
        satActive: true,
        satS1: true,
        satS2: maybe(0.4),
        sunActive: maybe(0.35),
        sunS1: maybe(0.35),
        sunS2: false,
      };
  }
}

function generateAppointmentWindow(from: Date, to: Date) {
  const workingDays = [1, 2, 3, 4, 5, 6];
  let candidate = randomDateBetween(from, to);
  let attempts = 0;

  while (!workingDays.includes(candidate.getDay()) && attempts < 20) {
    candidate = randomDateBetween(from, to);
    attempts++;
  }

  if (!workingDays.includes(candidate.getDay())) {
    candidate = addDays(startOfDay(new Date()), 1);
  }

  const shift = pick<ShiftKey>(["S1", "S2"]);
  const startHour =
    shift === "S1" ? pick([7, 8, 9, 10]) : pick([12, 13, 14, 15]);
  const maxDuration =
    shift === "S1" ? 12 - startHour : 17 - startHour;
  const durationHours = Math.max(2, Math.min(maxDuration, pick([2, 3, 4])));
  const startTime = setTime(startOfDay(candidate), startHour);
  const endTime = addHours(startTime, durationHours);

  return { startTime, endTime };
}

function fmtMoney(n: number) {
  return Number(n.toFixed(2));
}

function isoDayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function chooseLeaveStartDate(from: Date, to: Date) {
  let candidate = startOfDay(randomDateBetween(from, to));
  let attempts = 0;

  while ((candidate.getDay() === 0 || candidate.getDay() === 6) && attempts < 10) {
    candidate = startOfDay(randomDateBetween(from, to));
    attempts++;
  }

  return candidate;
}

function buildApprovedLeaveDays(leaves: { staffId: string; startAt: Date; endAt: Date }[]) {
  const leaveDays = new Map<string, Set<string>>();

  for (const leave of leaves) {
    const days = leaveDays.get(leave.staffId) ?? new Set<string>();
    let cursor = startOfDay(leave.startAt);
    const end = startOfDay(leave.endAt);

    while (cursor <= end) {
      days.add(isoDayKey(cursor));
      cursor = addDays(cursor, 1);
    }

    leaveDays.set(leave.staffId, days);
  }

  return leaveDays;
}

function getExpectedHoursForWeekday(dayOfWeek: number) {
  if (dayOfWeek === 1) return pick([6, 7, 8]);
  if (dayOfWeek === 5) return pick([5, 6, 7, 8, 9]);
  return pick([6, 7, 8, 8, 9]);
}

function calculatePayBreakdown(
  totalMinutes: number,
  hourlyRate: number,
  daysWorked: number,
) {
  const totalHours = totalMinutes / 60;
  const overtimeHours = Math.max(0, totalHours - 80);
  const regularHours = Math.max(0, totalHours - overtimeHours);
  const regularRate = fmtMoney(hourlyRate);
  const otRate = fmtMoney(hourlyRate * 1.5);
  const regularAmount = fmtMoney(regularHours * regularRate);
  const otAmount = fmtMoney(overtimeHours * otRate);
  const transportAllowance =
    daysWorked >= 8 ? fmtMoney(daysWorked * pick([8, 10, 12])) : 0;
  const gross = fmtMoney(regularAmount + otAmount + transportAllowance);

  const payroll = calculatePayroll({
    grossPayPerPeriod: gross,
  });

  const health = daysWorked >= 7 && maybe(0.45) ? pick([18, 22, 26, 32]) : 0;
  const other = maybe(0.18) ? pick([0, 8, 12, 15]) : 0;
  const totalDeductions = fmtMoney(payroll.totalDeductions + health + other);
  const netEarnings = fmtMoney(gross - totalDeductions);

  return {
    regularHours: fmtMoney(regularHours),
    regularRate,
    regularAmount,
    otHours: fmtMoney(overtimeHours),
    otRate,
    otAmount,
    transportAllowance,
    grossEarnings: gross,
    federalTax: fmtMoney(payroll.federalTax),
    quebecTax: fmtMoney(payroll.quebecTax),
    ei: fmtMoney(payroll.ei),
    qpp: fmtMoney(payroll.qpp),
    qpp2: 0,
    qpip: fmtMoney(payroll.qpip),
    health,
    other,
    deductions: totalDeductions,
    netEarnings,
    payrollDebug: payroll.debug ?? null,
  };
}

function logStage(message: string) {
  console.log(`• ${message}`);
}

async function resetDatabase() {
  await prisma.payStatement.deleteMany();
  await prisma.timesheetDay.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.timesheetPeriod.deleteMany();
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

async function createTimesheetPeriodsForYear(year: number) {
  const yearEnd = new Date(year, 11, 31);

  const periods: Array<{
    startDate: Date;
    endDate: Date;
    status: TimesheetPeriodStatus;
  }> = [];

  let currentStart = new Date(year, 0, 1);
  const firstPeriodEnd = new Date(year, 0, 1);
  let saturdaysFound = 0;

  while (saturdaysFound < 2) {
    if (firstPeriodEnd.getDay() === 6) {
      saturdaysFound++;
    }
    if (saturdaysFound < 2) {
      firstPeriodEnd.setDate(firstPeriodEnd.getDate() + 1);
    }
  }

  periods.push({
    startDate: new Date(currentStart),
    endDate: new Date(firstPeriodEnd),
    status: TimesheetPeriodStatus.LOCKED,
  });

  currentStart = addDays(firstPeriodEnd, 1);

  while (currentStart <= yearEnd) {
    let currentEnd = addDays(currentStart, 13);

    if (currentEnd > yearEnd) {
      currentEnd = new Date(yearEnd);
    }

    const status =
      currentEnd < new Date() ? TimesheetPeriodStatus.LOCKED : TimesheetPeriodStatus.OPEN;

    periods.push({
      startDate: new Date(currentStart),
      endDate: new Date(currentEnd),
      status,
    });

    currentStart = addDays(currentEnd, 1);
  }

  await prisma.timesheetPeriod.createMany({ data: periods });

  return periods.length;
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

async function createStaffProfiles(staff: { id: string; name: string }[]) {
  let profilesCreated = 0;
  let availabilityRowsCreated = 0;
  let financialRecordsCreated = 0;

  for (let i = 0; i < staff.length; i++) {
    const member = staff[i];
    const homeLocation = fakeStaffLocation();

    const profile = await prisma.staffProfile.create({
      data: {
        userId: member.id,
        staffId: `EC-${String(i + 1).padStart(4, "0")}`,
        position: fakePosition(),
        hourlyRate: faker.number.float({
          min: 22,
          max: 36,
          fractionDigits: 2,
        }),
        phoneNumber: fakePhone(),
        bankDetails: {
          create: {
            bankName: fakeBankName(),
            accountHolder: member.name,
            institutionNo: fakeDigits(3),
            transitNo: fakeDigits(5),
            accountNo: fakeDigits(10),
          },
        },
        td1: {
          create: {
            sin: fakeDigits(9),
            federalClaimAmount: pick([15705, 16452, 17298]),
            quebecClaimAmount: 0,
            additionalFederalTaxPerPay: maybe(0.25)
              ? pick([0, 15, 25, 40])
              : 0,
            additionalQuebecTaxPerPay: 0,
            isExempt: maybe(0.05),
          },
        },
      },
      select: { id: true },
    });

    profilesCreated++;

    await prisma.staffAddress.create({
      data: {
        staffProfileId: profile.id,
        ...homeLocation,
      },
    });

    await prisma.emergencyContact.create({
      data: {
        staffProfileId: profile.id,
        name: faker.person.fullName(),
        phoneNumber: fakePhone(),
        relationship: fakeRelationship(),
      },
    });

    financialRecordsCreated += 2;

    const latestPattern = createAvailabilityPattern(i);
    const previousPattern = createAvailabilityPattern(i + 1);
    const availabilityRows = [
      {
        staffProfileId: profile.id,
        effectiveFrom: addDays(new Date(), -randInt(7, 45)),
        ...latestPattern,
      },
      ...(maybe(0.3)
        ? [
            {
              staffProfileId: profile.id,
              effectiveFrom: addDays(new Date(), -randInt(60, 180)),
              ...previousPattern,
            },
          ]
        : []),
    ].sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    await prisma.staffAvailability.createMany({ data: availabilityRows });
    availabilityRowsCreated += availabilityRows.length;

    await prisma.user.update({
      where: { id: member.id },
      data: {
        lastKnownJobLocation: homeLocation,
      },
    });
  }

  return {
    profilesCreated,
    availabilityRowsCreated,
    financialRecordsCreated,
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
        ? SEED_TEST_EMAIL.replace("@", `+client${i + 1}@`)
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
  const threeWeeksAgo = addDays(now, -21);
  const threeWeeksAhead = addDays(now, 21);
  const clientIds = clients.map((client) => client.id);
  const latestAvailabilities = await prisma.staffAvailability.findMany({
    where: {
      staffProfile: {
        userId: { in: staff.map((member) => member.id) },
      },
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    select: {
      staffProfile: {
        select: {
          userId: true,
        },
      },
      monActive: true,
      monS1: true,
      monS2: true,
      tueActive: true,
      tueS1: true,
      tueS2: true,
      wedActive: true,
      wedS1: true,
      wedS2: true,
      thuActive: true,
      thuS1: true,
      thuS2: true,
      friActive: true,
      friS1: true,
      friS2: true,
      satActive: true,
      satS1: true,
      satS2: true,
      sunActive: true,
      sunS1: true,
      sunS2: true,
    },
  });
  const availabilityMap = new Map<string, AvailabilitySnapshot>();
  const addresses = await prisma.address.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true, clientId: true },
  });
  const addressesByClientId = new Map<string, { id: string }[]>();

  for (const address of addresses) {
    const existing = addressesByClientId.get(address.clientId) ?? [];
    existing.push({ id: address.id });
    addressesByClientId.set(address.clientId, existing);
  }

  const staffProfiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, hourlyRate: true },
  });
  const hourlyRateMap = new Map(
    staffProfiles.map((p) => [p.userId, p.hourlyRate]),
  );

  for (const availability of latestAvailabilities) {
    const userId = availability.staffProfile.userId;
    if (!availabilityMap.has(userId)) {
      const snapshot: AvailabilitySnapshot = {
        monActive: availability.monActive,
        monS1: availability.monS1,
        monS2: availability.monS2,
        tueActive: availability.tueActive,
        tueS1: availability.tueS1,
        tueS2: availability.tueS2,
        wedActive: availability.wedActive,
        wedS1: availability.wedS1,
        wedS2: availability.wedS2,
        thuActive: availability.thuActive,
        thuS1: availability.thuS1,
        thuS2: availability.thuS2,
        friActive: availability.friActive,
        friS1: availability.friS1,
        friS2: availability.friS2,
        satActive: availability.satActive,
        satS1: availability.satS1,
        satS2: availability.satS2,
        sunActive: availability.sunActive,
        sunS1: availability.sunS1,
        sunS2: availability.sunS2,
      };
      availabilityMap.set(userId, snapshot);
    }
  }

  for (let clientIndex = 0; clientIndex < clients.length; clientIndex++) {
    const client = clients[clientIndex];
    const clientAddresses = addressesByClientId.get(client.id) ?? [];

    if (!clientAddresses.length) {
      continue;
    }

    if (clientIndex > 0 && clientIndex % 20 === 0) {
      console.log(
        `  Processed ${clientIndex}/${clients.length} clients for jobs...`,
      );
    }

    const jobsCount = randInt(cfg.jobsPerClientMin, cfg.jobsPerClientMax);

    for (let j = 0; j < jobsCount; j++) {
      const jobType = maybe(0.45) ? JobType.RECURRING : JobType.ONE_OFF;
      const selectedAddress =
        clientAddresses[randInt(0, clientAddresses.length - 1)];

      const job = await prisma.job.create({
        data: {
          title: fakeJobTitle(jobType),
          type: jobType,
          clientId: client.id,
          addressId: selectedAddress.id,
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
        const { startTime, endTime } = generateAppointmentWindow(
          threeWeeksAgo,
          threeWeeksAhead,
        );
        const status = deriveAppointmentStatus(startTime);

        const reminderFlags = computeReminderFlags(startTime, status);

        const availableStaffIds = staff
          .map((member) => member.id)
          .filter((staffId) => {
            const availability = availabilityMap.get(staffId);
            return (
              availability &&
              supportsAppointmentWindow(availability, startTime, endTime)
            );
          });

        const assignmentPool = availableStaffIds.length
          ? availableStaffIds
          : staff.map((member) => member.id);
        const requiredStaffCount = Math.min(
          assignmentPool.length,
          maybe(0.75) ? 1 : 2,
        );
        const assignedStaff = faker.helpers.arrayElements(assignmentPool, {
          min: Math.max(1, requiredStaffCount),
          max: Math.max(1, requiredStaffCount),
        });

        const completedAt =
          status === AppointmentStatus.COMPLETED
            ? addMinutes(endTime, randInt(5, 75))
            : null;

        const timeSpent =
          status === AppointmentStatus.COMPLETED ||
          status === AppointmentStatus.LATE
            ? randInt(
                Math.round(((endTime.getTime() - startTime.getTime()) / 3600000) * 50),
                Math.round(((endTime.getTime() - startTime.getTime()) / 3600000) * 70),
              )
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
            reminder3dSent: reminderFlags.reminder3dSent,
            reminder5dSent: reminderFlags.reminder5dSent,
            assignments: {
              create: assignedStaff.map((staffId) => ({
                staffId,
                status: fakeAssignmentStatus(status),
                plannedStart: maybe(0.7)
                  ? addMinutes(startTime, randInt(-15, 15))
                  : null,
                plannedEnd: maybe(0.7)
                  ? addMinutes(endTime, randInt(-15, 20))
                  : null,
                hourlyRateAtTime: hourlyRateMap.get(staffId) ?? 0,
                breakMinutes: maybe(0.5) ? pick([0, 15, 30]) : 0,
                notes: maybe(0.25) ? faker.lorem.sentence() : null,
              })),
            },
          },
          include: {
            assignments: {
              select: {
                staffId: true,
              },
            },
          },
        });

        appointmentsCreated++;

        const visitNotes = Array.from({ length: randInt(0, 3) }).map(() => {
          const pickedAssignment =
            appointment.assignments.length > 0
              ? appointment.assignments[
                  randInt(0, appointment.assignments.length - 1)
                ]
              : null;

          return {
            appointmentId: appointment.id,
            content: faker.lorem.sentences({ min: 1, max: 3 }),
            isClientVisible: maybe(0.35),
            createdAt: faker.date.between({
              from: addDays(startTime, -2),
              to: addDays(startTime, 2),
            }),
            createdById:
              maybe(0.85) && pickedAssignment
                ? pickedAssignment.staffId
                : maybe(0.4)
                  ? pick(createdByCandidates)
                  : null,
          };
        });

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

        if (shouldCreateWorkSession(status) && appointment.assignments.length) {
          const sessions = appointment.assignments.map((member) => {
            const startedAt = addMinutes(startTime, randInt(-10, 25));
            const endedAt =
              status === AppointmentStatus.COMPLETED
                ? addMinutes(endTime, randInt(-15, 40))
                : maybe(0.5)
                  ? null
                  : addMinutes(endTime, randInt(-30, 20));

            return {
              appointmentId: appointment.id,
              staffId: member.staffId,
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

async function createCurrentTimeLogFixtures(staff: { id: string }[]) {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(2, Math.min(4, staff.length)),
    select: { id: true },
  });

  if (!jobs.length || !staff.length) return 0;

  const staffProfiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, hourlyRate: true },
  });

  const hourlyRateMap = new Map(
    staffProfiles.map((profile) => [profile.userId, profile.hourlyRate]),
  );

  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  const fixtures: Array<{
    jobId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    startedAt: Date | null;
    endedAt: Date | null;
    status: AppointmentStatus;
  }> = [
    {
      jobId: jobs[0].id,
      staffId: staff[0].id,
      startTime: addHours(today, 9),
      endTime: addHours(today, 11),
      startedAt: addMinutes(addHours(today, 9), 5),
      endedAt: addMinutes(addHours(today, 11), -10),
      status: AppointmentStatus.COMPLETED,
    },
    {
      jobId: jobs[Math.min(1, jobs.length - 1)].id,
      staffId: staff[Math.min(1, staff.length - 1)].id,
      startTime: addHours(yesterday, 13),
      endTime: addHours(yesterday, 15),
      startedAt: addMinutes(addHours(yesterday, 13), 2),
      endedAt: addMinutes(addHours(yesterday, 15), -6),
      status: AppointmentStatus.COMPLETED,
    },
    {
      jobId: jobs[0].id,
      staffId: staff[0].id,
      startTime: addHours(today, 15),
      endTime: addHours(today, 17),
      startedAt: null,
      endedAt: null,
      status: AppointmentStatus.SCHEDULED,
    },
  ];

  let created = 0;

  for (const fixture of fixtures) {
    const appointment = await prisma.appointment.create({
      data: {
        jobId: fixture.jobId,
        startTime: fixture.startTime,
        endTime: fixture.endTime,
        status: fixture.status,
        completedAt:
          fixture.status === AppointmentStatus.COMPLETED
            ? addMinutes(fixture.endedAt ?? fixture.endTime, 5)
            : null,
        timeSpent:
          fixture.startedAt && fixture.endedAt
            ? Math.max(
                1,
                Math.round(
                  (fixture.endedAt.getTime() - fixture.startedAt.getTime()) / 60000,
                ),
              )
            : null,
        assignments: {
          create: [
            {
              staffId: fixture.staffId,
              status:
                fixture.status === AppointmentStatus.COMPLETED
                  ? AssignmentStatus.COMPLETED
                  : AssignmentStatus.PENDING,
              plannedStart: fixture.startTime,
              plannedEnd: fixture.endTime,
              hourlyRateAtTime: hourlyRateMap.get(fixture.staffId) ?? 0,
              breakMinutes: 0,
            },
          ],
        },
      },
    });

    if (fixture.startedAt) {
      await prisma.appointmentWorkSession.create({
        data: {
          appointmentId: appointment.id,
          staffId: fixture.staffId,
          startedAt: fixture.startedAt,
          endedAt: fixture.endedAt,
        },
      });
    }

    created++;
  }

  return created;
}

async function createLeaves(staff: { id: string }[]) {
  const leaveRows: Prisma.LeaveCreateManyInput[] = [];

  for (const member of staff) {
    const leaveCount = pick([0, 1, 1, 2, 2, 3]);

    for (let i = 0; i < leaveCount; i++) {
      const type = pick([
        LeaveType.VACATION,
        LeaveType.VACATION,
        LeaveType.PAID_SICK,
        LeaveType.PERSONAL,
        LeaveType.UNPAID_SICK,
      ]);
      const isFutureHeavy = type === LeaveType.VACATION;
      const startAt = chooseLeaveStartDate(
        addDays(new Date(), isFutureHeavy ? 14 : -75),
        addDays(new Date(), isFutureHeavy ? 120 : 30),
      );
      const durationDays =
        type === LeaveType.VACATION
          ? pick([1, 2, 3, 4, 5])
          : type === LeaveType.PERSONAL
            ? pick([1, 1, 1, 2])
            : pick([1, 1, 2, 3]);
      const endAt = endOfDay(addDays(startAt, durationDays - 1));
      const status: LeaveStatus =
        type === LeaveType.VACATION && startAt > new Date()
          ? pick([
              LeaveStatus.APPROVED,
              LeaveStatus.APPROVED,
              LeaveStatus.PENDING,
            ])
          : pick([
              LeaveStatus.APPROVED,
              LeaveStatus.APPROVED,
              LeaveStatus.REJECTED,
              LeaveStatus.PENDING,
            ]);
      const createdAt = faker.date.between({
        from: addDays(startAt, type === LeaveType.VACATION ? -45 : -10),
        to: addDays(startAt, -1),
      });
      const reason =
        type === LeaveType.VACATION
          ? pick([
              "Family trip planned in advance.",
              "Booked personal vacation.",
              "Out-of-town travel already scheduled.",
            ])
          : type === LeaveType.PERSONAL
            ? pick([
                "Personal appointment.",
                "Family responsibility.",
                "Personal day requested.",
              ])
            : pick([
                "Medical appointment and recovery.",
                "Not feeling well and unable to work.",
                "Recovering from illness.",
              ]);

      leaveRows.push({
        staffId: member.id,
        type,
        startAt,
        endAt,
        reason: maybe(0.9) ? reason : null,
        status,
        createdAt,
      });
    }
  }

  if (leaveRows.length) {
    await prisma.leave.createMany({
      data: leaveRows as Prisma.LeaveCreateManyInput[],
    });
  }

  return leaveRows.length;
}

async function createTimesheetsAndPayroll(
  staff: { id: string }[],
  admins: { id: string }[],
) {
  let existingPeriodsUsed = 0;
  let timesheetsCreated = 0;
  let timesheetDaysCreated = 0;
  let payStatementsCreated = 0;

  const profiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, hourlyRate: true },
  });

  const hourlyRateMap = new Map(profiles.map((p) => [p.userId, p.hourlyRate]));
  const approverId = admins[0]?.id ?? null;
  const approvedLeaves = await prisma.leave.findMany({
    where: {
      staffId: { in: staff.map((member) => member.id) },
      status: "APPROVED",
    },
    select: {
      staffId: true,
      startAt: true,
      endAt: true,
    },
  });
  const approvedLeaveDays = buildApprovedLeaveDays(approvedLeaves);

  const periods = await prisma.timesheetPeriod.findMany({
    orderBy: { startDate: "asc" },
  });

  if (!periods.length) {

    return {
      existingPeriodsUsed: 0,
      timesheetsCreated: 0,
      timesheetDaysCreated: 0,
      payStatementsCreated: 0,
    };
  }

  existingPeriodsUsed = periods.length;

  for (const period of periods) {
    for (const member of staff) {
      const hourlyRate = hourlyRateMap.get(member.id) ?? 0;
      const isLocked = period.status === TimesheetPeriodStatus.LOCKED;
      const staffLeaveDays = approvedLeaveDays.get(member.id) ?? new Set<string>();

      const days: Prisma.TimesheetDayCreateWithoutTimesheetInput[] = [];
      let cursor = startOfDay(period.startDate);

      while (cursor <= period.endDate) {
        const dayOfWeek = cursor.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isOnApprovedLeave = staffLeaveDays.has(isoDayKey(cursor));

        if (!isWeekend && !isOnApprovedLeave && maybe(0.84)) {
          const expectedHours = getExpectedHoursForWeekday(dayOfWeek);
          const minutesWorked = pick([
            expectedHours * 60,
            expectedHours * 60,
            Math.max(240, (expectedHours - 1) * 60),
            Math.min(600, (expectedHours + 1) * 60),
          ]);
          days.push({
            workDate: new Date(cursor),
            minutesWorked,
            hourlyRate,
            notes: maybe(0.22)
              ? pick([
                  "Client requested extra attention in kitchen.",
                  "Travel delay noted before shift start.",
                  "Completed standard service checklist.",
                  "Supplies restocked after appointment.",
                ])
              : null,
          });
        }

        cursor = addDays(cursor, 1);
      }

      const existingTimesheet = await prisma.timesheet.findFirst({
        where: {
          periodId: period.id,
          staffId: member.id,
        },
        select: { id: true },
      });

      if (existingTimesheet) continue;

      const status = isLocked
        ? TimesheetStatus.APPROVED
        : maybe(0.45)
          ? TimesheetStatus.SUBMITTED
          : TimesheetStatus.OPEN;

      const totalMinutes = days.reduce((sum, day) => sum + day.minutesWorked, 0);
      const totalPay = fmtMoney(
        days.reduce((sum, day) => {
          const rate = day.hourlyRate ?? hourlyRate;
          return sum + (day.minutesWorked / 60) * rate;
        }, 0),
      );
      const payBreakdown = calculatePayBreakdown(totalMinutes, hourlyRate, days.length);

      const snapshot: Prisma.InputJsonValue | undefined =
        status === TimesheetStatus.APPROVED
          ? {
              staffId: member.id,
              periodId: period.id,
              approvedAt: addDays(period.endDate, 2),
              totalMinutes,
              totalHours: fmtMoney(totalMinutes / 60),
              totalPay,
              regularHours: payBreakdown.regularHours,
              overtimeHours: payBreakdown.otHours,
              transportAllowance: payBreakdown.transportAllowance,
              days: days.map((day) => ({
                date: day.workDate,
                minutes: day.minutesWorked,
                rate: day.hourlyRate ?? hourlyRate,
                pay: fmtMoney(
                  (day.minutesWorked / 60) * (day.hourlyRate ?? hourlyRate),
                ),
                notes: day.notes ?? null,
              })),
              source: "seed",
            }
          : undefined;

      await prisma.timesheet.create({
        data: {
          periodId: period.id,
          staffId: member.id,
          status,
          submittedAt:
            status === TimesheetStatus.SUBMITTED ||
            status === TimesheetStatus.APPROVED
              ? addDays(period.endDate, 1)
              : null,
          approvedAt: isLocked ? addDays(period.endDate, 2) : null,
          approvedById: isLocked ? approverId : null,
          isLocked,
          notes: maybe(0.2) ? faker.lorem.sentence() : null,
          snapshot,
          totalMinutes,
          totalPay,
          days: {
            create: days,
          },
        },
      });

      timesheetsCreated++;
      timesheetDaysCreated += days.length;

      if (isLocked) {
        const existingPayStatement = await prisma.payStatement.findFirst({
          where: {
            userId: member.id,
            timesheetPeriodId: period.id,
          },
          select: { id: true },
        });

        if (existingPayStatement) continue;

        await prisma.payStatement.create({
          data: {
            userId: member.id,
            timesheetPeriodId: period.id,
            payPeriodStart: period.startDate,
            payPeriodEnd: period.endDate,
            payDate: addDays(period.endDate, 5),
            grossEarnings: payBreakdown.grossEarnings,
            totalDeductions: payBreakdown.deductions,
            netEarnings: payBreakdown.netEarnings,
            breakdown: {
              userId: member.id,
              regularHours: payBreakdown.regularHours,
              regularRate: payBreakdown.regularRate,
              regularAmount: payBreakdown.regularAmount,
              otHours: payBreakdown.otHours,
              otRate: payBreakdown.otRate,
              otAmount: payBreakdown.otAmount,
              transportAllowance: payBreakdown.transportAllowance,
              federalTax: payBreakdown.federalTax,
              quebecTax: payBreakdown.quebecTax,
              ei: payBreakdown.ei,
              qpp: payBreakdown.qpp,
              qpp2: payBreakdown.qpp2,
              qpip: payBreakdown.qpip,
              health: payBreakdown.health,
              other: payBreakdown.other,
              deductions: payBreakdown.deductions,
              grossEarnings: payBreakdown.grossEarnings,
              netEarnings: payBreakdown.netEarnings,
              totalHours: fmtMoney(totalMinutes / 60),
              daysWorked: days.length,
              hourlyRate,
              payrollDebug: payBreakdown.payrollDebug,
              source: "seed",
            },
          },
        });

        payStatementsCreated++;
      }
    }
  }

  return {
    existingPeriodsUsed,
    timesheetsCreated,
    timesheetDaysCreated,
    payStatementsCreated,
  };
}

async function createAppointmentAiInsights() {
  const completedAppointments = await prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.COMPLETED,
    },
    take: 25,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  let created = 0;

  for (const appt of completedAppointments) {
    if (!maybe(0.55)) continue;

    await prisma.appointmentAiInsight.create({
      data: {
        appointmentId: appt.id,
        type: pick(["SUMMARY", "QUALITY_CHECK", "FOLLOW_UP"]),
        model: pick(["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]),
        promptVersion: pick(["v1", "v2"]),
        payload: {
          summary: faker.lorem.sentences({ min: 2, max: 4 }),
          actionItems: Array.from({ length: randInt(1, 3) }).map(() =>
            faker.lorem.sentence(),
          ),
          confidence: faker.number.float({
            min: 0.72,
            max: 0.98,
            fractionDigits: 2,
          }),
          source: "seed",
        },
      },
    });

    created++;
  }

  return created;
}

async function createGuaranteedReminderTestAppointments(
  staff: { id: string }[],
) {
  if (!SEED_TEST_EMAIL) {
    return 0;
  }

  const staffProfiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, hourlyRate: true },
  });

  const hourlyRateMap = new Map(
    staffProfiles.map((p) => [p.userId, p.hourlyRate]),
  );

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

  if (!clients.length) {
    return 0;
  }

  function reminderDateUtc(daysFromNow: number, hour = 16) {
    const now = new Date();

    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysFromNow,
        hour,
        0,
        0,
        0,
      ),
    );
  }

  const templates = [
    {
      label: "5-day",
      startTime: reminderDateUtc(5, 13),
      endTime: reminderDateUtc(5, 16),
    },
    {
      label: "1-day",
      startTime: reminderDateUtc(1, 13),
      endTime: reminderDateUtc(1, 16),
    },
    {
      label: "control",
      startTime: reminderDateUtc(3, 9),
      endTime: reminderDateUtc(3, 12),
    },
  ];

  let created = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const address = client.addresses[0];
    if (!address) continue;

    const template = templates[i % templates.length];
    const assignedStaffId = staff.length ? staff[i % staff.length].id : null;

    const job = await prisma.job.create({
      data: {
        title: `Reminder Test Job ${i + 1} (${template.label})`,
        type: JobType.ONE_OFF,
        clientId: client.id,
        addressId: address.id,
        isAnytime: false,
        visitInstructions: `Guaranteed seed appointment for ${template.label} reminder testing.`,
      },
    });

    await prisma.appointment.create({
      data: {
        jobId: job.id,
        startTime: template.startTime,
        endTime: template.endTime,
        status: AppointmentStatus.SCHEDULED,
        reminder5dSent: false,
        reminder3dSent: false,
        reminder1dSent: false,
        completionSent: false,
        assignments: assignedStaffId
          ? {
              create: [
                {
                  staffId: assignedStaffId,
                  hourlyRateAtTime: hourlyRateMap.get(assignedStaffId) ?? 0,
                  breakMinutes: 0,
                },
              ],
            }
          : undefined,
      },
    });

    created++;
  }

  return created;
}

async function main() {
  console.log(`\n🌱 Eco Clean seed started in "${mode}" mode...\n`);

  logStage("Resetting database");
  await resetDatabase();

  logStage("Creating timesheet periods");
  const periodsCreated = await createTimesheetPeriodsForYear(new Date().getFullYear());

  logStage("Creating users");
  const users = await createUsers();

  logStage("Creating staff profiles");
  const staffProfileCounts = await createStaffProfiles(users.staff);

  logStage("Creating clients");
  const clients = await createClients();

  logStage("Creating jobs and appointments");
  const counts = await createJobsForClients(clients, users.staff);

  logStage("Creating current time fixtures");
  const currentTimeFixtures = await createCurrentTimeLogFixtures(users.staff);

  logStage("Creating leave records");
  const leaveCount = await createLeaves(users.staff);

  logStage("Creating timesheets and payroll");
  const payrollCounts = await createTimesheetsAndPayroll(
    users.staff,
    users.admins,
  );

  logStage("Creating appointment AI insights");
  const aiInsightCount = await createAppointmentAiInsights();

  logStage("Creating guaranteed reminder fixtures");
  const guaranteedReminderAppointments =
    await createGuaranteedReminderTestAppointments(users.staff);

  const summary = {
    mode,
    admins: users.admins.length,
    staff: users.staff.length,
    staffProfiles: staffProfileCounts.profilesCreated,
    staffAvailabilities: staffProfileCounts.availabilityRowsCreated,
    staffFinancialRecords: staffProfileCounts.financialRecordsCreated,
    clientUsers: users.clientUsers.length,
    clients: clients.length,
    jobs: counts.jobsCreated + guaranteedReminderAppointments,
    appointments: counts.appointmentsCreated + guaranteedReminderAppointments,
    visitNotes: counts.visitNotesCreated,
    appointmentImages: counts.appointmentImagesCreated,
    workSessions: counts.workSessionsCreated,
    currentTimeFixtures,
    jobNotes: counts.jobNotesCreated,
    jobNoteImages: counts.jobNoteImagesCreated,
    recurrences: counts.recurrencesCreated,
    lineItems: counts.lineItemsCreated,
    leaves: leaveCount,
    timesheetPeriodsUsed: payrollCounts.existingPeriodsUsed,
    timesheetPeriodsCreated: periodsCreated,
    timesheets: payrollCounts.timesheetsCreated,
    timesheetDays: payrollCounts.timesheetDaysCreated,
    payStatements: payrollCounts.payStatementsCreated,
    appointmentAiInsights: aiInsightCount,
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

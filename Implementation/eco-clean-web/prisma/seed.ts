import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AppointmentStatus,
  AssignmentStatus,
  JobNoteCategory,
  JobType,
  LeaveType,
  Prisma,
  PrismaClient,
  Role,
  TimesheetPeriodStatus,
  TimesheetStatus,
} from "@prisma/client";

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

const CONFIG: Record<
  SeedMode,
  {
    staffCount: number;
    clientCount: number;
    extraJobCount: number;
  }
> = {
  small: {
    staffCount: 3,
    clientCount: 4,
    extraJobCount: 0,
  },
  medium: {
    staffCount: 5,
    clientCount: 6,
    extraJobCount: 2,
  },
  large: {
    staffCount: 7,
    clientCount: 8,
    extraJobCount: 4,
  },
};

const cfg = CONFIG[mode];

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function imageUrl(seed: string) {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

type SeedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type SeedClient = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  email: string;
  phone: string;
  preferredContact: "EMAIL" | "PHONE" | "TEXT";
  leadSource?: string | null;
};

type SeedStaffProfile = {
  userId: string;
  position: string;
  hourlyRate: number;
  address: {
    street1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
};

type CreatedAppointment = {
  id: string;
  status: AppointmentStatus;
  startTime: Date;
};

type JobTemplate = {
  clientId?: string;
  title: string;
  type: JobType;
  isAnytime: boolean;
  visitInstructions: string;
  lineItems: {
    name: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    description: string;
  }[];
  notes: {
    title: string;
    content: string;
    category: JobNoteCategory;
    isClientVisible: boolean;
    isPinned: boolean;
  }[];
  recurrence: {
    frequency: string;
    interval: number;
    endType: string;
    endsAfter: number | null;
    endsOn: Date | null;
  } | null;
  appointments: {
    startTime: Date;
    durationHours: number;
    status: AppointmentStatus;
    staffIndexes: number[];
    createAiInsight: boolean;
  }[];
};

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

async function createUsers() {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const admin: SeedUser = {
    id: crypto.randomUUID(),
    name: "Admin One",
    email: "admin1@ecoclean.local",
    role: Role.ADMIN,
  };

  const staffTemplates: SeedUser[] = [
    {
      id: crypto.randomUUID(),
      name: "Ava Green",
      email: "staff1@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Liam Carter",
      email: "staff2@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Mia Patel",
      email: "staff3@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Noah Kim",
      email: "staff4@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Sophia Nguyen",
      email: "staff5@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Ethan Hall",
      email: "staff6@ecoclean.local",
      role: Role.STAFF,
    },
    {
      id: crypto.randomUUID(),
      name: "Chloe Adams",
      email: "staff7@ecoclean.local",
      role: Role.STAFF,
    },
  ];

  const clientUsers: SeedUser[] = [
    {
      id: crypto.randomUUID(),
      name: "Olivia Brooks",
      email: "client1@ecoclean.local",
      role: Role.CLIENT,
    },
    {
      id: crypto.randomUUID(),
      name: "Mason Reed",
      email: "client2@ecoclean.local",
      role: Role.CLIENT,
    },
  ];

  const users = [admin, ...staffTemplates.slice(0, cfg.staffCount), ...clientUsers];

  await prisma.user.createMany({
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      password,
    })),
  });

  return {
    admin,
    staff: staffTemplates.slice(0, cfg.staffCount),
    clientUsers,
  };
}

async function createStaffProfiles(staff: SeedUser[]) {
  const profiles: SeedStaffProfile[] = staff.map((user, index) => ({
    userId: user.id,
    position: ["Senior Cleaner", "Cleaner", "Team Lead", "Cleaner", "Cleaner"][index] ?? "Cleaner",
    hourlyRate: [27.5, 24.5, 29.0, 25.0, 24.0, 26.0, 28.0][index] ?? 24.5,
    address: {
      street1: `${210 + index} Main Street`,
      city: "Vancouver",
      province: "BC",
      postalCode: `V5K 1A${index}`,
      country: "Canada",
    },
    emergencyContact: {
      name: `Emergency Contact ${index + 1}`,
      phoneNumber: `604-555-01${String(index + 10).slice(-2)}`,
      relationship: index % 2 === 0 ? "Sibling" : "Partner",
    },
  }));

  for (const profile of profiles) {
    const created = await prisma.staffProfile.create({
      data: {
        userId: profile.userId,
        position: profile.position,
        hourlyRate: profile.hourlyRate,
      },
    });

    await prisma.staffAddress.create({
      data: {
        staffProfileId: created.id,
        ...profile.address,
      },
    });

    await prisma.emergencyContact.create({
      data: {
        staffProfileId: created.id,
        ...profile.emergencyContact,
      },
    });

    await prisma.staffAvailability.createMany({
      data: [
        {
          staffProfileId: created.id,
          effectiveFrom: addDays(startOfDay(new Date()), -60),
          monActive: true,
          monS1: true,
          monS2: true,
          tueActive: true,
          tueS1: true,
          tueS2: false,
          wedActive: true,
          wedS1: true,
          wedS2: true,
          thuActive: true,
          thuS1: true,
          thuS2: false,
          friActive: true,
          friS1: true,
          friS2: true,
          satActive: false,
          satS1: false,
          satS2: false,
          sunActive: false,
          sunS1: false,
          sunS2: false,
        },
        {
          staffProfileId: created.id,
          effectiveFrom: addDays(startOfDay(new Date()), 30),
          monActive: true,
          monS1: true,
          monS2: false,
          tueActive: true,
          tueS1: true,
          tueS2: true,
          wedActive: true,
          wedS1: true,
          wedS2: false,
          thuActive: true,
          thuS1: true,
          thuS2: true,
          friActive: true,
          friS1: true,
          friS2: false,
          satActive: true,
          satS1: true,
          satS2: false,
          sunActive: false,
          sunS1: false,
          sunS2: false,
        },
      ],
    });
  }

  return profiles;
}

async function createClients() {
  const clients: SeedClient[] = [
    {
      id: crypto.randomUUID(),
      firstName: "Emily",
      lastName: "Johnson",
      companyName: null,
      email: "client-home-1@ecoclean.local",
      phone: "604-555-1101",
      preferredContact: "EMAIL",
      leadSource: "Website",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Daniel",
      lastName: "Morris",
      companyName: "Harbour Dental",
      email: "client-office-1@ecoclean.local",
      phone: "604-555-1102",
      preferredContact: "PHONE",
      leadSource: "Referral",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Priya",
      lastName: "Shah",
      companyName: null,
      email: "client-home-2@ecoclean.local",
      phone: "604-555-1103",
      preferredContact: "TEXT",
      leadSource: "Instagram",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Lucas",
      lastName: "Bennett",
      companyName: "West End Realty",
      email: "client-moveout-1@ecoclean.local",
      phone: "604-555-1104",
      preferredContact: "EMAIL",
      leadSource: "Google",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Grace",
      lastName: "Parker",
      companyName: null,
      email: "client-home-3@ecoclean.local",
      phone: "604-555-1105",
      preferredContact: "PHONE",
      leadSource: "Returning Customer",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Henry",
      lastName: "Cole",
      companyName: "North Shore Physio",
      email: "client-office-2@ecoclean.local",
      phone: "604-555-1106",
      preferredContact: "EMAIL",
      leadSource: "Website",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Nora",
      lastName: "Sullivan",
      companyName: null,
      email: "client-home-4@ecoclean.local",
      phone: "604-555-1107",
      preferredContact: "TEXT",
      leadSource: "Referral",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Owen",
      lastName: "Bailey",
      companyName: "Bailey Law Office",
      email: "client-office-3@ecoclean.local",
      phone: "604-555-1108",
      preferredContact: "PHONE",
      leadSource: "Google",
    },
  ];

  const selected = clients.slice(0, cfg.clientCount);
  const addressMap = new Map<string, string[]>();

  for (const [index, client] of selected.entries()) {
    const created = await prisma.client.create({
      data: {
        id: client.id,
        title: index % 3 === 0 ? "Ms." : null,
        firstName: client.firstName,
        lastName: client.lastName,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        preferredContact: client.preferredContact,
        leadSource: client.leadSource,
        notes: {
          create: [
            {
              content:
                index % 2 === 0
                  ? "Customer is responsive and usually confirms by text."
                  : "Prefers a quick arrival heads-up before staff enter the property.",
            },
          ],
        },
        addresses: {
          create: [
            {
              street1: `${510 + index} Oak Avenue`,
              street2: null,
              city: index % 2 === 0 ? "Vancouver" : "Burnaby",
              province: "BC",
              postalCode: `V6B 1A${index}`,
              country: "Canada",
              isPrimary: true,
              isBilling: true,
            },
            ...(index % 3 === 0
              ? [
                  {
                    street1: `${910 + index} Billing Street`,
                    street2: "Suite 210",
                    city: "Richmond",
                    province: "BC",
                    postalCode: `V7C 1B${index}`,
                    country: "Canada",
                    isPrimary: false,
                    isBilling: false,
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        addresses: true,
      },
    });

    addressMap.set(
      created.id,
      created.addresses.map((address) => address.id),
    );
  }

  return {
    clients: selected,
    addressMap,
  };
}

async function createJobsAndAppointments(
  clients: SeedClient[],
  addressMap: Map<string, string[]>,
  staff: SeedUser[],
) {
  const staffProfiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((member) => member.id) } },
    select: { userId: true, hourlyRate: true },
  });

  const hourlyRateMap = new Map(
    staffProfiles.map((profile) => [profile.userId, profile.hourlyRate]),
  );

  const now = new Date();
  const createdAppointments: CreatedAppointment[] = [];

  const templates: JobTemplate[] = [
    {
      clientId: clients[0]?.id,
      title: "Weekly Home Cleaning",
      type: JobType.RECURRING,
      isAnytime: false,
      visitInstructions:
        "Ring once, use eco-friendly products only, and focus on bathrooms first.",
      lineItems: [
        { name: "General home cleaning", quantity: 1, unitCost: 65, unitPrice: 140, description: "Kitchen, bathrooms, dusting, floors" },
        { name: "Linen change", quantity: 1, unitCost: 8, unitPrice: 20, description: "Primary bedroom only" },
      ],
      notes: [
        {
          title: "Access",
          content: "Spare key is in the lockbox on the left gate.",
          category: JobNoteCategory.ACCESS,
          isClientVisible: false,
          isPinned: true,
        },
        {
          title: "Preference",
          content: "Avoid heavily scented sprays because of allergies.",
          category: JobNoteCategory.CLIENT_PREFERENCE,
          isClientVisible: true,
          isPinned: false,
        },
      ],
      recurrence: {
        frequency: "WEEKLY",
        interval: 1,
        endType: "AFTER_OCCURRENCES",
        endsAfter: 12,
        endsOn: null,
      },
      appointments: [
        {
          startTime: addDays(addHours(startOfDay(now), 9), -14),
          durationHours: 3,
          status: AppointmentStatus.COMPLETED,
          staffIndexes: [0, 1],
          createAiInsight: false,
        },
        {
          startTime: addDays(addHours(startOfDay(now), 9), -7),
          durationHours: 3,
          status: AppointmentStatus.COMPLETED,
          staffIndexes: [0, 2],
          createAiInsight: false,
        },
        {
          startTime: addDays(addHours(startOfDay(now), 9), 1),
          durationHours: 3,
          status: AppointmentStatus.SCHEDULED,
          staffIndexes: [0, 1],
          createAiInsight: true,
        },
        {
          startTime: addDays(addHours(startOfDay(now), 9), 8),
          durationHours: 3,
          status: AppointmentStatus.SCHEDULED,
          staffIndexes: [1, 2],
          createAiInsight: false,
        },
      ],
    },
    {
      clientId: clients[1]?.id,
      title: "Clinic Evening Maintenance",
      type: JobType.RECURRING,
      isAnytime: true,
      visitInstructions:
        "Clean waiting area last. Alarm code is provided by office manager.",
      lineItems: [
        { name: "Reception and treatment rooms", quantity: 1, unitCost: 80, unitPrice: 190, description: "Wipe surfaces and sanitize touchpoints" },
        { name: "Washroom sanitizing", quantity: 2, unitCost: 12, unitPrice: 30, description: "Restock paper and soap" },
      ],
      notes: [
        {
          title: "Safety",
          content: "Use non-slip floor signs after mopping front hallway.",
          category: JobNoteCategory.SAFETY,
          isClientVisible: false,
          isPinned: true,
        },
      ],
      recurrence: {
        frequency: "WEEKLY",
        interval: 2,
        endType: "ON_DATE",
        endsAfter: null,
        endsOn: addDays(now, 90),
      },
      appointments: [
        {
          startTime: addDays(addHours(startOfDay(now), 18), -10),
          durationHours: 4,
          status: AppointmentStatus.COMPLETED,
          staffIndexes: [2],
          createAiInsight: false,
        },
        {
          startTime: addDays(addHours(startOfDay(now), 18), 4),
          durationHours: 4,
          status: AppointmentStatus.SCHEDULED,
          staffIndexes: [2],
          createAiInsight: false,
        },
      ],
    },
    {
      clientId: clients[2]?.id,
      title: "Deep Clean with Follow-up",
      type: JobType.ONE_OFF,
      isAnytime: false,
      visitInstructions:
        "Client works from home. Start upstairs, then do kitchen once lunch is finished.",
      lineItems: [
        { name: "Deep clean package", quantity: 1, unitCost: 120, unitPrice: 285, description: "Extended bathrooms, kitchen, baseboards" },
        { name: "Inside fridge cleaning", quantity: 1, unitCost: 18, unitPrice: 45, description: "Shelves and bins" },
      ],
      notes: [
        {
          title: "Cleaning focus",
          content: "Stove hood and shower grout need extra time.",
          category: JobNoteCategory.CLEANING,
          isClientVisible: true,
          isPinned: false,
        },
      ],
      recurrence: null,
      appointments: [
        {
          startTime: addDays(addHours(startOfDay(now), 10), -2),
          durationHours: 5,
          status: AppointmentStatus.LATE,
          staffIndexes: [1, 2],
          createAiInsight: false,
        },
      ],
    },
    {
      clientId: clients[3]?.id,
      title: "Move-Out Turnover Cleaning",
      type: JobType.ONE_OFF,
      isAnytime: false,
      visitInstructions:
        "Unit will be vacant. Realtor lockbox code will be sent same morning.",
      lineItems: [
        { name: "Move-out cleaning", quantity: 1, unitCost: 130, unitPrice: 320, description: "Full turnover standard" },
        { name: "Inside oven cleaning", quantity: 1, unitCost: 24, unitPrice: 55, description: "Heavy grease build-up expected" },
        { name: "Window interior cleaning", quantity: 1, unitCost: 20, unitPrice: 50, description: "Living room and bedrooms" },
      ],
      notes: [
        {
          title: "Supplies needed",
          content: "Bring scraper and extra degreaser.",
          category: JobNoteCategory.SUPPLIES,
          isClientVisible: false,
          isPinned: true,
        },
      ],
      recurrence: null,
      appointments: [
        {
          startTime: addDays(addHours(startOfDay(now), 8), 5),
          durationHours: 6,
          status: AppointmentStatus.SCHEDULED,
          staffIndexes: [0, 1, 2],
          createAiInsight: false,
        },
        {
          startTime: addDays(addHours(startOfDay(now), 8), 12),
          durationHours: 6,
          status: AppointmentStatus.CANCELLED,
          staffIndexes: [0, 2],
          createAiInsight: false,
        },
      ],
    },
  ];

  const extraTemplates: JobTemplate[] = Array.from({
    length: cfg.extraJobCount,
  }).map((_, index) => ({
        clientId: clients[(4 + index) % clients.length]?.id,
        title: `Extra Test Job ${index + 1}`,
        type: index % 2 === 0 ? JobType.ONE_OFF : JobType.RECURRING,
        isAnytime: index % 2 === 1,
        visitInstructions: "Seed-generated extra job for broader dashboard coverage.",
        lineItems: [
          {
            name: "Standard cleaning service",
            quantity: 1,
            unitCost: 70,
            unitPrice: 155,
            description: "General cleaning coverage",
          },
        ],
        notes: [],
        recurrence:
          index % 2 === 1
            ? {
                frequency: "WEEKLY",
                interval: 1,
                endType: "AFTER_OCCURRENCES",
                endsAfter: 8,
                endsOn: null,
              }
            : null,
        appointments: [
          {
            startTime: addDays(addHours(startOfDay(now), 11), 7 + index),
            durationHours: 3,
            status: AppointmentStatus.SCHEDULED,
            staffIndexes: [index % staff.length],
            createAiInsight: false,
          },
        ],
      }));

  const allTemplates = templates
    .filter((template): template is JobTemplate & { clientId: string } =>
      Boolean(template.clientId),
    )
    .concat(
      extraTemplates.filter(
        (template): template is JobTemplate & { clientId: string } =>
          Boolean(template.clientId),
      ),
    );

  for (const [jobIndex, template] of allTemplates.entries()) {
    const addressIds = addressMap.get(template.clientId);
    if (!addressIds?.length) continue;

    const job = await prisma.job.create({
      data: {
        title: template.title,
        type: template.type,
        clientId: template.clientId,
        addressId: addressIds[0],
        isAnytime: template.isAnytime,
        visitInstructions: template.visitInstructions,
      },
    });

    await prisma.jobLineItem.createMany({
      data: template.lineItems.map((item) => ({
        jobId: job.id,
        name: item.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        total: money(item.quantity * item.unitPrice),
        description: item.description,
      })),
    });

    for (const [noteIndex, note] of template.notes.entries()) {
      const createdNote = await prisma.jobNote.create({
        data: {
          jobId: job.id,
          title: note.title,
          content: note.content,
          category: note.category,
          isClientVisible: note.isClientVisible,
          isPinned: note.isPinned,
          createdById: staff[noteIndex % staff.length]?.id ?? null,
        },
      });

      await prisma.jobNoteImage.create({
        data: {
          noteId: createdNote.id,
          url: imageUrl(`job-note-${jobIndex}-${noteIndex}`),
          fileKey: `seed/job-note-${jobIndex}-${noteIndex}.jpg`,
        },
      });
    }

    if (template.recurrence) {
      await prisma.recurrence.create({
        data: {
          jobId: job.id,
          frequency: template.recurrence.frequency,
          interval: template.recurrence.interval,
          endType: template.recurrence.endType,
          endsAfter: template.recurrence.endsAfter,
          endsOn: template.recurrence.endsOn,
        },
      });
    }

    for (const [appointmentIndex, appt] of template.appointments.entries()) {
      const startTime = appt.startTime;
      const endTime = addHours(startTime, appt.durationHours);
      const staffIds = appt.staffIndexes
        .map((index) => staff[index]?.id)
        .filter((value): value is string => Boolean(value));

      const created = await prisma.appointment.create({
        data: {
          jobId: job.id,
          startTime,
          endTime,
          status: appt.status,
          completionSent: appt.status === AppointmentStatus.COMPLETED,
          reminder1dSent: appt.status !== AppointmentStatus.SCHEDULED,
          reminder3dSent: appt.status !== AppointmentStatus.SCHEDULED,
          reminder5dSent: appt.status !== AppointmentStatus.SCHEDULED,
          timeSpent:
            appt.status === AppointmentStatus.COMPLETED ||
            appt.status === AppointmentStatus.LATE
              ? appt.durationHours * 60 + 15
              : null,
          completedAt:
            appt.status === AppointmentStatus.COMPLETED
              ? addMinutes(endTime, 10)
              : null,
          assignments: {
            create: staffIds.map((staffId) => ({
              staffId,
              status:
                appt.status === AppointmentStatus.COMPLETED
                  ? AssignmentStatus.COMPLETED
                  : appt.status === AppointmentStatus.LATE
                    ? AssignmentStatus.ON_SITE
                    : appt.status === AppointmentStatus.CANCELLED
                      ? AssignmentStatus.PENDING
                      : AssignmentStatus.EN_ROUTE,
              plannedStart: addMinutes(startTime, -5),
              plannedEnd: addMinutes(endTime, 5),
              hourlyRateAtTime: hourlyRateMap.get(staffId) ?? 0,
              breakMinutes: appt.durationHours >= 4 ? 30 : 15,
              notes:
                appointmentIndex % 2 === 0
                  ? "Seed assignment note for dashboard testing."
                  : null,
            })),
          },
        },
      });

      createdAppointments.push({
        id: created.id,
        status: appt.status,
        startTime,
      });

      if (appt.status !== AppointmentStatus.CANCELLED) {
        await prisma.visitNote.createMany({
          data: [
            {
              appointmentId: created.id,
              content:
                appt.status === AppointmentStatus.SCHEDULED
                  ? "Pre-visit note: client requested extra focus on bathrooms."
                  : "Visit note: surfaces completed, garbage removed, and supplies restocked.",
              isClientVisible: true,
              createdById: staffIds[0] ?? null,
            },
            {
              appointmentId: created.id,
              content:
                appt.status === AppointmentStatus.LATE
                  ? "Team started late due to previous job overrun."
                  : "Internal note: parking and building access were straightforward.",
              isClientVisible: false,
              createdById: staffIds[0] ?? null,
            },
          ],
        });

        await prisma.appointmentImage.createMany({
          data: [
            {
              appointmentId: created.id,
              url: imageUrl(`appointment-before-${jobIndex}-${appointmentIndex}`),
              fileKey: `seed/appointment-before-${jobIndex}-${appointmentIndex}.jpg`,
            },
            {
              appointmentId: created.id,
              url: imageUrl(`appointment-after-${jobIndex}-${appointmentIndex}`),
              fileKey: `seed/appointment-after-${jobIndex}-${appointmentIndex}.jpg`,
            },
          ],
        });
      }

      if (
        (appt.status === AppointmentStatus.COMPLETED ||
          appt.status === AppointmentStatus.LATE) &&
        staffIds.length
      ) {
        await prisma.appointmentWorkSession.createMany({
          data: staffIds.map((staffId) => ({
            appointmentId: created.id,
            staffId,
            startedAt: addMinutes(startTime, 5),
            endedAt:
              appt.status === AppointmentStatus.COMPLETED
                ? addMinutes(endTime, -10)
                : null,
          })),
        });
      }

      if (appt.createAiInsight) {
        await prisma.appointmentAiInsight.create({
          data: {
            appointmentId: created.id,
            type: "task_assistant.plan",
            model: "gpt-5-mini",
            promptVersion: "task_assistant_v2",
            payload: {
              brief:
                "Routine residential clean with a predictable scope. Bathrooms and kitchen should be completed first to keep the visit on track.",
              priorityOrder: [
                "Bathrooms and mirrors",
                "Kitchen counters and appliances",
                "Dusting and touchpoint sanitizing",
                "Vacuum and mop all floors",
              ],
              timePlan: [
                { label: "Bathrooms", minutes: 45 },
                { label: "Kitchen", minutes: 50 },
                { label: "Living areas and bedrooms", minutes: 55 },
                { label: "Final floor pass and check", minutes: 30 },
              ],
              alerts: [
                "Use unscented products only.",
                "Client prefers one staff member to announce arrival.",
              ],
              checklist: [
                "Confirm access and parking before entry",
                "Complete bathrooms before client meeting block",
                "Change primary bedroom linens",
                "Upload after photos before marking complete",
              ],
              riskLevel: "low",
              riskReason:
                "Scope matches the scheduled duration and the property has clear access instructions.",
              completionDraft: null,
            },
          },
        });
      }
    }
  }

  return createdAppointments;
}

async function createLeaves(staff: SeedUser[]) {
  const now = startOfDay(new Date());

  await prisma.leave.createMany({
    data: [
      {
        staffId: staff[0]?.id ?? "",
        type: LeaveType.VACATION,
        startAt: addDays(now, 14),
        endAt: endOfDay(addDays(now, 16)),
        reason: "Planned vacation",
      },
      {
        staffId: staff[1]?.id ?? staff[0]?.id ?? "",
        type: LeaveType.PAID_SICK,
        startAt: addDays(now, -9),
        endAt: endOfDay(addDays(now, -8)),
        reason: "Recovered from flu",
      },
    ].filter((row) => row.staffId),
  });
}

async function createTimesheetsAndPayroll(staff: SeedUser[], admin: SeedUser) {
  const profiles = await prisma.staffProfile.findMany({
    where: { userId: { in: staff.map((member) => member.id) } },
    select: { userId: true, hourlyRate: true },
  });

  const hourlyRateMap = new Map(
    profiles.map((profile) => [profile.userId, profile.hourlyRate]),
  );

  const firstPeriod = await prisma.timesheetPeriod.create({
    data: {
      startDate: startOfDay(addDays(new Date(), -28)),
      endDate: endOfDay(addDays(new Date(), -15)),
      status: TimesheetPeriodStatus.LOCKED,
      lockedAt: addDays(new Date(), -14),
    },
  });

  const secondPeriod = await prisma.timesheetPeriod.create({
    data: {
      startDate: startOfDay(addDays(new Date(), -14)),
      endDate: endOfDay(addDays(new Date(), -1)),
      status: TimesheetPeriodStatus.OPEN,
      lockedAt: null,
    },
  });

  for (const [index, member] of staff.entries()) {
    const hourlyRate = hourlyRateMap.get(member.id) ?? 24;

    const lockedTimesheet = await prisma.timesheet.create({
      data: {
        periodId: firstPeriod.id,
        staffId: member.id,
        status: TimesheetStatus.APPROVED,
        submittedAt: addDays(firstPeriod.endDate, 1),
        approvedAt: addDays(firstPeriod.endDate, 2),
        approvedById: admin.id,
        notes: "Seeded approved timesheet",
        days: {
          create: [0, 1, 2, 3, 4].map((dayOffset) => ({
            workDate: startOfDay(addDays(firstPeriod.startDate, dayOffset)),
            minutesWorked: 420 + index * 15,
            hourlyRate,
            notes: dayOffset === 2 ? "Deep clean day" : null,
          })),
        },
      },
      include: { days: true },
    });

    const gross = money(
      lockedTimesheet.days.reduce(
        (sum, day) => sum + (day.minutesWorked / 60) * (day.hourlyRate ?? hourlyRate),
        0,
      ),
    );
    const deductions = money(gross * 0.12);

    await prisma.payStatement.create({
      data: {
        userId: member.id,
        timesheetPeriodId: firstPeriod.id,
        payPeriodStart: firstPeriod.startDate,
        payPeriodEnd: firstPeriod.endDate,
        payDate: addDays(firstPeriod.endDate, 5),
        grossEarnings: gross,
        totalDeductions: deductions,
        netEarnings: money(gross - deductions),
        breakdown: {
          source: "seed",
          hourlyRate,
          deductionRate: 0.12,
        },
      },
    });

    await prisma.timesheet.create({
      data: {
        periodId: secondPeriod.id,
        staffId: member.id,
        status: index % 2 === 0 ? TimesheetStatus.SUBMITTED : TimesheetStatus.OPEN,
        submittedAt: index % 2 === 0 ? addDays(secondPeriod.endDate, 1) : null,
        notes: "Seeded open period timesheet",
        days: {
          create: [0, 1, 2].map((dayOffset) => ({
            workDate: startOfDay(addDays(secondPeriod.startDate, dayOffset)),
            minutesWorked: 360,
            hourlyRate,
            notes: null,
          })),
        },
      },
    });
  }
}

async function main() {
  console.log(`\n🌱 Eco Clean seed started in "${mode}" mode...\n`);

  await resetDatabase();

  const users = await createUsers();
  await createStaffProfiles(users.staff);
  const clientResult = await createClients();
  const appointments = await createJobsAndAppointments(
    clientResult.clients,
    clientResult.addressMap,
    users.staff,
  );
  await createLeaves(users.staff);
  await createTimesheetsAndPayroll(users.staff, users.admin);

  const counts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    jobs: await prisma.job.count(),
    appointments: await prisma.appointment.count(),
    assignments: await prisma.assignment.count(),
    visitNotes: await prisma.visitNote.count(),
    appointmentImages: await prisma.appointmentImage.count(),
    workSessions: await prisma.appointmentWorkSession.count(),
    leaves: await prisma.leave.count(),
    timesheetPeriods: await prisma.timesheetPeriod.count(),
    timesheets: await prisma.timesheet.count(),
    payStatements: await prisma.payStatement.count(),
    aiInsights: await prisma.appointmentAiInsight.count(),
  };

  console.log("✅ Seed completed successfully\n");
  console.table({
    mode,
    ...counts,
    completedAppointments: appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.COMPLETED,
    ).length,
    scheduledAppointments: appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.SCHEDULED,
    ).length,
    lateAppointments: appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.LATE,
    ).length,
    cancelledAppointments: appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.CANCELLED,
    ).length,
    loginPassword: DEFAULT_PASSWORD,
  });

  console.log("\nSeed accounts:");
  console.log("Admin:  admin1@ecoclean.local");
  console.log("Staff:  staff1@ecoclean.local");
  console.log("Staff:  staff2@ecoclean.local");
  console.log("Client: client1@ecoclean.local");
  console.log(`Password: ${DEFAULT_PASSWORD}\n`);
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

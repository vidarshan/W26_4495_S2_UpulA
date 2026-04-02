import "dotenv/config";
import { PrismaClient, Role, JobType, AppointmentStatus, AssignmentStatus, TimesheetStatus, TimesheetPeriodStatus, LeaveType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // -----------------------------
  // USERS
  // -----------------------------
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@eco-clean.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Staff User",
      email: "staff@eco-clean.com",
      password: hashedPassword,
      role: Role.STAFF,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      name: "Client User",
      email: "client@eco-clean.com",
      password: hashedPassword,
      role: Role.CLIENT,
    },
  });

  // -----------------------------
  // STAFF PROFILE + RELATED
  // -----------------------------
  const staffProfile = await prisma.staffProfile.create({
    data: {
      userId: staff.id,
      position: "Cleaner",
      hourlyRate: 25,
      staffAddress: {
        create: {
          street1: "123 Main St",
          city: "Surrey",
          province: "BC",
          country: "Canada",
        },
      },
      emergencyContact: {
        create: {
          name: "Jane Doe",
          phoneNumber: "1234567890",
          relationship: "Sister",
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

  // -----------------------------
  // CLIENT + NOTES + ADDRESS
  // -----------------------------
  const client = await prisma.client.create({
    data: {
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      phone: "9876543210",
      preferredContact: "EMAIL",
      notes: {
        create: {
          content: "VIP client",
        },
      },
      addresses: {
        create: {
          street1: "456 Client Ave",
          city: "Burnaby",
          province: "BC",
          postalCode: "V5C1A1",
          country: "Canada",
          isPrimary: true,
        },
      },
    },
    include: { addresses: true },
  });

  const address = client.addresses[0];

  // -----------------------------
  // JOB + RECURRENCE
  // -----------------------------
  const job = await prisma.job.create({
    data: {
      title: "House Cleaning",
      type: JobType.RECURRING,
      clientId: client.id,
      addressId: address.id,
      recurrence: {
        create: {
          frequency: "WEEKLY",
          interval: 1,
          endType: "AFTER",
          endsAfter: 10,
        },
      },
      lineItems: {
        create: {
          name: "Standard Cleaning",
          quantity: 1,
          unitPrice: 120,
        },
      },
      notes: {
        create: {
          content: "Client prefers eco products",
          createdById: admin.id,
        },
      },
    },
  });

  // -----------------------------
  // APPOINTMENT
  // -----------------------------
  const appointment = await prisma.appointment.create({
    data: {
      jobId: job.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: AppointmentStatus.COMPLETED,
      notes: {
        create: {
          content: "Job completed successfully",
          createdById: staff.id,
        },
      },
      images: {
        create: {
          url: "https://example.com/image.jpg",
        },
      },
    },
  });

  // -----------------------------
  // ASSIGNMENT
  // -----------------------------
  await prisma.assignment.create({
    data: {
      appointmentId: appointment.id,
      staffId: staff.id,
      status: AssignmentStatus.COMPLETED,
      plannedStart: appointment.startTime,
      plannedEnd: appointment.endTime,
      hourlyRateAtTime: 25,
    },
  });

  // -----------------------------
  // WORK SESSION
  // -----------------------------
  await prisma.appointmentWorkSession.create({
    data: {
      appointmentId: appointment.id,
      staffId: staff.id,
      startedAt: appointment.startTime,
      endedAt: appointment.endTime,
    },
  });

  // -----------------------------
  // LEAVE
  // -----------------------------
  await prisma.leave.create({
    data: {
      staffId: staff.id,
      type: LeaveType.VACATION,
      startAt: new Date(),
      endAt: new Date(Date.now() + 2 * 86400000),
      reason: "Vacation",
    },
  });

  // -----------------------------
  // TIMESHEET PERIOD
  // -----------------------------
  const period = await prisma.timesheetPeriod.create({
    data: {
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-14"),
      status: TimesheetPeriodStatus.OPEN,
    },
  });

  // -----------------------------
  // TIMESHEET
  // -----------------------------
  const timesheet = await prisma.timesheet.create({
    data: {
      periodId: period.id,
      staffId: staff.id,
      status: TimesheetStatus.APPROVED,
      submittedAt: new Date(),
      approvedAt: new Date(),
      approvedById: admin.id,
      days: {
        create: {
          workDate: new Date(),
          minutesWorked: 120,
          hourlyRate: 25,
        },
      },
    },
  });

  // -----------------------------
  // PAY STATEMENT
  // -----------------------------
  await prisma.payStatement.create({
    data: {
      userId: staff.id,
      timesheetPeriodId: period.id,
      payPeriodStart: period.startDate,
      payPeriodEnd: period.endDate,
      payDate: new Date(),
      grossEarnings: 50,
      totalDeductions: 10,
      netEarnings: 40,
      breakdown: {
        cpp: 5,
        ei: 2,
        tax: 3,
      },
    },
  });

  // -----------------------------
  // AI INSIGHT
  // -----------------------------
  await prisma.appointmentAiInsight.create({
    data: {
      appointmentId: appointment.id,
      type: "SUMMARY",
      payload: {
        note: "Cleaning completed efficiently",
      },
    },
  });

  console.log("✅ FULL seed completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
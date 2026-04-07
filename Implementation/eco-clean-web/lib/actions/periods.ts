'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Generates biweekly pay periods for a specific year.
 * - This function is strictly 'Run Once' per year.
 */
export async function generateBiweeklyPeriods(year: number) {
  try {
    // 1. STRICT RUN-ONCE CHECK: Look for any existing periods in the target year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const existingCount = await prisma.timesheetPeriod.count({
      where: {
        startDate: { gte: yearStart },
        endDate: { lte: yearEnd },
      },
    });

    if (existingCount > 0) {
      return {
        success: false,
        error: `Generation blocked: ${existingCount} periods already exist for the year ${year}.`
      };
    }

    const periods = [];
    let currentStart = new Date(year, 0, 1);

    // 2. Find the 1st period's end date (The 2nd Saturday of January)
    const firstPeriodEnd = new Date(year, 0, 1);
    let saturdaysFound = 0;

    while (saturdaysFound < 2) {
      if (firstPeriodEnd.getDay() === 6) { // 6 is Saturday
        saturdaysFound++;
      }
      if (saturdaysFound < 2) {
        firstPeriodEnd.setDate(firstPeriodEnd.getDate() + 1);
      }
    }

    // Add the first period
    periods.push({
      startDate: new Date(currentStart),
      endDate: new Date(firstPeriodEnd),
    });

    // 3. Loop to generate biweekly periods
    currentStart = new Date(firstPeriodEnd);
    currentStart.setDate(currentStart.getDate() + 1);

    while (currentStart <= yearEnd) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 13); // Add 14 days (biweekly)

      // Ensure we don't go past Dec 31st
      if (currentEnd > yearEnd) {
        currentEnd = new Date(yearEnd);
      }

      periods.push({
        startDate: new Date(currentStart),
        endDate: new Date(currentEnd),
      });

      // Move to next start date
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    // 4. BATCH SAVE: Use a transaction to ensure all periods are created together
    await prisma.$transaction(
      periods.map((p) =>
        prisma.timesheetPeriod.create({
          data: {
            startDate: p.startDate,
            endDate: p.endDate,
            status: "OPEN",
          },
        })
      )
    );

    // Refresh the admin dashboard view
    revalidatePath('/admin/pay-periods');

    return {
      success: true,
      count: periods.length
    };

  } catch (error) {
    console.error("Critical error generating periods:", error);
    return {
      success: false,
      error: "A system error occurred. Please check logs."
    };
  }
}

import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getAuthSession();

  console.log('session:', session);
  console.log('session user id:', session?.user?.id);
  console.log('session user role:', session?.user?.role);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const staffMember = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      staffProfile: {
        select: {
          id: true,
          staffId: true,
          position: true,
          hourlyRate: true,
          staffAddress: {
            select: {
              street1: true,
              postalCode: true,
            },
          },
          emergencyContact: {
            select: {
              name: true,
              phoneNumber: true,
              relationship: true,
            },
          },
        },
      },
    },
  });

  if (!staffMember || staffMember.role !== 'STAFF') {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }

  return NextResponse.json(staffMember);
}

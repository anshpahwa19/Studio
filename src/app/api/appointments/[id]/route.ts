import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        staff: true,
        services: {
          include: { service: true },
        },
        invoice: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, date, startTime, notes, staffId } = body;

    const current = await prisma.appointment.findUnique({
      where: { id: params.id },
    });

    if (!current) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (status) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Handle rescheduling or reassigning staff
    if ((date && date !== current.date.toISOString()) || (startTime && startTime !== current.startTime) || (staffId && staffId !== current.staffId)) {
      const targetDate = date ? parseISO(date) : current.date;
      const targetStartTime = startTime || current.startTime;
      const targetStaffId = staffId || current.staffId;

      const startMinutes = timeToMinutes(targetStartTime);
      const endMinutes = startMinutes + current.totalDuration;
      const targetEndTime = minutesToTime(endMinutes);

      // Check conflict
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);

      const conflicts = await prisma.appointment.findMany({
        where: {
          id: { not: params.id },
          staffId: targetStaffId,
          date: { gte: dayStart, lte: dayEnd },
          status: { notIn: ['Cancelled', 'NoShow'] },
        },
      });

      for (const exist of conflicts) {
        const existStart = timeToMinutes(exist.startTime);
        const existEnd = timeToMinutes(exist.endTime);
        if (startMinutes < existEnd && endMinutes > existStart) {
          return NextResponse.json(
            {
              success: false,
              error: `Conflict: Staff member already booked from ${exist.startTime} to ${exist.endTime}`,
            },
            { status: 409 }
          );
        }
      }

      updateData.date = targetDate;
      updateData.startTime = targetStartTime;
      updateData.endTime = targetEndTime;
      updateData.staffId = targetStaffId;
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        staff: true,
        services: {
          include: { service: true },
        },
        invoice: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Appointment cancelled' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel appointment' },
      { status: 500 }
    );
  }
}

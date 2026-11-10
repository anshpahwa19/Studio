import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO, addMinutes, format } from 'date-fns';

// Helper to convert "HH:mm" to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes since midnight to "HH:mm"
function minutesToTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');

    const where: any = {};

    if (dateStr) {
      const d = parseISO(dateStr);
      where.date = {
        gte: startOfDay(d),
        lte: endOfDay(d),
      };
    } else if (startDateStr && endDateStr) {
      where.date = {
        gte: startOfDay(parseISO(startDateStr)),
        lte: endOfDay(parseISO(endDateStr)),
      };
    }

    if (staffId && staffId !== 'all') {
      where.staffId = staffId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        staff: true,
        services: {
          include: {
            service: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ success: true, data: appointments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, staffId, date, startTime, serviceIds, notes, isWalkIn } = body;

    if (!customerId || !staffId || !date || !startTime || !serviceIds || !serviceIds.length) {
      return NextResponse.json(
        { success: false, error: 'Customer, Staff, Date, Start Time and at least one Service are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch selected services to get durations and prices
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
      },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more selected services are invalid' },
        { status: 400 }
      );
    }

    // 2. Calculate total duration in minutes
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

    // 3. Compute endTime
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totalDuration;
    const endTime = minutesToTime(endMinutes);

    const appointmentDate = parseISO(date);
    const dayStart = startOfDay(appointmentDate);
    const dayEnd = endOfDay(appointmentDate);

    // 4. Double booking prevention: Check if staff member already has an overlapping appointment
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        staffId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { notIn: ['Cancelled', 'NoShow'] },
      },
    });

    for (const existing of conflictingAppointments) {
      const existStart = timeToMinutes(existing.startTime);
      const existEnd = timeToMinutes(existing.endTime);

      // Overlap occurs if (startA < endB) and (endA > startB)
      if (startMinutes < existEnd && endMinutes > existStart) {
        return NextResponse.json(
          {
            success: false,
            error: `Staff scheduling conflict: Staff already has an appointment from ${existing.startTime} to ${existing.endTime} on this day.`,
          },
          { status: 409 }
        );
      }
    }

    // 5. Create Appointment with AppointmentServices in a transaction
    const appointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          customerId,
          staffId,
          date: appointmentDate,
          startTime,
          endTime,
          totalDuration,
          status: 'Confirmed',
          notes: notes || null,
          isWalkIn: Boolean(isWalkIn),
        },
      });

      for (const svc of services) {
        await tx.appointmentService.create({
          data: {
            appointmentId: appt.id,
            serviceId: svc.id,
            staffId,
            price: svc.price,
            duration: svc.duration,
          },
        });
      }

      // Increment customer visit count
      await tx.customer.update({
        where: { id: customerId },
        data: {
          visitCount: { increment: 1 },
          lastVisitAt: appointmentDate,
        },
      });

      return appt;
    });

    const fullAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        customer: true,
        staff: true,
        services: {
          include: { service: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: fullAppointment }, { status: 201 });
  } catch (error: any) {
    console.error('Create Appointment Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create appointment' },
      { status: 500 }
    );
  }
}

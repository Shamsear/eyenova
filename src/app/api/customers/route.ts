import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    const where: any = {};
    if (q) {
      where.OR = [
        { phone: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      take: 500,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        storeCreditQar: true,
        tag: true,
      },
    });

    const formatted = customers.map((c) => ({
      ...c,
      storeCreditQar: Number(c.storeCreditQar || 0),
    }));

    return NextResponse.json({ customers: formatted });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, fullName, email } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    // Check if customer already exists by phone
    let customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (customer) {
      // Update customer name if provided
      if (fullName && customer.fullName !== fullName) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { fullName: fullName.trim(), email: email ? email.trim() : customer.email },
        });
      }
    } else {
      customer = await prisma.customer.create({
        data: {
          id: `CUST_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          phone: cleanPhone,
          fullName: fullName ? fullName.trim() : 'Walk-in Customer',
          email: email ? email.trim() : null,
        },
      });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: error.message || 'Failed to create customer' }, { status: 500 });
  }
}

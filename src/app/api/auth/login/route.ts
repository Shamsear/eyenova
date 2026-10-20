import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPin, getUserInitials, getRoleBadge } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pinCode, storeId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Please select an operator profile' }, { status: 400 });
    }
    if (!pinCode) {
      return NextResponse.json({ error: 'Please enter your security PIN code' }, { status: 400 });
    }

    const user = await prisma.userAccount.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'User account not found or inactive' }, { status: 404 });
    }

    // Check server-side lockout
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const remainingSec = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Account locked due to failed attempts. Try again in ${remainingSec}s.` },
        { status: 429 }
      );
    }

    // Verify PIN
    const isValid = verifyPin(pinCode, user.pinCode);

    if (!isValid) {
      const newAttempts = (user.failedAttempts || 0) + 1;
      let lockedUntil: Date | null = null;
      let errorMsg = `Invalid PIN code. Attempt ${newAttempts} of 5.`;

      if (newAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 60 * 1000); // 60s lockout
        errorMsg = 'Too many failed attempts. Terminal locked for 60s.';
      }

      await prisma.userAccount.update({
        where: { id: userId },
        data: {
          failedAttempts: newAttempts,
          lockedUntil,
        },
      });

      // Audit log failed attempt
      try {
        await prisma.auditLog.create({
          data: {
            id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action: 'LOGIN_FAILED',
            userId: user.id,
            cashierName: user.fullName,
            storeId: storeId || user.storeId || 'STORE-MAIN',
            details: `Failed PIN attempt #${newAttempts} for user ${user.fullName}`,
            timestamp: new Date(),
          },
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }

      return NextResponse.json({ error: errorMsg, failedAttempts: newAttempts }, { status: 401 });
    }

    // Reset failed attempts upon successful login
    await prisma.userAccount.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    // Fetch store info
    const resolvedStoreId = user.role === 'SUPER_ADMIN' ? storeId || 'STORE-MAIN' : user.storeId || storeId || 'STORE-MAIN';
    let store = await prisma.store.findUnique({
      where: { id: resolvedStoreId },
    });
    if (!store) {
      store = await prisma.store.findFirst({ where: { isActive: true } });
    }

    // Audit log successful login
    try {
      await prisma.auditLog.create({
        data: {
          id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          action: 'LOGIN_SUCCESS',
          userId: user.id,
          cashierName: user.fullName,
          storeId: store?.id || 'STORE-MAIN',
          details: `Staff ${user.fullName} unlocked station at ${store?.name || '02 Mall, Al Kheesa'}`,
          timestamp: new Date(),
        },
      });
    } catch (logErr) {
      console.warn('Audit log write error:', logErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleBadge: getRoleBadge(user.role),
        initials: getUserInitials(user.fullName),
        storeId: user.storeId,
        storeName: store?.name || '02 Mall, Al Kheesa',
      },
      store: store
        ? {
            id: store.id,
            name: store.name,
            code: store.code,
            address: store.address,
            phone: store.phone,
            isActive: store.isActive,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

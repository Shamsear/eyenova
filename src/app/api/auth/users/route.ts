import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserInitials, getRoleBadge } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [users, stores] = await Promise.all([
      prisma.userAccount.findMany({
        where: { isActive: true },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          storeId: true,
        },
      }),
      prisma.store.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          isActive: true,
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const store = stores.find((s) => s.id === u.storeId);
      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        roleBadge: getRoleBadge(u.role),
        initials: getUserInitials(u.fullName),
        storeId: u.storeId,
        storeName: u.role === 'SUPER_ADMIN' ? 'All Stores (Enterprise)' : store?.name || '02 Mall, Al Kheesa',
      };
    });

    return NextResponse.json({
      users: formattedUsers,
      stores,
    });
  } catch (error: any) {
    console.error('Error fetching auth users:', error);
    return NextResponse.json({ error: error.message || 'Failed to load operators' }, { status: 500 });
  }
}

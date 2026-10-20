import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let profile = await prisma.companyProfile.findFirst();

    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: {
          nameEn: 'EyeNova Optical - 02 Mall, Al Kheesa',
          nameAr: 'آي نوفا للتجارة البصرية',
          phone: '+974 6633 7371',
          addressEn: '02 Mall, 79 Street 773, Al Kheesa',
          currency: 'QAR',
          taxRate: 0,
          website: 'eyenova.com.qa',
        },
      });
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        nameEn: profile.nameEn,
        nameAr: profile.nameAr || '',
        email: profile.email || '',
        phone: profile.phone || '',
        addressEn: profile.addressEn || '',
        addressAr: profile.addressAr || '',
        crNumber: profile.crNumber || '',
        vatNumber: profile.vatNumber || '',
        currency: profile.currency || 'QAR',
        taxRate: Number(profile.taxRate || 0),
        website: profile.website || 'eyenova.com.qa',
        invoiceFooter: profile.invoiceFooter || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching company profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nameEn,
      nameAr,
      email,
      phone,
      addressEn,
      addressAr,
      crNumber,
      vatNumber,
      currency,
      taxRate,
      website,
      invoiceFooter,
    } = body;

    let profile = await prisma.companyProfile.findFirst();

    if (profile) {
      profile = await prisma.companyProfile.update({
        where: { id: profile.id },
        data: {
          nameEn: nameEn?.trim() || profile.nameEn,
          nameAr: nameAr?.trim() || profile.nameAr,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          addressEn: addressEn?.trim() || null,
          addressAr: addressAr?.trim() || null,
          crNumber: crNumber?.trim() || null,
          vatNumber: vatNumber?.trim() || null,
          currency: currency || profile.currency,
          taxRate: taxRate !== undefined ? parseFloat(taxRate) || 0 : profile.taxRate,
          website: website?.trim() || profile.website,
          invoiceFooter: invoiceFooter?.trim() || null,
        },
      });
    } else {
      profile = await prisma.companyProfile.create({
        data: {
          nameEn: nameEn?.trim() || 'EyeNova Optical - 02 Mall, Al Kheesa',
          nameAr: nameAr?.trim() || 'آي نوفا للتجارة البصرية',
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          addressEn: addressEn?.trim() || null,
          addressAr: addressAr?.trim() || null,
          crNumber: crNumber?.trim() || null,
          vatNumber: vatNumber?.trim() || null,
          currency: currency || 'QAR',
          taxRate: taxRate !== undefined ? parseFloat(taxRate) || 0 : 0,
          website: website?.trim() || 'eyenova.com.qa',
          invoiceFooter: invoiceFooter?.trim() || null,
        },
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error saving company profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}

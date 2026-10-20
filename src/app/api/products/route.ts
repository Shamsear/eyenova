import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim() || 'ALL';
    const brand = searchParams.get('brand')?.trim() || '';
    const inStockOnly = searchParams.get('inStock') === 'true' || searchParams.get('inStockOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '500', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (inStockOnly) {
      where.stockQuantity = { gt: 0 };
    }

    if (q) {
      where.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleAr: { contains: q, mode: 'insensitive' } },
        { brandName: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'ALL') {
      where.productType = category;
    }

    if (brand && brand !== 'ALL') {
      where.brandName = { equals: brand, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ stockQuantity: 'desc' }, { titleEn: 'asc' }],
        select: {
          id: true,
          sku: true,
          barcode: true,
          productType: true,
          titleEn: true,
          titleAr: true,
          brandName: true,
          collectionName: true,
          basePriceQar: true,
          salePriceQar: true,
          costPriceQar: true,
          stockQuantity: true,
          minStockAlert: true,
          lensDuration: true,
          packSize: true,
          colorNameEn: true,
          colorHex: true,
          hasPrescription: true,
          hasPlanoOption: true,
          availablePowers: true,
          imageUrl: true,
          power: true,
          cylinder: true,
          axis: true,
          addPower: true,
          baseCurve: true,
          diameter: true,
          waterContent: true,
          material: true,
          replacementSchedule: true,
          batches: {
            where: { quantity: { gt: 0 } },
            select: {
              id: true,
              batchNumber: true,
              power: true,
              cylinder: true,
              axis: true,
              addPower: true,
              quantity: true,
              expiryDate: true,
            },
            take: 200,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map((p) => {
      let powers: string[] = [];
      if (Array.isArray(p.availablePowers)) {
        powers = p.availablePowers as string[];
      } else if (typeof p.availablePowers === 'string') {
        try {
          powers = JSON.parse(p.availablePowers);
        } catch {
          powers = [];
        }
      }

      const pType = p.productType || '';
      const isContactLens =
        pType.includes('CONTACT_LENSES') ||
        pType.includes('LENS');

      // Resolve effective optical specifications
      const firstBatchWithPower = p.batches?.find((b) => b.power);
      const activePower = p.power !== null && p.power !== undefined
        ? String(p.power)
        : (firstBatchWithPower?.power || (p.hasPlanoOption ? '0.00' : (powers[0] || null)));

      const activeCyl = p.cylinder !== null && p.cylinder !== undefined
        ? String(p.cylinder)
        : (p.batches?.find((b) => b.cylinder)?.cylinder || null);

      const activeAxis = p.axis !== null && p.axis !== undefined
        ? p.axis
        : (p.batches?.find((b) => b.axis)?.axis || null);

      const activeAdd = p.addPower || (p.batches?.find((b) => b.addPower)?.addPower || null);

      return {
        ...p,
        power: activePower,
        cylinder: activeCyl,
        axis: activeAxis,
        addPower: activeAdd,
        batches: (p.batches || []).map((b) => ({
          ...b,
          expiryDate: b.expiryDate ? b.expiryDate.toISOString() : null,
        })),
        imageUrl: p.imageUrl || null,
        basePriceQar: Number(p.basePriceQar),
        salePriceQar: p.salePriceQar ? Number(p.salePriceQar) : null,
        costPriceQar: Number(p.costPriceQar || 100),
        availablePowers: powers,
        requiresOpticalSpecs: isContactLens || pType === 'SPECTACLES',
      };
    });

    return NextResponse.json({
      products: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      titleEn,
      titleAr,
      brandName,
      productType,
      sku,
      barcode,
      imageUrl,
      salePriceQar,
      basePriceQar,
      costPriceQar,
      stockQuantity,
      minStockAlert,
      baseCurve,
      diameter,
      waterContent,
      material,
      replacementSchedule,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (titleEn !== undefined) data.titleEn = titleEn.trim();
    if (titleAr !== undefined) data.titleAr = titleAr ? titleAr.trim() : null;
    if (brandName !== undefined) data.brandName = brandName ? brandName.trim() : null;
    if (productType !== undefined) data.productType = productType;
    if (sku !== undefined) data.sku = sku.trim();
    if (barcode !== undefined) data.barcode = barcode ? barcode.trim() : null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (salePriceQar !== undefined) data.salePriceQar = parseFloat(salePriceQar) || 0;
    if (basePriceQar !== undefined) data.basePriceQar = parseFloat(basePriceQar) || 0;
    if (costPriceQar !== undefined) data.costPriceQar = parseFloat(costPriceQar) || 0;
    if (stockQuantity !== undefined) data.stockQuantity = parseInt(stockQuantity, 10) || 0;
    if (minStockAlert !== undefined) data.minStockAlert = parseInt(minStockAlert, 10) || 3;
    if (baseCurve !== undefined) data.baseCurve = baseCurve ? parseFloat(baseCurve) : null;
    if (diameter !== undefined) data.diameter = diameter ? parseFloat(diameter) : null;
    if (waterContent !== undefined) data.waterContent = waterContent ? waterContent.trim() : null;
    if (material !== undefined) data.material = material ? material.trim() : null;
    if (replacementSchedule !== undefined) data.replacementSchedule = replacementSchedule ? replacementSchedule.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      titleEn,
      titleAr,
      brandName,
      productType = 'COLORED_CONTACT_LENSES',
      sku,
      barcode,
      imageUrl,
      salePriceQar = 0,
      basePriceQar = 0,
      costPriceQar = 0,
      stockQuantity = 0,
      minStockAlert = 3,
      baseCurve,
      diameter,
      waterContent,
      material,
      replacementSchedule,
    } = body;

    if (!titleEn || !titleEn.trim()) {
      return NextResponse.json({ error: 'Product title (English) is required' }, { status: 400 });
    }

    const finalSku = sku && sku.trim() ? sku.trim() : `EYE-${Date.now()}`;

    const created = await prisma.product.create({
      data: {
        id: `PROD-${Date.now()}`,
        sku: finalSku,
        barcode: barcode ? barcode.trim() : finalSku,
        titleEn: titleEn.trim(),
        titleAr: titleAr ? titleAr.trim() : null,
        brandName: brandName ? brandName.trim() : 'EyeNova',
        productType,
        salePriceQar: parseFloat(salePriceQar) || 0,
        basePriceQar: parseFloat(basePriceQar || salePriceQar) || 0,
        costPriceQar: parseFloat(costPriceQar) || 0,
        stockQuantity: parseInt(stockQuantity, 10) || 0,
        minStockAlert: parseInt(minStockAlert, 10) || 3,
        imageUrl: imageUrl || null,
        baseCurve: baseCurve ? parseFloat(baseCurve) : null,
        diameter: diameter ? parseFloat(diameter) : null,
        waterContent: waterContent ? waterContent.trim() : null,
        material: material ? material.trim() : null,
        replacementSchedule: replacementSchedule ? replacementSchedule.trim() : null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, product: created });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Soft-delete to preserve order history
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error deactivating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}


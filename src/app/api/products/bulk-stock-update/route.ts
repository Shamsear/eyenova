import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALL_SPHERES = [
  '0.00', '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00',
  '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75', '-4.00',
  '-4.25', '-4.50', '-4.75', '-5.00', '-5.25', '-5.50', '-5.75', '-6.00',
  '-6.50', '-7.00', '-7.50', '-8.00', '-8.50', '-9.00', '-9.50', '-10.00',
  '-10.50', '-11.00', '-11.50', '-12.00',
  '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00',
  '+2.25', '+2.50', '+2.75', '+3.00', '+3.50', '+4.00', '+4.50',
  '+5.00', '+5.50', '+6.00', '+7.00', '+8.00',
];

function cleanTitle(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[\-–—_,.\(\)]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bgrey\b/g, 'gray')
    .replace(/\boneday\b/g, 'one day')
    .replace(/\b1\s*day\b/g, 'one day')
    .replace(/\s*2\s*lenses\b/g, '')
    .replace(/\s*10\s*lenses\b/g, '')
    .trim();
}

const ALIASES: Record<string, string> = {
  'bella elite silky gray power': 'bella elite silky gray',
  'bella glow gray caramel': 'bella glow caramel gray',
  'bella glow radiant gray': 'bella glow radiant brown',
  'bella dye monthly nola': 'bella dye nola',
  'bella dye monthly silver lace': 'bella dye silver lace',
  'bella dye monthly star dust': 'bella dye stardust',
  'bella dye monthly stormy': 'bella dye stormy',
  'bella monthly moon': 'bella moon',
  'bella monthly saturn': 'bella saturn',
};

interface ExcelParsedRow {
  particulars: string;
  qtyRaw: unknown;
  baseName: string;
  power: string;
}

function parseExcelBuffer(buffer: Buffer): ExcelParsedRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const results: ExcelParsedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;
    const particulars = String(r[0] || '').trim();
    const qtyVal = r[1];

    if (!particulars || particulars.toLowerCase() === 'particulars' || particulars.toLowerCase().includes('total')) {
      continue;
    }

    // Split base name and power
    const match = particulars.match(/^(.*?)(?:[\s]+|(?<=[A-Za-z])[\-])([+\-]?(?:\d+(?:\.\d+)?|plano))\s*$/i);
    if (!match) continue;

    const baseName = match[1].trim();
    let pwr = match[2].trim();

    if (pwr.toLowerCase() === 'plano') {
      pwr = '0.00';
    } else {
      const num = parseFloat(pwr);
      if (!isNaN(num)) {
        pwr = num < 0 ? num.toFixed(2) : `+${num.toFixed(2)}`;
        if (pwr === '-0.00' || pwr === '+0.00') pwr = '0.00';
      }
    }

    results.push({
      particulars,
      qtyRaw: qtyVal,
      baseName,
      power: pwr,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = (formData.get('action') as string) || 'preview';
    const markUnlistedOos = formData.get('markUnlistedOos') !== 'false';
    const unlistedScope = (formData.get('unlistedScope') as string) || 'MATCHED_BRANDS'; // 'MATCHED_BRANDS' | 'ALL_CATALOG'
    const uploadedFile = formData.get('file') as File | null;

    let fileBuffer: Buffer | null = null;

    if (uploadedFile && uploadedFile.size > 0) {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Please select and upload an Excel (.xlsx or .xls) file.' },
        { status: 400 }
      );
    }

    // 1. Parse Excel file
    const parsedRows = parseExcelBuffer(fileBuffer);
    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: 'Excel file contained no valid rows with product particulars and quantities.' },
        { status: 400 }
      );
    }

    // 2. Fetch ALL active products from database (not just Bella!)
    const dbAllProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        titleEn: true,
        brandName: true,
        productType: true,
        shopifyProductId: true,
        availablePowers: true,
        tags: true,
        hasPlanoOption: true,
        hasPrescription: true,
        stockQuantity: true,
      },
      orderBy: { titleEn: 'asc' },
    });

    const dbIndexed = dbAllProducts.map((p) => {
      const brand = (p.brandName || '').toLowerCase().trim();
      const normTitle = cleanTitle(p.titleEn);
      const noBrand = brand ? cleanTitle(p.titleEn.replace(new RegExp(`^${brand}\\s+`, 'i'), '')) : normTitle;
      return {
        ...p,
        brandLower: brand,
        normTitle,
        noBrand,
      };
    });

    // 3. Match rows against all DB products
    const productMap = new Map<
      string,
      {
        product: (typeof dbAllProducts)[0];
        activePowers: Set<string>;
      }
    >();

    const unmatchedRows: { particulars: string; qty: unknown; baseName: string; power: string }[] = [];
    const detectedBrands = new Set<string>();
    let matchedRowCount = 0;

    for (const row of parsedRows) {
      let baseNorm = cleanTitle(row.baseName);
      if (ALIASES[baseNorm]) {
        baseNorm = ALIASES[baseNorm];
      }

      // Priority 1: Exact match on normalized full title
      let found = dbIndexed.find((p) => p.normTitle === baseNorm);

      // Priority 2: Match without brand name prefix
      if (!found) {
        found = dbIndexed.find((p) => {
          if (p.brandLower && baseNorm.startsWith(p.brandLower)) {
            const rowNoBrand = cleanTitle(baseNorm.replace(new RegExp(`^${p.brandLower}\\s+`, 'i'), ''));
            return p.noBrand === rowNoBrand;
          }
          return false;
        });
      }

      // Priority 3: Fallback fuzzy match
      if (!found) {
        found = dbIndexed.find(
          (p) =>
            p.normTitle.includes(baseNorm) ||
            (baseNorm.length > 6 && baseNorm.includes(p.normTitle)) ||
            (p.noBrand.length > 5 && (baseNorm.includes(p.noBrand) || p.noBrand.includes(baseNorm)))
        );
      }

      if (found) {
        matchedRowCount++;
        if (found.brandName?.trim()) {
          detectedBrands.add(found.brandName.trim());
        }

        if (!productMap.has(found.id)) {
          productMap.set(found.id, {
            product: found,
            activePowers: new Set<string>(),
          });
        }
        productMap.get(found.id)!.activePowers.add(row.power);
      } else {
        unmatchedRows.push({
          particulars: row.particulars,
          qty: row.qtyRaw,
          baseName: row.baseName,
          power: row.power,
        });
      }
    }

    // 4. Construct product availability plan with Before & After comparisons
    const productsPlan: Array<{
      productId: string;
      shopifyProductId: string | null;
      titleEn: string;
      sku: string;
      brandName: string | null;
      productType: string | null;
      isUnlisted: boolean;
      // Before state
      beforeActivePowers: string[];
      beforeActivePowersCount: number;
      beforeHasPlano: boolean;
      beforeHasRx: boolean;
      // After state
      activePowers: string[];
      oosPowers: string[];
      activePowersCount: number;
      oosPowersCount: number;
      hasPlano: boolean;
      hasRx: boolean;
      // Diff
      addedPowers: string[];
      removedPowers: string[];
      unchangedPowers: string[];
      hasChanges: boolean;
      existingStockQty: number;
    }> = [];

    const matchedProductIds = new Set<string>();

    for (const [id, entry] of productMap.entries()) {
      matchedProductIds.add(id);

      const beforeActivePowers = entry.product.availablePowers || [];
      const beforeActivePowersCount = beforeActivePowers.length;
      const beforeHasPlano = Boolean(entry.product.hasPlanoOption || beforeActivePowers.includes('0.00'));
      const beforeHasRx = Boolean(entry.product.hasPrescription || beforeActivePowers.some((p) => p !== '0.00'));

      const activeList = Array.from(entry.activePowers);
      const oosList = ALL_SPHERES.filter((p) => !entry.activePowers.has(p));
      const hasPlano = entry.activePowers.has('0.00');
      const hasRx = activeList.some((p) => p !== '0.00');

      const beforeSet = new Set(beforeActivePowers);
      const afterSet = entry.activePowers;

      const addedPowers = activeList.filter((p) => !beforeSet.has(p));
      const removedPowers = beforeActivePowers.filter((p) => !afterSet.has(p));
      const unchangedPowers = activeList.filter((p) => beforeSet.has(p));
      const hasChanges =
        addedPowers.length > 0 ||
        removedPowers.length > 0 ||
        beforeHasPlano !== hasPlano ||
        beforeHasRx !== hasRx;

      productsPlan.push({
        productId: entry.product.id,
        shopifyProductId: entry.product.shopifyProductId ? entry.product.shopifyProductId.toString() : null,
        titleEn: entry.product.titleEn,
        sku: entry.product.sku,
        brandName: entry.product.brandName,
        productType: entry.product.productType,
        isUnlisted: false,
        beforeActivePowers,
        beforeActivePowersCount,
        beforeHasPlano,
        beforeHasRx,
        activePowers: activeList,
        oosPowers: oosList,
        activePowersCount: activeList.length,
        oosPowersCount: oosList.length,
        hasPlano,
        hasRx,
        addedPowers,
        removedPowers,
        unchangedPowers,
        hasChanges,
        existingStockQty: entry.product.stockQuantity || 0,
      });
    }

    // 5. Handle unlisted products
    if (markUnlistedOos) {
      for (const p of dbAllProducts) {
        if (matchedProductIds.has(p.id)) continue;

        const pBrand = p.brandName?.trim() || '';
        const isMatchedBrand = detectedBrands.has(pBrand);

        // Include unlisted product if it belongs to a detected brand, or if user selected entire catalog
        if (unlistedScope === 'ALL_CATALOG' || isMatchedBrand) {
          const beforeActivePowers = p.availablePowers || [];
          const beforeActivePowersCount = beforeActivePowers.length;
          const beforeHasPlano = Boolean(p.hasPlanoOption || beforeActivePowers.includes('0.00'));
          const beforeHasRx = Boolean(p.hasPrescription || beforeActivePowers.some((pow) => pow !== '0.00'));

          const addedPowers: string[] = [];
          const removedPowers = [...beforeActivePowers];
          const unchangedPowers: string[] = [];
          const hasChanges = beforeActivePowersCount > 0 || beforeHasPlano;

          productsPlan.push({
            productId: p.id,
            shopifyProductId: p.shopifyProductId ? p.shopifyProductId.toString() : null,
            titleEn: p.titleEn,
            sku: p.sku,
            brandName: p.brandName,
            productType: p.productType,
            isUnlisted: true,
            beforeActivePowers,
            beforeActivePowersCount,
            beforeHasPlano,
            beforeHasRx,
            activePowers: [],
            oosPowers: [...ALL_SPHERES],
            activePowersCount: 0,
            oosPowersCount: ALL_SPHERES.length,
            hasPlano: false,
            hasRx: false,
            addedPowers,
            removedPowers,
            unchangedPowers,
            hasChanges,
            existingStockQty: p.stockQuantity || 0,
          });
        }
      }
    }

    // Sort products by brand, then title
    productsPlan.sort((a, b) => {
      const bComp = (a.brandName || '').localeCompare(b.brandName || '');
      if (bComp !== 0) return bComp;
      return a.titleEn.localeCompare(b.titleEn);
    });

    // Summary calculations (Before vs After)
    const totalActiveBefore = productsPlan.reduce((acc, p) => acc + p.beforeActivePowersCount, 0);
    const totalActiveAfter = productsPlan.reduce((acc, p) => acc + p.activePowersCount, 0);
    const totalPowersAdded = productsPlan.reduce((acc, p) => acc + p.addedPowers.length, 0);
    const totalPowersRemoved = productsPlan.reduce((acc, p) => acc + p.removedPowers.length, 0);
    const productsWithChangesCount = productsPlan.filter((p) => p.hasChanges).length;
    const productsUnchangedCount = productsPlan.filter((p) => !p.hasChanges).length;
    const totalOosPowers = productsPlan.reduce((acc, p) => acc + p.oosPowersCount, 0);

    const summary = {
      totalExcelRows: parsedRows.length,
      matchedExcelRows: matchedRowCount,
      unmatchedExcelRows: unmatchedRows.length,
      matchedProductsCount: matchedProductIds.size,
      unlistedProductsCount: productsPlan.filter((p) => p.isUnlisted).length,
      totalProductsInPlan: productsPlan.length,
      detectedBrands: Array.from(detectedBrands),
      totalActiveDiopters: totalActiveAfter,
      totalOosDiopters: totalOosPowers,
      totalActiveBefore,
      totalActiveAfter,
      netActiveChange: totalActiveAfter - totalActiveBefore,
      totalPowersAdded,
      totalPowersRemoved,
      productsWithChangesCount,
      productsUnchangedCount,
    };

    // If PREVIEW action, return full preview data
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        summary,
        products: productsPlan,
        unmatchedRows: unmatchedRows.slice(0, 100),
      });
    }

    // -------------------------------------------------------------
    // APPLY ACTION: Update PostgreSQL and Shopify
    // -------------------------------------------------------------
    if (action === 'apply') {
      // A. Update PostgreSQL database in transaction (Preserving stockQuantity!)
      const dbUpdates = productsPlan.map((p) => {
        const existingTags = dbAllProducts.find((dbP) => dbP.id === p.productId)?.tags || [];
        const cleanTags = existingTags.filter((tag) => {
          const t = tag.trim().toLowerCase();
          return !t.startsWith('oos_power:');
        });

        if (p.oosPowers.length > 0) {
          cleanTags.push(`oos_power: ${p.oosPowers.join(', ')}`);
        }

        return prisma.product.update({
          where: { id: p.productId },
          data: {
            availablePowers: p.activePowers,
            tags: cleanTags,
            hasPlanoOption: p.hasPlano,
            hasPrescription: p.hasRx,
            // Explicitly NO stockQuantity update!
          },
        });
      });

      await prisma.$transaction(dbUpdates);

      // B. Update Shopify Storefront Metafields via GraphQL with Rate-Limiting
      const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
      const shopifyClientId = process.env.SHOPIFY_CLIENT_ID;
      const shopifyClientSecret = process.env.SHOPIFY_CLIENT_SECRET;

      let shopifySyncedCount = 0;
      let shopifySkippedCount = 0;
      const shopifyErrors: Array<{ title: string; error: string }> = [];

      if (shopifyDomain && shopifyClientId && shopifyClientSecret) {
        let accessToken: string | null = null;
        try {
          const tokenResp = await fetch(`https://${shopifyDomain}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: shopifyClientId,
              client_secret: shopifyClientSecret,
              grant_type: 'client_credentials',
            }),
          });
          if (tokenResp.ok) {
            const tokenData = await tokenResp.json();
            accessToken = tokenData.access_token || null;
          }
        } catch (tokErr) {
          console.error('Failed to get Shopify access token:', tokErr);
        }

        if (accessToken) {
          const productsWithShopify = productsPlan.filter((p) => p.shopifyProductId);
          shopifySkippedCount = productsPlan.length - productsWithShopify.length;

          const formatMetafield = (arr: string[]) => (arr.length > 0 ? arr.join(', ') : 'none');

          const gqlMutation = `
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  key
                  value
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          // Process in controlled chunks of 3 to avoid Shopify rate limits
          const CHUNK_SIZE = 3;
          for (let i = 0; i < productsWithShopify.length; i += CHUNK_SIZE) {
            const chunk = productsWithShopify.slice(i, i + CHUNK_SIZE);

            await Promise.all(
              chunk.map(async (prod) => {
                const gid = `gid://shopify/Product/${prod.shopifyProductId}`;
                const metafields = [
                  {
                    ownerId: gid,
                    namespace: 'custom',
                    key: 'out_of_stock_powers',
                    value: formatMetafield(prod.oosPowers),
                    type: 'single_line_text_field',
                  },
                  {
                    ownerId: gid,
                    namespace: 'custom',
                    key: 'has_plano_option',
                    value: prod.hasPlano ? 'true' : 'false',
                    type: 'boolean',
                  },
                  {
                    ownerId: gid,
                    namespace: 'custom',
                    key: 'has_prescription',
                    value: prod.hasRx ? 'true' : 'false',
                    type: 'boolean',
                  },
                ];

                try {
                  const gqlResp = await fetch(`https://${shopifyDomain}/admin/api/2024-01/graphql.json`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Shopify-Access-Token': accessToken!,
                    },
                    body: JSON.stringify({
                      query: gqlMutation,
                      variables: { metafields },
                    }),
                  });

                  if (gqlResp.ok) {
                    const result = await gqlResp.json();
                    const userErrors = result.data?.metafieldsSet?.userErrors || [];
                    if (userErrors.length === 0) {
                      shopifySyncedCount++;
                    } else {
                      shopifyErrors.push({
                        title: prod.titleEn,
                        error: userErrors[0]?.message || 'Metafield set error',
                      });
                    }
                  } else {
                    shopifyErrors.push({
                      title: prod.titleEn,
                      error: `Shopify HTTP ${gqlResp.status}`,
                    });
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  shopifyErrors.push({
                    title: prod.titleEn,
                    error: msg,
                  });
                }
              })
            );

            // 200ms spacing between batches
            if (i + CHUNK_SIZE < productsWithShopify.length) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
        } else {
          shopifyErrors.push({
            title: 'Shopify Authentication',
            error: 'Could not obtain valid Shopify OAuth token. Database updated, but Shopify sync was skipped.',
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${productsPlan.length} products across all brands!`,
        summary,
        dbUpdatedCount: productsPlan.length,
        shopifySyncedCount,
        shopifySkippedCount,
        shopifyErrors,
      });
    }

    return NextResponse.json({ error: `Invalid action '${action}'` }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/products/bulk-stock-update:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

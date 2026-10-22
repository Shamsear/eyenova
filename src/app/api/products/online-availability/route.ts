import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALL_SPHERES = [
  '0.00', '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00',
  '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75', '-4.00', '-4.25',
  '-4.50', '-4.75', '-5.00', '-5.25', '-5.50', '-5.75', '-6.00', '-6.50', '-7.00',
  '-7.50', '-8.00', '-8.50', '-9.00', '-9.50', '-10.00', '-10.50', '-11.00', '-11.50',
  '-12.00', '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00',
  '+2.25', '+2.50', '+2.75', '+3.00', '+3.50', '+4.00', '+4.50', '+5.00', '+5.50',
  '+6.00', '+7.00', '+8.00'
];



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Parse OOS powers from tags
      const oosPowers: string[] = [];
      const oosCyls: string[] = [];
      const oosAxes: string[] = [];
      const oosAdds: string[] = [];

      (product.tags || []).forEach((tag) => {
        const t = tag.trim().toLowerCase();
        if (t.startsWith('oos_power:')) {
          const vals = tag.replace(/oos_power:/i, '').split(',');
          vals.forEach((v) => oosPowers.push(v.trim()));
        } else if (t.startsWith('oos_cyl:')) {
          const vals = tag.replace(/oos_cyl:/i, '').split(',');
          vals.forEach((v) => oosCyls.push(v.trim()));
        } else if (t.startsWith('oos_axis:')) {
          const vals = tag.replace(/oos_axis:/i, '').split(',');
          vals.forEach((v) => oosAxes.push(v.trim()));
        } else if (t.startsWith('oos_add:')) {
          const vals = tag.replace(/oos_add:/i, '').split(',');
          vals.forEach((v) => oosAdds.push(v.trim()));
        }
      });

      // Also ensure any sphere not in availablePowers is marked OOS
      if (Array.isArray(product.availablePowers) && product.availablePowers.length > 0) {
        ALL_SPHERES.forEach((sph) => {
          if (!product.availablePowers.includes(sph) && !oosPowers.includes(sph)) {
            oosPowers.push(sph);
          }
        });
      }

      return NextResponse.json({
        product: {
          id: product.id,
          sku: product.sku,
          titleEn: product.titleEn,
          brandName: product.brandName,
          productType: product.productType,
          shopifyProductId: product.shopifyProductId ? product.shopifyProductId.toString() : null,
          availablePowers: product.availablePowers,
          tags: product.tags,
        },
        oosPowers,
        oosCyls,
        oosAxes,
        oosAdds,
      });
    }

    // List all products for the left catalog
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        titleEn: true,
        brandName: true,
        productType: productTypeSelection(),
        shopifyProductId: true,
        availablePowers: true,
        tags: true,
      },
      orderBy: { titleEn: 'asc' },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        shopifyProductId: p.shopifyProductId ? p.shopifyProductId.toString() : null,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/products/online-availability:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

function productTypeSelection() {
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, oosPowers = [], oosCyls = [], oosAxes = [], oosAdds = [] } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Filter existing OOS tags
    const cleanTags = (product.tags || []).filter((tag) => {
      const t = tag.trim().toLowerCase();
      return (
        !t.startsWith('oos_power:') &&
        !t.startsWith('oos_cyl:') &&
        !t.startsWith('oos_axis:') &&
        !t.startsWith('oos_add:')
      );
    });

    if (oosPowers.length > 0) {
      cleanTags.push(`oos_power: ${oosPowers.join(', ')}`);
    }
    if (oosCyls.length > 0) {
      cleanTags.push(`oos_cyl: ${oosCyls.join(', ')}`);
    }
    if (oosAxes.length > 0) {
      cleanTags.push(`oos_axis: ${oosAxes.join(', ')}`);
    }
    if (oosAdds.length > 0) {
      cleanTags.push(`oos_add: ${oosAdds.join(', ')}`);
    }

    // Calculate active available powers
    const activeSpheres = Array.isArray(body.availablePowers) && body.availablePowers.length > 0
      ? body.availablePowers
      : ALL_SPHERES.filter((p: string) => !oosPowers.includes(p));

    const hasPlano = !oosPowers.includes('0.00');
    const hasRx = activeSpheres.some((p: string) => p !== '0.00');

    // Update in Database: both tags AND availablePowers in Supabase!
    await prisma.product.update({
      where: { id: productId },
      data: {
        tags: cleanTags,
        availablePowers: activeSpheres,
        hasPlanoOption: hasPlano,
        hasPrescription: hasRx,
      },
    });

    let shopifySynced = false;
    let shopifyMessage = 'Saved locally to database.';

    // If linked to Shopify, attempt Shopify metafield sync
    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const shopifyClientId = process.env.SHOPIFY_CLIENT_ID;
    const shopifyClientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (product.shopifyProductId && shopifyDomain && shopifyClientId && shopifyClientSecret) {
      try {
        // Request Admin access token via client_credentials
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
          const accessToken = tokenData.access_token;

          if (accessToken) {
            const gid = `gid://shopify/Product/${product.shopifyProductId.toString()}`;
            const formatMetafield = (arr: string[]) => (arr.length > 0 ? arr.join(', ') : 'none');

            const metafields = [
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'out_of_stock_powers',
                value: formatMetafield(oosPowers),
                type: 'single_line_text_field',
              },
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'out_of_stock_cylinders',
                value: formatMetafield(oosCyls),
                type: 'single_line_text_field',
              },
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'out_of_stock_axes',
                value: formatMetafield(oosAxes),
                type: 'single_line_text_field',
              },
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'out_of_stock_add_powers',
                value: formatMetafield(oosAdds),
                type: 'single_line_text_field',
              },
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'has_plano_option',
                value: hasPlano ? 'true' : 'false',
                type: 'boolean',
              },
              {
                ownerId: gid,
                namespace: 'custom',
                key: 'has_prescription',
                value: hasRx ? 'true' : 'false',
                type: 'boolean',
              },
            ];

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

            const gqlResp = await fetch(`https://${shopifyDomain}/admin/api/2024-01/graphql.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
              },
              body: JSON.stringify({
                query: gqlMutation,
                variables: { metafields },
              }),
            });

            if (gqlResp.ok) {
              const gqlResult = await gqlResp.json();
              const userErrors = gqlResult.data?.metafieldsSet?.userErrors || [];
              if (userErrors.length === 0) {
                shopifySynced = true;
                shopifyMessage = 'Synced to Shopify Storefront & Database.';
              } else {
                shopifyMessage = `Saved locally. Shopify warning: ${userErrors[0].message}`;
              }
            }
          }
        }
      } catch (shErr) {
        console.warn('Shopify sync error:', shErr);
        shopifyMessage = 'Saved locally to database. (Shopify sync skipped)';
      }
    }

    return NextResponse.json({
      success: true,
      shopifySynced,
      message: shopifyMessage,
      oosPowers,
      oosCyls,
      oosAxes,
      oosAdds,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/products/online-availability:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

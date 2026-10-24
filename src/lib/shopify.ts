let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getShopifyAccessToken(): Promise<string | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    console.warn('[Shopify] Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET in environment.');
    return null;
  }

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        cachedToken = data.access_token;
        const expiresInSec = Number(data.expires_in || 86400);
        tokenExpiresAt = now + (expiresInSec - 300) * 1000;
        return cachedToken;
      }
    }
  } catch (err) {
    console.error('[Shopify] Error fetching access token:', err);
  }

  return null;
}

export async function cancelOrRefundShopifyOrder(
  shopifyOrderIdRaw: string,
  reason: string = 'customer'
): Promise<{ success: boolean; action: string; message?: string }> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    return { success: false, action: 'none', message: 'No SHOPIFY_STORE_DOMAIN configured in environment' };
  }

  const token = await getShopifyAccessToken();
  if (!token) return { success: false, action: 'none', message: 'No Shopify access token available' };

  const cleanId = shopifyOrderIdRaw
    .replace('gid://shopify/Order/', '')
    .replace('ORD-SH-', '')
    .replace('SH-', '')
    .trim();

  if (!cleanId || isNaN(Number(cleanId))) {
    return { success: false, action: 'none', message: `Invalid Shopify order id: ${shopifyOrderIdRaw}` };
  }

  // 1. Try cancel endpoint
  try {
    const cancelRes = await fetch(`https://${domain}/admin/api/2024-01/orders/${cleanId}/cancel.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        reason: reason,
        email: false,
        restock: false,
      }),
    });

    if (cancelRes.ok) {
      console.log(`[Shopify] Order ${cleanId} successfully cancelled.`);
      return { success: true, action: 'CANCELLED' };
    }

    const cancelErr = await cancelRes.json().catch(() => ({}));
    console.warn(`[Shopify] Cancel order ${cleanId} returned ${cancelRes.status}:`, cancelErr);

    // 2. If cannot cancel (e.g. fulfilled or paid), process refund
    const orderRes = await fetch(`https://${domain}/admin/api/2024-01/orders/${cleanId}.json`, {
      headers: { 'X-Shopify-Access-Token': token },
    });

    if (!orderRes.ok) {
      return { success: false, action: 'none', message: `Failed to fetch order: ${orderRes.statusText}` };
    }

    const orderData = await orderRes.json();
    const order = orderData.order;
    if (!order) return { success: false, action: 'none', message: 'Order not found' };

    // Check if already refunded
    const currentTotal = parseFloat(order.current_total_price || order.total_price || '0');
    if (currentTotal <= 0 && (order.refunds || []).length > 0) {
      return { success: true, action: 'ALREADY_REFUNDED' };
    }

    // Build refund payload
    const refundPayload: Record<string, unknown> = {
      refund: {
        currency: order.currency || 'QAR',
        notify: false,
        note: `Refunded via EyeNova POS (${reason})`,
        shipping: {
          full_refund: true,
        },
        refund_line_items: (order.line_items || []).map((li: { id: string | number; quantity: number }) => ({
          line_item_id: li.id,
          quantity: li.quantity,
          restock_type: 'no_restock',
        })),
        transactions: [],
      },
    };

    // If transactions exist, refund parents
    const successfulTx = (order.transactions || []).filter(
      (tx: { status: string; kind: string }) => tx.status === 'success' && ['sale', 'capture'].includes(tx.kind)
    );

    const txList = (refundPayload.refund as { transactions: Array<Record<string, unknown>> }).transactions;
    for (const tx of successfulTx) {
      txList.push({
        parent_id: tx.id,
        amount: tx.amount,
        kind: 'refund',
        gateway: tx.gateway,
      });
    }

    const refundRes = await fetch(`https://${domain}/admin/api/2024-01/orders/${cleanId}/refunds.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify(refundPayload),
    });

    if (refundRes.ok) {
      console.log(`[Shopify] Order ${cleanId} successfully refunded.`);
      return { success: true, action: 'REFUNDED' };
    }

    const refundErr = await refundRes.json().catch(() => ({}));
    console.error(`[Shopify] Refund order ${cleanId} failed:`, refundErr);
    return { success: false, action: 'error', message: JSON.stringify(refundErr) };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Shopify] Exception during cancel/refund of ${cleanId}:`, errorMsg);
    return { success: false, action: 'error', message: errorMsg };
  }
}

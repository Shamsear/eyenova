import type { ProductItem, PowerPriceTier } from '@/lib/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatQar(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return `${(isNaN(num) ? 0 : num).toFixed(2)} QAR`;
}

export function formatQatarDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatQatarDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatQatarTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/** Formats an invoice number for display with a single # prefix, preventing double hashes (e.g., ##1019 -> #1019) */
export function formatInvoiceNumber(invNum: string | null | undefined): string {
  if (!invNum) return '';
  const trimmed = invNum.trim();
  // Strip any leading # characters first, then prepend a single #
  const cleaned = trimmed.replace(/^#+/, '');
  return cleaned ? `#${cleaned}` : '';
}

export interface InvoiceStatusDisplay {
  labelEn: string;
  labelAr: string;
  fullBadgeText: string;
  paymentStatusText: string;
  badgeClasses: string;
  boxClasses: string;
}

export function getInvoiceStatusDisplay(status?: string): InvoiceStatusDisplay {
  const s = (status || 'PAID').toUpperCase();
  if (s === 'PARTIALLY_REFUNDED') {
    return {
      labelEn: 'PARTIALLY REFUNDED',
      labelAr: 'مسترد جزئياً',
      fullBadgeText: 'PARTIALLY REFUNDED / مسترد جزئياً',
      paymentStatusText: 'PARTIALLY REFUNDED / مسترد جزئياً',
      badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
      boxClasses: 'bg-amber-50/70 border-amber-200 text-amber-800',
    };
  }
  if (s === 'REFUNDED') {
    return {
      labelEn: 'REFUNDED',
      labelAr: 'مسترد بالكامل',
      fullBadgeText: 'REFUNDED / مسترد بالكامل',
      paymentStatusText: 'REFUNDED / مسترد بالكامل',
      badgeClasses: 'bg-orange-50 text-orange-700 border-orange-200',
      boxClasses: 'bg-orange-50/70 border-orange-200 text-orange-800',
    };
  }
  if (s === 'CANCELLED' || s === 'VOID') {
    return {
      labelEn: 'CANCELLED',
      labelAr: 'ملغاة',
      fullBadgeText: 'CANCELLED / ملغاة',
      paymentStatusText: 'CANCELLED / ملغاة',
      badgeClasses: 'bg-rose-50 text-rose-700 border-rose-200',
      boxClasses: 'bg-rose-50/70 border-rose-200 text-rose-800',
    };
  }
  if (s === 'PARTIALLY_PAID') {
    return {
      labelEn: 'PARTIALLY PAID',
      labelAr: 'مدفوع جزئياً',
      fullBadgeText: 'PARTIALLY PAID / مدفوع جزئياً',
      paymentStatusText: 'PARTIALLY PAID / مدفوع جزئياً',
      badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200',
      boxClasses: 'bg-blue-50/70 border-blue-200 text-blue-800',
    };
  }
  if (s === 'PENDING' || s === 'UNPAID') {
    return {
      labelEn: 'PENDING',
      labelAr: 'معلق',
      fullBadgeText: 'PENDING / معلق',
      paymentStatusText: 'PENDING PAYMENT / بانتظار الدفع',
      badgeClasses: 'bg-stone-100 text-stone-700 border-stone-200',
      boxClasses: 'bg-stone-50 border-stone-200 text-stone-700',
    };
  }
  // Default: PAID / ISSUED
  return {
    labelEn: 'PAID',
    labelAr: 'مدفوعة',
    fullBadgeText: 'PAID / مدفوعة',
    paymentStatusText: 'PAID IN FULL / مسدد بالكامل',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    boxClasses: 'bg-emerald-50/60 border-emerald-200/80 text-emerald-800',
  };
}

export const STANDARD_POWERS: string[] = [
  '0.00',
  '-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00',
  '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75', '-4.00',
  '-4.25', '-4.50', '-4.75', '-5.00', '-5.25', '-5.50', '-5.75', '-6.00',
  '-6.50', '-7.00', '-7.50', '-8.00', '-8.50', '-9.00', '-9.50', '-10.00',
  '-10.50', '-11.00', '-11.50', '-12.00',
  '+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+1.75', '+2.00',
  '+2.25', '+2.50', '+2.75', '+3.00', '+3.25', '+3.50', '+3.75', '+4.00',
  '+4.25', '+4.50', '+4.75', '+5.00', '+5.25', '+5.50', '+5.75', '+6.00',
];

export const STANDARD_CYLINDERS: string[] = [
  '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00', '-2.25', '-2.50', '-2.75',
];

export const STANDARD_AXES: number[] = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180,
];

export const STANDARD_ADDS: string[] = ['Low', 'Medium', 'High'];

export const KNOWN_OPTICAL_BRANDS = [
  'Amara',
  'Bella',
  'Alcon',
  'Lens Me',
  'Acuvue',
  'Solo Soft Care',
  'Sama',
  'Diva',
  'CooperVision',
  'Bausch & Lomb',
  'Celena',
  'AMO',
  'Daya',
  'Royal Mink London',
];

/**
 * Extracts the single core brand name associated with a supplier.
 * If the supplier is a multi-brand / wholesale distributor, returns null.
 */
export function extractSupplierBrand(supplierName: string | null | undefined, isMultiBrand?: boolean): string | null {
  if (!supplierName) return null;
  if (isMultiBrand) return null;
  const s = supplierName.trim();
  if (s.toLowerCase().startsWith('all') || s.toLowerCase().includes('wholesale')) {
    return null;
  }

  for (const b of KNOWN_OPTICAL_BRANDS) {
    if (s.toLowerCase() === b.toLowerCase()) return b;
    if (s.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase()) return b;
    if (s.toLowerCase().includes(b.toLowerCase())) return b;
  }
  return s;
}

/**
 * Determines whether a product is an optical prescription item (lenses, spectacles) vs care/solution/accessory.
 */
export function isOpticalProduct(product?: {
  productType?: string | null;
  hasPrescription?: boolean | null;
  requiresOpticalSpecs?: boolean | null;
  availablePowers?: string[] | null;
  titleEn?: string | null;
}): boolean {
  if (!product) return false;
  const type = (product.productType || '').toUpperCase();
  if (type.includes('SOLUTION') || type.includes('ACCESSORY') || type.includes('BEAUTY') || type.includes('LASH')) {
    return false;
  }
  if (product.hasPrescription || product.requiresOpticalSpecs) return true;
  if (type.includes('CONTACT_LENSES') || type.includes('SPECTACLES') || type.includes('TORIC') || type.includes('LENS')) {
    return true;
  }
  if (product.availablePowers && product.availablePowers.length > 0) return true;
  return false;
}

/**
 * Determines whether an optical product has astigmatism correction (cylinder & axis).
 * Returns false for standard spherical contact lenses or single-vision frames.
 */
export function isToricProduct(product?: {
  titleEn?: string | null;
  productType?: string | null;
  cylinder?: string | number | null;
  axis?: number | null;
  batches?: any[];
}): boolean {
  if (!product) return false;
  if (
    product.cylinder !== undefined &&
    product.cylinder !== null &&
    String(product.cylinder).trim() !== '' &&
    String(product.cylinder).trim() !== '0' &&
    String(product.cylinder).toLowerCase() !== 'none'
  ) {
    return true;
  }
  if (product.axis !== undefined && product.axis !== null && Number(product.axis) > 0) {
    return true;
  }
  if (Array.isArray(product.batches)) {
    if (
      product.batches.some(
        (b: any) =>
          (b.cylinder && String(b.cylinder).trim() !== '' && b.cylinder !== 'None') ||
          (b.axis && Number(b.axis) > 0)
      )
    ) {
      return true;
    }
  }
  const title = (product.titleEn || '').toLowerCase();
  const type = (product.productType || '').toLowerCase();
  return (
    title.includes('astigmatism') ||
    title.includes('toric') ||
    type.includes('toric') ||
    type.includes('astigmatism')
  );
}

/**
 * Formats eye, power, cylinder, and axis into a clean, standard optical label.
 * E.g. "OD | PWR -2.00 | CYL -0.75 | AXIS 180°" or "OS | Plano (0.00)"
 */
export function formatOpticalSpecs(specs?: {
  eye?: 'OD' | 'OS' | '' | string | null;
  power?: string | number | null;
  cylinder?: string | number | null;
  axis?: number | null;
  addPower?: string | null;
  hasPrescription?: boolean;
  hasPlanoOption?: boolean;
  availablePowers?: string[];
  isPlano?: boolean;
  productType?: string | null;
}): string {
  if (!specs) return '';

  const isCare =
    specs.productType === 'LENS_SOLUTION_CARE' ||
    specs.productType === 'ACCESSORY' ||
    specs.productType === 'LASHES_BEAUTY';
  if (isCare) return '';

  const parts: string[] = [];

  if (specs.eye) {
    parts.push(specs.eye.toUpperCase());
  }

  const isPlano =
    specs.isPlano ||
    specs.power === '0.00' ||
    (typeof specs.power === 'string' && specs.power.toLowerCase().includes('plano'));

  if (isPlano) {
    parts.push('Plano (0.00)');
  } else if (specs.power !== undefined && specs.power !== null && specs.power !== '') {
    const pVal = String(specs.power).trim();
    parts.push(`PWR ${pVal.startsWith('+') || pVal.startsWith('-') || isNaN(Number(pVal)) ? pVal : (Number(pVal) > 0 ? `+${pVal}` : pVal)}`);
  }

  if (specs.cylinder !== undefined && specs.cylinder !== null && specs.cylinder !== '') {
    const cVal = String(specs.cylinder).trim();
    parts.push(`CYL ${cVal}`);
  }

  if (specs.axis !== undefined && specs.axis !== null && Number(specs.axis) > 0) {
    parts.push(`AXIS ${specs.axis}°`);
  }

  if (specs.addPower !== undefined && specs.addPower !== null && specs.addPower !== '') {
    parts.push(`ADD ${specs.addPower}`);
  }

  return parts.join(' | ');
}




/**
 * Resolves the effective retail price for a given product and power/cylinder/add configuration.
 * If the product has powerPriceTiers configured, matches against the appropriate tier.
 * Otherwise falls back to product.salePriceQar ?? product.basePriceQar.
 */
export function getEffectivePriceForPower(
  product: ProductItem,
  power?: string | null,
  cylinder?: string | null,
  addPower?: string | null
): number {
  const basePrice = Number(product.salePriceQar ?? product.basePriceQar ?? 0);
  const rawTiers = (product as any).powerPriceTiers;
  
  if (!rawTiers) return basePrice;
  
  let tiers: PowerPriceTier[] = [];
  if (Array.isArray(rawTiers)) {
    tiers = rawTiers;
  } else if (typeof rawTiers === 'string') {
    try { tiers = JSON.parse(rawTiers); } catch { return basePrice; }
  } else {
    return basePrice;
  }

  if (tiers.length === 0) return basePrice;

  const hasCyl = Boolean(cylinder && cylinder.trim() !== '' && cylinder !== '0.00' && cylinder !== '0');
  const hasAdd = Boolean(addPower && addPower.trim() !== '');

  // 1. Toric check
  if (hasCyl) {
    const toricTier = tiers.find((t) => t.requiresCylinder);
    if (toricTier && typeof toricTier.priceQar === 'number') {
      return Number(toricTier.priceQar);
    }
  }

  // 2. Multifocal check
  if (hasAdd) {
    const addTier = tiers.find((t) => t.requiresAdd);
    if (addTier && typeof addTier.priceQar === 'number') {
      return Number(addTier.priceQar);
    }
  }

  // 3. Plano (0.00 / No Power) check
  const pStr = (power || '').trim().toLowerCase();
  const isPlano = !pStr || pStr === '0' || pStr === '0.00' || pStr.includes('plano') || pStr.includes('no power');

  if (isPlano) {
    const planoTier = tiers.find(
      (t) =>
        (t.minPower === 0 && t.maxPower === 0) ||
        t.name.toLowerCase().includes('plano') ||
        t.name.toLowerCase().includes('no power')
    );
    if (planoTier && typeof planoTier.priceQar === 'number') {
      return Number(planoTier.priceQar);
    }
  } else {
    // 4. Numeric diopter bracket check
    const cleanNumStr = pStr.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanNumStr);
    if (!isNaN(num)) {
      for (const tier of tiers) {
        if (tier.requiresCylinder || tier.requiresAdd) continue;
        if (typeof tier.minPower === 'number' && typeof tier.maxPower === 'number') {
          const min = Math.min(tier.minPower, tier.maxPower);
          const max = Math.max(tier.minPower, tier.maxPower);
          if (num >= min && num <= max) {
            return Number(tier.priceQar);
          }
        }
      }
    }
  }

  return basePrice;
}

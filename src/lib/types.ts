export interface PowerPriceTier {
  id: string;
  name: string;
  minPower?: number | null;
  maxPower?: number | null;
  requiresCylinder?: boolean;
  requiresAdd?: boolean;
  priceQar: number;
  costPriceQar?: number | null;
}

export interface ProductItem {
  id: string;
  sku: string;
  barcode: string | null;
  productType: string;
  titleEn: string;
  titleAr: string | null;
  brandName: string | null;
  collectionName: string | null;
  basePriceQar: number;
  salePriceQar: number | null;
  costPriceQar: number;
  stockQuantity: number;
  minStockAlert: number;
  lensDuration?: string | null;
  packSize?: number | null;
  colorNameEn?: string | null;
  colorHex?: string | null;
  hasPrescription: boolean;
  hasPlanoOption: boolean;
  availablePowers: string[];
  powerPriceTiers?: PowerPriceTier[];
  imageUrl: string | null;
  power?: string | null;
  cylinder?: string | null;
  axis?: number | null;
  addPower?: string | null;
  baseCurve?: number | string | null;
  diameter?: number | string | null;
  waterContent?: string | null;
  material?: string | null;
  replacementSchedule?: string | null;
  requiresOpticalSpecs?: boolean;
  batches?: {
    id: string;
    batchNumber: string;
    power: string | null;
    cylinder: string | null;
    axis: number | null;
    addPower: string | null;
    quantity: number;
    expiryDate: string | null;
  }[];
}

export interface CartLineItem {
  lineId: string; // Unique client-side ID for the cart row
  productId: string;
  sku: string;
  barcode: string | null;
  titleEn: string;
  titleAr?: string | null;
  brandName?: string | null;
  unitPrice: number;
  lensPrice: number;
  quantity: number;
  eye: 'OD' | 'OS' | ''; // Right Eye, Left Eye, or standard
  power: string | null;
  cylinder: string | null;
  axis: number | null;
  addPower: string | null;
  isPlano: boolean;
  lensSummary: string;
  imageUrl: string | null;
  stockQuantity: number;
  productType?: string;
  availablePowers?: string[];
  hasPlanoOption?: boolean;
  basePriceQar?: number;
  powerPriceTiers?: PowerPriceTier[];
  batches?: {
    id: string;
    batchNumber: string;
    power: string | null;
    cylinder: string | null;
    axis: number | null;
    addPower: string | null;
    quantity: number;
    expiryDate: string | null;
  }[];
}

export interface HeldSaleItem {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  lines: CartLineItem[];
  total: number;
  deliveryFee: number;
  itemCount: number;
  displaySummary: string;
}

export interface ReceiptItem {
  name: string;
  specs?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptPayload {
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  time: string;
  storeNameEn: string;
  storeNameAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
  crNumber: string;
  vatNumber: string;
  cashierName: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentReference?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  total: number;
  cashTendered?: number;
  changeDue?: number;
  notes?: string;
}

export interface UserAccountItem {
  id: string;
  username: string;
  fullName: string;
  role: string; // STAFF | OPTOMETRIST | ADMIN | SUPER_ADMIN
  pinCode: string;
  storeId: string | null;
}

export interface StoreItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface ShiftInfo {
  id: string;
  userId: string;
  userName: string;
  storeId?: string | null;
  storeName?: string | null;
  openedAt: string;
  openingCash: number;
  expectedClosingCash: number;
  cashSalesAmount: number;
  cardSalesAmount: number;
  totalSalesAmount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface CustomerItem {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  storeCreditQar?: number;
  tag?: string;
}

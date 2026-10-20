'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shell } from '@/components/layout/shell';
import {
  formatQar,
  formatOpticalSpecs,
  STANDARD_POWERS,
  STANDARD_CYLINDERS,
  STANDARD_AXES,
  isOpticalProduct,
  isToricProduct,
} from '@/lib/utils';
import { useSessionStore } from '@/stores/session-store';
import { DataTable, Column } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { SearchableSelect, SelectOption } from '@/components/shared/searchable-select';
import {
  Truck,
  Plus,
  PackageCheck,
  Building2,
  RotateCcw,
  Eye,
  X,
  Check,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Printer,
  Loader2,
  Trash2,
  Edit3,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

interface ShipmentItem {
  id: string;
  productId: string;
  productTitle: string;
  sku: string | null;
  quantity: number;
  unitCostQar: number;
  totalCostQar: number;
  batchNumber: string;
  expiryDate: string | null;
  power: string | null;
  cylinder: string | null;
  axis: number | null;
}

interface Shipment {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  receivedAt: string;
  operatorName: string;
  totalCostQar: number;
  itemsCount: number;
  notes: string | null;
  deliveredByName: string | null;
  supplierRepContact: string | null;
  items: ShipmentItem[];
}

interface PoItem {
  id: string;
  productId: string;
  productTitle: string;
  brandName: string;
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostQar: number;
  totalCostQar: number;
  power: string | null;
  cylinder: string | null;
  axis: number | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;
  expectedDeliveryDateRaw?: string | null;
  totalAmountQar: number;
  receivingStatus: 'ORDERED' | 'FULLY_RECEIVED' | 'PARTIALLY_RECEIVED' | 'CANCELLED';
  paymentStatus: string;
  notes: string | null;
  createdByName: string | null;
  totalUnitsOrdered: number;
  totalUnitsReceived: number;
  items: PoItem[];
}

interface Supplier {
  id: string;
  name: string;
  code?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  creditTerms?: string | null;
  notes?: string | null;
  isMultiBrand?: boolean;
  activeOrdersCount: number;
}

interface LowStockAlert {
  id: string;
  title?: string;
  titleEn?: string;
  brand?: string;
  brandName?: string;
  sku: string;
  currentStock?: number;
  stockQuantity?: number;
  suggestedReorder: number;
  estimatedCostQar?: number;
  costEstimateQar?: number;
}

interface CatalogProduct {
  id: string;
  titleEn: string;
  brandName?: string | null;
  sku: string;
  costPrice?: number | null;
  retailPrice: number;
  productType?: string | null;
  availablePowers?: string[];
}

interface DraftPoItem {
  productId: string;
  productTitle: string;
  brandName: string;
  sku: string;
  quantity: number;
  unitCostQar: number;
  totalCostQar: number;
  power: string | null;
  cylinder: string | null;
  axis: number | null;
}

const TABS = [
  { id: 'SHIPMENTS', label: 'Inbound Shipments (GRN)' },
  { id: 'ORDERS', label: 'Purchase Orders (PO)' },
  { id: 'REORDER', label: 'Reorder Radar' },
  { id: 'SUPPLIERS', label: 'Supplier Directory' },
];

export default function PurchasesPage() {
  const { user } = useSessionStore();

  const [activeTab, setActiveTab] = useState<'SHIPMENTS' | 'ORDERS' | 'REORDER' | 'SUPPLIERS'>('SHIPMENTS');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Main data collections
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  // Modals state
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
  const [isReceivePoOpen, setIsReceivePoOpen] = useState(false);
  const [isDirectInboundOpen, setIsDirectInboundOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);

  // Edit state
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // Edit Shipment State
  const [isEditingShipment, setIsEditingShipment] = useState(false);
  const [editShipmentInvoice, setEditShipmentInvoice] = useState('');
  const [editShipmentDeliveredBy, setEditShipmentDeliveredBy] = useState('');
  const [editShipmentContact, setEditShipmentContact] = useState('');
  const [editShipmentNotes, setEditShipmentNotes] = useState('');
  const [editShipmentDate, setEditShipmentDate] = useState('');

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Create PO Form state
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poExpectedDelivery, setPoExpectedDelivery] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftPoItem[]>([]);

  // Add Item to Draft PO Form
  const [itemProductId, setItemProductId] = useState('');
  const [itemQty, setItemQty] = useState('24');
  const [itemCost, setItemCost] = useState('55');
  const [itemPower, setItemPower] = useState('0.00');
  const [itemCylinder, setItemCylinder] = useState('');
  const [itemAxis, setItemAxis] = useState('');
  const [itemIsPlano, setItemIsPlano] = useState(true);

  // Receive PO Form state
  const [selectedReceivingPoId, setSelectedReceivingPoId] = useState('');
  const [recvDeliveryNote, setRecvDeliveryNote] = useState('');
  const [recvDeliveredBy, setRecvDeliveredBy] = useState('');
  const [recvRepContact, setRecvRepContact] = useState('');
  const [recvPaymentChannel, setRecvPaymentChannel] = useState<'BANK' | 'CASH'>('BANK');
  const [recvPayFromTreasury, setRecvPayFromTreasury] = useState(true);

  // Direct Inbound Form state
  const [dirSupplier, setDirSupplier] = useState('');
  const [dirInvoiceNo, setDirInvoiceNo] = useState('');
  const [dirProductId, setDirProductId] = useState('');
  const [dirQty, setDirQty] = useState('20');
  const [dirFocQty, setDirFocQty] = useState('0');
  const [dirUnitCost, setDirUnitCost] = useState('55');
  const [dirBatchNo, setDirBatchNo] = useState(`LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [dirExpiry, setDirExpiry] = useState('31-12-2028');
  const [dirPower, setDirPower] = useState('0.00');
  const [dirCylinder, setDirCylinder] = useState('');
  const [dirAxis, setDirAxis] = useState('');
  const [dirIsPlano, setDirIsPlano] = useState(true);

  // Add Vendor Form state
  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vCreditTerms, setVCreditTerms] = useState('COD');
  const [vNotes, setVNotes] = useState('');
  const [vIsMultiBrand, setVIsMultiBrand] = useState(false);

  // Helper to test if a product belongs to a given supplier
  const isProductAssociatedWithSupplier = (product: CatalogProduct, supplier: Supplier | null | undefined): boolean => {
    if (!supplier) return true;
    if (supplier.isMultiBrand) {
      const notes = (supplier.notes || '').toLowerCase();
      if (notes.includes('brands:') || notes.includes('brand:')) {
        const brandList = notes
          .split(/brands?:/i)[1]
          .split(',')
          .map((b) => b.trim().toLowerCase())
          .filter(Boolean);
        if (brandList.length > 0) {
          const pb = (product.brandName || '').toLowerCase();
          const pt = (product.titleEn || '').toLowerCase();
          return brandList.some((b) => pb.includes(b) || pt.includes(b));
        }
      }
      return true;
    }

    const supName = supplier.name.trim().toLowerCase();
    const pBrand = (product.brandName || '').trim().toLowerCase();
    const pTitle = (product.titleEn || '').toLowerCase();

    // Check if supplier name implies all brands / general wholesale
    const multiKeywords = ['all brands', 'multibrand', 'multi-brand', 'wholesale', 'general trading', 'general optical'];
    if (multiKeywords.some((kw) => supName.includes(kw))) {
      return true;
    }

    // Exact or substring match on product brand name or title
    if (pBrand && (supName === pBrand || supName.includes(pBrand) || pBrand.includes(supName))) {
      return true;
    }
    if (pTitle.includes(supName)) {
      return true;
    }

    // Alcon optical family (Precision 1, Dailies, Freshlook, Air Optix, Total 1, Systane, Opti-Free)
    if (supName === 'alcon' || supName.includes('alcon')) {
      const alconFamily = ['alcon', 'freshlook', 'dailies', 'air optix', 'precision', 'total 1', 'systane', 'opti-free', 'optifree'];
      if (alconFamily.some((b) => pBrand.includes(b) || pTitle.includes(b))) return true;
    }

    // Acuvue / Johnson & Johnson optical family (Oasys, 1 Day Acuvue, Moist, Define, Vita, HydraLuxe)
    if (supName.includes('acuvue') || supName.includes('johnson')) {
      const acuvueFamily = ['acuvue', 'oasys', 'moist', 'define', 'hydraluxe', 'vita'];
      if (acuvueFamily.some((b) => pBrand.includes(b) || pTitle.includes(b))) return true;
    }

    // Bausch + Lomb family (Biotrue, SofLens, PureVision, Ultra, ReNu, Boston)
    if (supName.includes('bausch') || supName.includes('lomb')) {
      const blFamily = ['bausch', 'lomb', 'biotrue', 'soflens', 'purevision', 'renu', 'boston'];
      if (blFamily.some((b) => pBrand.includes(b) || pTitle.includes(b))) return true;
    }

    // CooperVision family (Biofinity, Clariti, MyDay, Proclear, Avaira, Biomedics)
    if (supName.includes('coopervision') || supName.includes('cooper')) {
      const cvFamily = ['cooper', 'biofinity', 'clariti', 'myday', 'proclear', 'avaira', 'biomedics'];
      if (cvFamily.some((b) => pBrand.includes(b) || pTitle.includes(b))) return true;
    }

    // Bella family
    if (supName.includes('bella') && (pBrand.includes('bella') || pTitle.includes('bella'))) {
      return true;
    }

    // Amara family
    if (supName.includes('amara') && (pBrand.includes('amara') || pTitle.includes('amara'))) {
      return true;
    }

    // Lens Me family
    if (supName.includes('lens me') && (pBrand.includes('lens me') || pTitle.includes('lens me'))) {
      return true;
    }

    // Solo Soft Care family
    if (supName.includes('solo') && (pBrand.includes('solo') || pTitle.includes('solo'))) {
      return true;
    }

    // Check custom notes for listed brands
    if (supplier.notes) {
      const noteBrands = supplier.notes
        .split(/[,;\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 1);
      if (noteBrands.some((b) => pBrand.includes(b) || pTitle.includes(b))) {
        return true;
      }
    }

    return false;
  };

  // Selected PO Supplier resolution
  const selectedPoSupplier = useMemo(
    () => suppliers.find((s) => s.id === poSupplierId),
    [suppliers, poSupplierId]
  );

  // Filter products for PO: strictly to chosen supplier's brands or all if multi-brand
  const poAvailableProducts = useMemo(() => {
    if (!selectedPoSupplier) {
      return catalogProducts;
    }
    return catalogProducts.filter((p) => isProductAssociatedWithSupplier(p, selectedPoSupplier));
  }, [catalogProducts, selectedPoSupplier]);

  // Selected product optical specs resolution
  const selectedPoProduct = useMemo(
    () => catalogProducts.find((p) => p.id === itemProductId),
    [catalogProducts, itemProductId]
  );
  const isSelectedPoOptical = selectedPoProduct ? isOpticalProduct(selectedPoProduct) : true;
  const poProductPowers = useMemo(() => {
    if (selectedPoProduct?.availablePowers && selectedPoProduct.availablePowers.length > 0) {
      const list = [...selectedPoProduct.availablePowers];
      if (!list.includes('0.00') && !list.some((p) => p.toLowerCase().includes('plano'))) {
        list.unshift('0.00');
      }
      return list;
    }
    return STANDARD_POWERS;
  }, [selectedPoProduct]);
  const isSelectedPoToric = useMemo(
    () => (selectedPoProduct ? isToricProduct(selectedPoProduct) : false),
    [selectedPoProduct]
  );

  const selectedDirProduct = useMemo(
    () => catalogProducts.find((p) => p.id === dirProductId),
    [catalogProducts, dirProductId]
  );
  const isSelectedDirOptical = selectedDirProduct ? isOpticalProduct(selectedDirProduct) : true;
  const isSelectedDirToric = useMemo(
    () => (selectedDirProduct ? isToricProduct(selectedDirProduct) : false),
    [selectedDirProduct]
  );
  const dirProductPowers = useMemo(() => {
    if (selectedDirProduct?.availablePowers && selectedDirProduct.availablePowers.length > 0) {
      const list = [...selectedDirProduct.availablePowers];
      if (!list.includes('0.00') && !list.some((p) => p.toLowerCase().includes('plano'))) {
        list.unshift('0.00');
      }
      return list;
    }
    return STANDARD_POWERS;
  }, [selectedDirProduct]);

  // Filter products for Direct Inbound based on typed/selected supplier
  const dirAvailableProducts = useMemo(() => {
    if (!dirSupplier.trim()) return catalogProducts;
    const matchedSup = suppliers.find(
      (s) => s.name.toLowerCase() === dirSupplier.trim().toLowerCase()
    );
    if (matchedSup) {
      return catalogProducts.filter((p) => isProductAssociatedWithSupplier(p, matchedSup));
    }
    const brandTerm = dirSupplier.trim().toLowerCase();
    const filtered = catalogProducts.filter((p) => {
      const pb = (p.brandName || '').toLowerCase();
      const pt = (p.titleEn || '').toLowerCase();
      return pb.includes(brandTerm) || pt.includes(brandTerm);
    });
    return filtered.length > 0 ? filtered : catalogProducts;
  }, [catalogProducts, dirSupplier, suppliers]);

  // Memoized SearchableSelect Options
  const poSupplierOptions = useMemo<SelectOption[]>(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        subtext: s.creditTerms ? `Terms: ${s.creditTerms}` : undefined,
        badge: s.isMultiBrand ? 'Multi-Brand' : 'Brand Specific',
        badgeColor: (s.isMultiBrand ? 'amber' : 'emerald') as SelectOption['badgeColor'],
      })),
    [suppliers]
  );

  const poProductOptions = useMemo<SelectOption[]>(
    () =>
      poAvailableProducts.map((p) => ({
        value: p.id,
        label: p.titleEn,
        subtext: `SKU: ${p.sku} ${p.brandName ? `· ${p.brandName}` : ''}`,
        badge: p.brandName || undefined,
        badgeColor: 'stone' as const,
      })),
    [poAvailableProducts]
  );

  const poPowerOptions = useMemo<SelectOption[]>(
    () =>
      poProductPowers.map((pwr) => ({
        value: pwr,
        label: pwr === '0.00' ? 'Plano (0.00)' : pwr,
      })),
    [poProductPowers]
  );

  const poCylOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'None (Spherical)' },
      ...STANDARD_CYLINDERS.map((c) => ({
        value: c,
        label: c,
      })),
    ],
    []
  );

  const poAxisOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'None' },
      ...STANDARD_AXES.map((a) => ({
        value: String(a),
        label: `${a}°`,
      })),
    ],
    []
  );

  const receivePoOptions = useMemo<SelectOption[]>(
    () =>
      orders
        .filter((o) => o.receivingStatus !== 'FULLY_RECEIVED')
        .map((o) => ({
          value: o.id,
          label: `${o.poNumber} — ${o.supplierName}`,
          subtext: `${o.totalUnitsReceived}/${o.totalUnitsOrdered} pcs · ${o.orderDate}`,
          badge: o.receivingStatus.replace(/_/g, ' '),
          badgeColor: (o.receivingStatus === 'PARTIALLY_RECEIVED' ? 'amber' : 'stone') as SelectOption['badgeColor'],
        })),
    [orders]
  );

  const dirProductOptions = useMemo<SelectOption[]>(
    () =>
      dirAvailableProducts.map((p) => ({
        value: p.id,
        label: p.titleEn,
        subtext: `SKU: ${p.sku} ${p.brandName ? `· ${p.brandName}` : ''}`,
        badge: p.brandName || undefined,
        badgeColor: 'stone' as const,
      })),
    [dirAvailableProducts]
  );

  const dirPowerOptions = useMemo<SelectOption[]>(
    () =>
      dirProductPowers.map((pwr) => ({
        value: pwr,
        label: pwr === '0.00' ? 'Plano (0.00)' : pwr,
      })),
    [dirProductPowers]
  );

  const brandScopeOptions: SelectOption[] = [
    { value: 'SINGLE', label: 'Single Brand (Matches Vendor Name)', badge: 'Specific', badgeColor: 'emerald' },
    { value: 'MULTI', label: 'Multi-Brand / Wholesaler', badge: 'Multi', badgeColor: 'amber' },
  ];

  const creditTermsOptions: SelectOption[] = [
    { value: 'COD', label: 'Cash on Delivery (COD)' },
    { value: 'NET30', label: 'Net 30 Days' },
    { value: 'NET60', label: 'Net 60 Days' },
    { value: 'PREPAID', label: 'Prepaid' },
  ];

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, productsRes] = await Promise.all([
        fetch(`/api/purchases?q=${encodeURIComponent(search.trim())}`),
        fetch('/api/products?limit=500'),
      ]);

      const pData = await purchasesRes.json();
      const prodData = await productsRes.json();

      if (pData.shipments) setShipments(pData.shipments);
      if (pData.orders) setOrders(pData.orders);
      if (pData.suppliers) setSuppliers(pData.suppliers);
      if (pData.lowStock) setLowStock(pData.lowStock);
      if (prodData.products) setCatalogProducts(prodData.products);
    } catch (err) {
      console.error('Error fetching purchases data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Add Item to Draft PO
  const handleAddDraftItem = () => {
    if (!selectedPoProduct) return;
    const qty = parseInt(itemQty, 10);
    const cost = parseFloat(itemCost);
    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) return;

    const pwr = isSelectedPoOptical
      ? itemIsPlano || itemPower === '0.00' || itemPower.toLowerCase().includes('plano')
        ? 'Plano (0.00)'
        : itemPower
      : 'Plano (0.00)';
    const cyl = isSelectedPoOptical && itemCylinder ? itemCylinder : null;
    const ax = isSelectedPoOptical && itemAxis ? parseInt(itemAxis, 10) : null;

    setDraftItems((prev) => [
      ...prev,
      {
        productId: selectedPoProduct.id,
        productTitle: selectedPoProduct.titleEn,
        brandName: selectedPoProduct.brandName || 'EyeNova',
        sku: selectedPoProduct.sku,
        quantity: qty,
        unitCostQar: cost,
        totalCostQar: qty * cost,
        power: pwr,
        cylinder: cyl,
        axis: ax,
      },
    ]);

    setItemProductId('');
    setItemPower('0.00');
    setItemIsPlano(true);
    setItemCylinder('');
    setItemAxis('');
  };

  // Open Edit PO
  const openEditPo = (po: PurchaseOrder) => {
    setEditingPoId(po.id);
    setPoNumber(po.poNumber);
    setPoSupplierId(po.supplierId);
    setPoExpectedDelivery(po.expectedDeliveryDateRaw || (po.expectedDeliveryDate && po.expectedDeliveryDate.length === 10 ? po.expectedDeliveryDate : ''));
    setPoNotes(po.notes || '');
    setDraftItems(
      (po.items || []).map((it) => ({
        productId: it.productId,
        productTitle: it.productTitle,
        brandName: it.brandName || 'EyeNova',
        sku: it.sku || '',
        quantity: it.orderedQuantity,
        unitCostQar: it.unitCostQar,
        totalCostQar: it.totalCostQar,
        power: it.power,
        cylinder: it.cylinder,
        axis: it.axis,
      }))
    );
    setFormError('');
    setIsCreatePoOpen(true);
  };

  // Delete PO
  const handleDeletePo = async (poId: string, poNum: string) => {
    if (!confirm(`Are you sure you want to delete Purchase Order ${poNum}? This cannot be undone.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_PO', poId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete PO');
      if (selectedPo?.id === poId) setSelectedPo(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Create or Update PO
  const handleSubmitCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || draftItems.length === 0) {
      setFormError('Please select a supplier and add at least one line item.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        action: editingPoId ? 'UPDATE_PO' : 'CREATE_PO',
        supplierId: poSupplierId,
        expectedDeliveryDate: poExpectedDelivery || undefined,
        notes: poNotes,
        createdByName: user?.fullName || 'Cashier',
        items: draftItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCostQar: item.unitCostQar,
          power: item.power,
          cylinder: item.cylinder || null,
          axis: item.axis || null,
        })),
      };

      if (editingPoId) {
        payload.poId = editingPoId;
        if (poNumber) payload.poNumber = poNumber;
      } else {
        if (poNumber) payload.poNumber = poNumber;
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || (editingPoId ? 'Failed to update PO' : 'Failed to create PO'));

      setIsCreatePoOpen(false);
      setEditingPoId(null);
      setDraftItems([]);
      setPoSupplierId('');
      setPoNumber('');
      setPoNotes('');
      loadData();
      setActiveTab('ORDERS');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFormError(errorMsg || (editingPoId ? 'Error updating Purchase Order' : 'Error creating Purchase Order'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Receive PO
  const handleSubmitReceivePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivingPoId) {
      setFormError('Please select a purchase order to receive.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECEIVE_PO',
          poId: selectedReceivingPoId,
          deliveryNoteNumber: recvDeliveryNote,
          deliveredByName: recvDeliveredBy,
          supplierRepContact: recvRepContact,
          paymentChannel: recvPaymentChannel,
          payFromTreasury: recvPayFromTreasury,
          operatorName: user?.fullName || 'Cashier',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to receive PO');

      setIsReceivePoOpen(false);
      setSelectedReceivingPoId('');
      loadData();
      setActiveTab('SHIPMENTS');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFormError(errorMsg || 'Error receiving Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Direct Inbound Stock-In
  const handleSubmitDirectInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirSupplier || !dirProductId || !dirQty || !dirUnitCost) {
      setFormError('Supplier, product, quantity and cost price are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DIRECT_INBOUND',
          supplierName: dirSupplier,
          invoiceNumber: dirInvoiceNo,
          productId: dirProductId,
          quantity: dirQty,
          focQuantity: dirFocQty,
          unitCostPrice: dirUnitCost,
          batchNumber: dirBatchNo,
          expiryDate: dirExpiry,
          power: isSelectedDirOptical
            ? (dirIsPlano || dirPower === '0.00' || dirPower.toLowerCase().includes('plano') ? 'Plano (0.00)' : dirPower)
            : 'Plano (0.00)',
          cylinder: isSelectedDirOptical && dirCylinder ? dirCylinder : null,
          axis: isSelectedDirOptical && dirAxis ? parseInt(dirAxis, 10) : null,
          operatorName: user?.fullName || 'Cashier',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to record direct inbound');

      setIsDirectInboundOpen(false);
      setDirProductId('');
      setDirSupplier('');
      setDirPower('0.00');
      setDirIsPlano(true);
      setDirCylinder('');
      setDirAxis('');
      loadData();
      setActiveTab('SHIPMENTS');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFormError(errorMsg || 'Error recording direct inbound');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Supplier
  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setVName(sup.name);
    setVContact(sup.contactPerson || '');
    setVPhone(sup.phone || '');
    setVEmail(sup.email || '');
    setVCreditTerms(sup.creditTerms || 'COD');
    setVNotes(sup.notes || '');
    setVIsMultiBrand(!!sup.isMultiBrand);
    setFormError('');
    setIsAddVendorOpen(true);
  };

  // Delete Supplier
  const handleDeleteSupplier = async (supId: string, supName: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${supName}"? This can only be done if no orders are linked.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_SUPPLIER', supplierId: supId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete supplier');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Shipment
  const openEditShipment = (s: Shipment) => {
    setSelectedShipment(s);
    setEditShipmentInvoice(s.invoiceNumber || '');
    setEditShipmentDeliveredBy(s.deliveredByName || '');
    setEditShipmentContact(s.supplierRepContact || '');
    setEditShipmentNotes(s.notes || '');
    setEditShipmentDate(s.receivedAt || '');
    setIsEditingShipment(true);
  };

  // Save Shipment Edits
  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SHIPMENT',
          shipmentId: selectedShipment.id,
          invoiceNumber: editShipmentInvoice,
          deliveredByName: editShipmentDeliveredBy,
          supplierRepContact: editShipmentContact,
          notes: editShipmentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update shipment');
      setIsEditingShipment(false);
      setSelectedShipment(null);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Shipment
  const handleDeleteShipment = async (shipmentId: string, invoiceNum: string) => {
    if (!confirm(`Are you sure you want to delete shipment ${invoiceNum || 'record'}? This cannot be undone.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_SHIPMENT', shipmentId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete shipment');
      if (selectedShipment?.id === shipmentId) setSelectedShipment(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add or Update Vendor
  const handleSubmitAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) {
      setFormError('Vendor name is required.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const payload: any = {
        action: editingSupplierId ? 'UPDATE_SUPPLIER' : 'CREATE_SUPPLIER',
        name: vName,
        contactPerson: vContact,
        phone: vPhone,
        email: vEmail,
        creditTerms: vCreditTerms,
        notes: vNotes,
        isMultiBrand: vIsMultiBrand,
      };

      if (editingSupplierId) {
        payload.supplierId = editingSupplierId;
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || (editingSupplierId ? 'Failed to update vendor' : 'Failed to create vendor'));

      setIsAddVendorOpen(false);
      setEditingSupplierId(null);
      setVName('');
      setVContact('');
      setVPhone('');
      setVEmail('');
      setVNotes('');
      setVIsMultiBrand(false);
      loadData();
      setActiveTab('SUPPLIERS');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setFormError(errorMsg || (editingSupplierId ? 'Error updating vendor' : 'Error creating vendor'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal for a specific PO
  const openReceiveForPo = (po: PurchaseOrder) => {
    setSelectedReceivingPoId(po.id);
    setRecvDeliveryNote(`DN-${po.poNumber}`);
    setRecvDeliveredBy(po.supplierName);
    setFormError('');
    setIsReceivePoOpen(true);
  };

  // TAB 1: SHIPMENTS COLUMNS
  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'invoiceNumber',
      header: 'GRN / Invoice #',
      className: 'w-36 font-mono text-xs font-semibold text-stone-900 whitespace-nowrap',
      render: (s) => <span className="truncate block">{s.invoiceNumber || '—'}</span>,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      className: 'min-w-[150px] font-medium text-stone-900 whitespace-nowrap',
      render: (s) => <span className="truncate block">{s.supplierName}</span>,
    },
    {
      key: 'receivedAt',
      header: 'Received Date',
      className: 'w-36 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (s) => <span className="truncate block">{s.receivedAt}</span>,
    },
    {
      key: 'itemsCount',
      header: 'Items',
      className: 'w-24 text-center whitespace-nowrap',
      render: (s) => (
        <span className="font-mono text-xs text-stone-700 tabular-nums truncate block">
          {s.itemsCount} lines
        </span>
      ),
    },
    {
      key: 'totalCostQar',
      header: 'Total Cost',
      className: 'w-32 text-right whitespace-nowrap',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          {formatQar(s.totalCostQar)}
        </span>
      ),
    },
    {
      key: 'operatorName',
      header: 'Received By',
      className: 'w-32 text-stone-600 whitespace-nowrap',
      render: (s) => <span className="truncate block text-xs">{s.operatorName}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24 text-right whitespace-nowrap',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setIsEditingShipment(false);
              setSelectedShipment(s);
            }}
            className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="View GRN Details"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => openEditShipment(s)}
            className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="Edit Shipment"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => handleDeleteShipment(s.id, s.invoiceNumber)}
            className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
            title="Delete Shipment"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  // TAB 2: ORDERS COLUMNS
  const orderColumns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO #',
      className: 'w-36 font-mono text-xs font-semibold text-stone-900 whitespace-nowrap',
      render: (o) => <span className="truncate block">{o.poNumber}</span>,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      className: 'min-w-[150px] font-medium text-stone-900 whitespace-nowrap',
      render: (o) => <span className="truncate block">{o.supplierName}</span>,
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      className: 'w-32 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (o) => <span className="truncate block">{o.orderDate}</span>,
    },
    {
      key: 'units',
      header: 'Received / Ordered',
      className: 'w-36 text-center whitespace-nowrap',
      render: (o) => (
        <span className="font-mono text-xs text-stone-700 tabular-nums truncate block">
          {o.totalUnitsReceived} / {o.totalUnitsOrdered} pcs
        </span>
      ),
    },
    {
      key: 'totalAmountQar',
      header: 'Total Cost',
      className: 'w-32 text-right whitespace-nowrap',
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums truncate block">
          {formatQar(o.totalAmountQar)}
        </span>
      ),
    },
    {
      key: 'receivingStatus',
      header: 'Status',
      className: 'w-36 whitespace-nowrap',
      render: (o) => {
        const isComplete = o.receivingStatus === 'FULLY_RECEIVED';
        const isPartial = o.receivingStatus === 'PARTIALLY_RECEIVED';
        return (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border truncate ${
              isComplete
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isPartial
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {o.receivingStatus.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-36 text-right whitespace-nowrap',
      render: (o) => (
        <div className="flex items-center justify-end gap-1">
          {o.receivingStatus !== 'FULLY_RECEIVED' && (
            <button
              onClick={() => openReceiveForPo(o)}
              className="px-2 py-0.5 rounded bg-stone-900 text-stone-50 text-[10px] font-mono hover:bg-stone-800 transition cursor-pointer"
            >
              Receive
            </button>
          )}
          <button
            onClick={() => setSelectedPo(o)}
            className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="View PO Details"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => openEditPo(o)}
            className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="Edit Purchase Order"
          >
            <Edit3 size={13} />
          </button>
          {o.receivingStatus !== 'FULLY_RECEIVED' && (
            <button
              onClick={() => handleDeletePo(o.id, o.poNumber)}
              className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
              title="Delete Purchase Order"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  // TAB 3: REORDER RADAR COLUMNS
  const reorderColumns: Column<LowStockAlert>[] = [
    {
      key: 'title',
      header: 'Product',
      className: 'min-w-[180px] font-medium text-stone-900 whitespace-nowrap',
      render: (item) => (
        <div className="truncate">
          <span className="text-xs font-medium text-stone-900 truncate block">
            {item.title || item.titleEn || 'Unnamed Product'}
          </span>
          <span className="text-[10px] text-stone-400 font-mono truncate block">
            {item.brand || item.brandName || 'EyeNova'}
          </span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'w-32 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (item) => <span className="truncate block">{item.sku}</span>,
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      className: 'w-28 text-center whitespace-nowrap',
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-rose-700 tabular-nums truncate block">
          {item.currentStock ?? item.stockQuantity ?? 0} pcs
        </span>
      ),
    },
    {
      key: 'suggestedReorder',
      header: 'Suggested Reorder',
      className: 'w-32 text-center whitespace-nowrap',
      render: (item) => (
        <span className="font-mono text-xs font-medium text-stone-900 tabular-nums truncate block">
          +{item.suggestedReorder} pcs
        </span>
      ),
    },
    {
      key: 'estimatedCostQar',
      header: 'Est. Cost',
      className: 'w-32 text-right whitespace-nowrap',
      render: (item) => (
        <span className="font-mono text-xs text-stone-700 tabular-nums truncate block">
          {formatQar(item.estimatedCostQar ?? item.costEstimateQar ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'w-24 text-right whitespace-nowrap',
      render: (item) => (
        <button
          onClick={() => {
            setIsCreatePoOpen(true);
            const matchedSup = suppliers.find((s) => isProductAssociatedWithSupplier(item as any, s));
            if (matchedSup) {
              setPoSupplierId(matchedSup.id);
            }
            setItemProductId(item.id);
            setItemQty(String(item.suggestedReorder));
          }}
          className="px-2 py-0.5 rounded bg-stone-900 text-stone-50 text-[10px] font-mono hover:bg-stone-800 transition cursor-pointer"
        >
          Add to PO
        </button>
      ),
    },
  ];

  // TAB 4: SUPPLIERS COLUMNS
  const supplierColumns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      className: 'min-w-[180px] font-medium text-stone-900 whitespace-nowrap',
      render: (sup) => (
        <div className="truncate">
          <span className="text-xs font-semibold text-stone-900 truncate block">{sup.name}</span>
          {sup.code && (
            <span className="text-[10px] text-stone-400 font-mono truncate block">{sup.code}</span>
          )}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      className: 'w-36 text-stone-700 whitespace-nowrap',
      render: (sup) => <span className="truncate block text-xs">{sup.contactPerson || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'w-36 font-mono text-[11px] text-stone-600 whitespace-nowrap',
      render: (sup) => <span className="truncate block">{sup.phone || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      className: 'w-44 font-mono text-[11px] text-stone-500 whitespace-nowrap',
      render: (sup) => <span className="truncate block">{sup.email || '—'}</span>,
    },
    {
      key: 'creditTerms',
      header: 'Payment Terms',
      className: 'w-28 whitespace-nowrap',
      render: (sup) => (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200 truncate">
          {sup.creditTerms || 'COD'}
        </span>
      ),
    },
    {
      key: 'brandScope',
      header: 'Brand Scope',
      className: 'w-40 whitespace-nowrap',
      render: (sup) => (
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider border truncate ${
            sup.isMultiBrand
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {sup.isMultiBrand ? 'Multi-Brand Wholesaler' : `Specific (${sup.name})`}
        </span>
      ),
    },
    {
      key: 'activeOrdersCount',
      header: 'Active POs',
      className: 'w-24 text-center whitespace-nowrap',
      render: (sup) => (
        <span className="font-mono text-xs text-stone-700 tabular-nums truncate block">
          {sup.activeOrdersCount}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20 text-right whitespace-nowrap',
      render: (sup) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEditSupplier(sup)}
            className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition cursor-pointer"
            title="Edit Vendor"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => handleDeleteSupplier(sup.id, sup.name)}
            className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
            title="Delete Vendor"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Shell
      title="Purchases & Inbound Shipments"
      subtitle="Purchase order procurement, contact lens batch receiving (PWR/CYL/AX), and supplier registry"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 sm:gap-4 overflow-hidden bg-stone-100/60">
        {/* Top Action Header with Tab Selection and Primary Action CTAs */}
        <div className="bg-white border border-stone-200 rounded-lg p-2.5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 shrink-0 min-w-0">
          {/* Single-line Tab Switcher (Scrollable horizontally without clipping) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0 max-w-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === t.id
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action Buttons (Flex-wrap and gracefully stack when space is tight) */}
          <div className="flex items-center flex-wrap gap-2 w-full xl:w-auto justify-start sm:justify-end shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-stone-100 min-w-0">
            <button
              onClick={() => {
                setFormError('');
                setIsDirectInboundOpen(true);
              }}
              className="px-3 py-1.5 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Truck size={13} />
              <span>Direct Inbound</span>
            </button>

            <button
              onClick={() => {
                setFormError('');
                setIsReceivePoOpen(true);
              }}
              className="px-3 py-1.5 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <PackageCheck size={13} />
              <span>Receive PO</span>
            </button>

            <button
              onClick={() => {
                setFormError('');
                setIsCreatePoOpen(true);
              }}
              className="px-3 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus size={13} />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Tab 1: SHIPMENTS VIEW */}
        {activeTab === 'SHIPMENTS' && (
          <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
            <DataTable
              data={shipments}
              columns={shipmentColumns}
              keyExtractor={(s) => s.id}
              searchQuery={search}
              searchFields={[
                (s) => s.invoiceNumber,
                (s) => s.supplierName,
                (s) => s.operatorName,
              ]}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyTitle="No inbound shipments recorded"
              emptyDescription={loading ? 'Loading shipments...' : 'No goods received notes found.'}
              renderCard={(s) => (
                <>
                  <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                    <span className="font-mono font-medium text-xs text-stone-900 truncate">
                      {s.invoiceNumber || 'GRN Shipment'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums shrink-0">
                      {formatQar(s.totalCostQar)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                    <span className="truncate">{s.supplierName}</span>
                    <span className="font-mono text-[10px] text-stone-400 shrink-0">{s.itemsCount} lines</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400 min-w-0 pt-1 border-t border-stone-50">
                    <span className="truncate">{s.operatorName} • {s.receivedAt}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setIsEditingShipment(false);
                          setSelectedShipment(s);
                        }}
                        className="p-1 rounded bg-stone-100 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="View"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => openEditShipment(s)}
                        className="p-1 rounded bg-stone-100 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteShipment(s.id, s.invoiceNumber)}
                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            />
          </div>
        )}

        {/* Tab 2: ORDERS VIEW */}
        {activeTab === 'ORDERS' && (
          <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
            <DataTable
              data={orders}
              columns={orderColumns}
              keyExtractor={(o) => o.id}
              searchQuery={search}
              searchFields={[
                (o) => o.poNumber,
                (o) => o.supplierName,
                (o) => o.receivingStatus,
              ]}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyTitle="No purchase orders found"
              emptyDescription={loading ? 'Loading orders...' : 'No official POs recorded.'}
              renderCard={(o) => (
                <>
                  <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                    <span className="font-mono font-medium text-xs text-stone-900 truncate">
                      {o.poNumber}
                    </span>
                    <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums shrink-0">
                      {formatQar(o.totalAmountQar)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                    <span className="truncate">{o.supplierName}</span>
                    <span className="font-mono text-[10px] text-stone-400 shrink-0">
                      {o.totalUnitsReceived}/{o.totalUnitsOrdered} pcs
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono min-w-0 pt-1 border-t border-stone-50">
                    <span className="text-stone-500 truncate">{o.orderDate}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {o.receivingStatus !== 'FULLY_RECEIVED' && (
                        <button
                          onClick={() => openReceiveForPo(o)}
                          className="px-1.5 py-0.5 rounded bg-stone-900 text-stone-50 text-[10px] font-mono hover:bg-stone-800 transition cursor-pointer"
                        >
                          Receive
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPo(o)}
                        className="p-1 rounded bg-stone-100 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="View"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => openEditPo(o)}
                        className="p-1 rounded bg-stone-100 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      {o.receivingStatus !== 'FULLY_RECEIVED' && (
                        <button
                          onClick={() => handleDeletePo(o.id, o.poNumber)}
                          className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            />
          </div>
        )}

        {/* Tab 3: REORDER RADAR VIEW */}
        {activeTab === 'REORDER' && (
          <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
            <DataTable
              data={lowStock}
              columns={reorderColumns}
              keyExtractor={(item) => item.id}
              searchQuery={search}
              searchFields={[
                (item) => item.title || item.titleEn || '',
                (item) => item.brand || item.brandName || '',
                (item) => item.sku || '',
              ]}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyTitle="Stock is fully healthy"
              emptyDescription="No products are currently under reorder threshold."
              renderCard={(item) => (
                <>
                  <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                    <span className="font-medium text-xs text-stone-900 truncate">
                      {item.title || item.titleEn || 'Unnamed Product'}
                    </span>
                    <span className="font-mono text-xs font-semibold text-rose-700 tabular-nums shrink-0">
                      {item.currentStock ?? item.stockQuantity ?? 0} in stock
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                    <span className="truncate font-mono">
                      {item.brand || item.brandName || 'EyeNova'} • {item.sku}
                    </span>
                    <span className="font-mono text-[10px] text-stone-900 font-semibold shrink-0">
                      +{item.suggestedReorder} pcs
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400 min-w-0">
                    <span className="truncate">Est: {formatQar(item.estimatedCostQar ?? item.costEstimateQar ?? 0)}</span>
                    <button
                      onClick={() => {
                        setIsCreatePoOpen(true);
                        const matchedSup = suppliers.find((s) => isProductAssociatedWithSupplier(item as any, s));
                        if (matchedSup) {
                          setPoSupplierId(matchedSup.id);
                        }
                        setItemProductId(item.id);
                        setItemQty(String(item.suggestedReorder));
                      }}
                      className="px-2 py-0.5 rounded bg-stone-900 text-stone-50 text-[10px] font-mono"
                    >
                      Add to PO
                    </button>
                  </div>
                </>
              )}
            />
          </div>
        )}

        {/* Tab 4: SUPPLIERS DIRECTORY VIEW */}
        {activeTab === 'SUPPLIERS' && (
          <div className="flex-1 min-h-0 bg-white border border-stone-200 rounded-lg flex flex-col overflow-hidden">
            <div className="p-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-mono font-medium text-stone-700 uppercase tracking-wider">
                Vendor Registry ({suppliers.length})
              </span>
              <button
                onClick={() => {
                  setFormError('');
                  setIsAddVendorOpen(true);
                }}
                className="px-2.5 py-1 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Vendor</span>
              </button>
            </div>

            <DataTable
              data={suppliers}
              columns={supplierColumns}
              keyExtractor={(sup) => sup.id}
              searchQuery={search}
              searchFields={[
                (sup) => sup.name,
                (sup) => sup.contactPerson,
                (sup) => sup.phone,
                (sup) => sup.email,
              ]}
              pageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              emptyTitle="No vendors registered"
              emptyDescription="Add vendors to track purchase orders."
              renderCard={(sup) => (
                <>
                  <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                    <span className="font-medium text-xs text-stone-900 truncate">
                      {sup.name}
                    </span>
                    <span className="font-mono text-xs font-semibold text-stone-700 shrink-0">
                      {sup.activeOrdersCount} POs
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] min-w-0 text-stone-600">
                    <span className="truncate">{sup.contactPerson || 'No contact'}</span>
                    <span className="font-mono text-[10px] text-stone-400 shrink-0">{sup.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-400 min-w-0 pt-1 border-t border-stone-50">
                    <span className="truncate">{sup.email || '—'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditSupplier(sup)}
                        className="p-1 rounded bg-stone-100 text-stone-600 hover:text-stone-900 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            />
          </div>
        )}
      </div>

      {/* MODAL 1: Create Purchase Order (PO) */}
      {isCreatePoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                {editingPoId ? <Edit3 size={14} className="text-stone-500" /> : <Plus size={14} className="text-stone-500" />}
                <span>{editingPoId ? `Edit Purchase Order (${poNumber || 'PO'})` : 'Create Official Purchase Order (PO)'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreatePoOpen(false);
                  setEditingPoId(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitCreatePo} className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Supplier</label>
                  <SearchableSelect
                    options={poSupplierOptions}
                    value={poSupplierId}
                    onChange={(newId) => {
                      setPoSupplierId(newId);
                      const targetSup = suppliers.find((s) => s.id === newId);
                      if (itemProductId) {
                        const currentP = catalogProducts.find((p) => p.id === itemProductId);
                        if (currentP && !isProductAssociatedWithSupplier(currentP, targetSup)) {
                          setItemProductId('');
                        }
                      }
                    }}
                    placeholder="Search or select supplier..."
                    searchPlaceholder="Search vendor by name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poExpectedDelivery}
                    onChange={(e) => setPoExpectedDelivery(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              {/* Add Item Row */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                <span className="text-[11px] font-mono font-medium text-stone-700 uppercase tracking-wider block">
                  Add Catalog Line Item
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-stone-600 text-[10px]">
                        Product {selectedPoSupplier ? `(${poAvailableProducts.length} items from ${selectedPoSupplier.isMultiBrand ? 'All Brands' : selectedPoSupplier.name})` : ''}
                      </label>
                      {selectedPoSupplier && !selectedPoSupplier.isMultiBrand && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Filtered to {selectedPoSupplier.name}
                        </span>
                      )}
                      {selectedPoSupplier?.isMultiBrand && (
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Multi-Brand Wholesaler
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      options={poProductOptions}
                      value={itemProductId}
                      onChange={(id) => {
                        setItemProductId(id);
                        const p = catalogProducts.find((cp) => cp.id === id);
                        if (p?.costPrice) setItemCost(String(p.costPrice));
                        if (!isToricProduct(p)) {
                          setItemCylinder('');
                          setItemAxis('');
                        }
                      }}
                      placeholder={
                        !poSupplierId
                          ? 'Select a supplier first...'
                          : poAvailableProducts.length === 0
                          ? `No catalog products for ${selectedPoSupplier?.name || 'this vendor'}`
                          : 'Search product by name, SKU, brand...'
                      }
                      searchPlaceholder="Type product name or SKU..."
                      disabled={!poSupplierId || poAvailableProducts.length === 0}
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 text-[10px] mb-0.5">Quantity (pcs)</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 text-[10px] mb-0.5">Cost Price (QAR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                    />
                  </div>

                  {isSelectedPoOptical && (
                    <div>
                      <label className="block text-stone-600 text-[10px] mb-0.5">Power (PWR)</label>
                      <SearchableSelect
                        options={poPowerOptions}
                        value={itemIsPlano ? '0.00' : itemPower}
                        onChange={(val) => {
                          const isPlano = val === '0.00' || val.toLowerCase().includes('plano');
                          setItemPower(val);
                          setItemIsPlano(isPlano);
                        }}
                        placeholder="Select PWR..."
                        searchPlaceholder="Type power..."
                      />
                    </div>
                  )}

                  {isSelectedPoOptical && isSelectedPoToric && (
                    <>
                      <div>
                        <label className="block text-stone-600 text-[10px] mb-0.5">Cylinder (CYL)</label>
                        <SearchableSelect
                          options={poCylOptions}
                          value={itemCylinder}
                          onChange={(val) => setItemCylinder(val)}
                          placeholder="Select CYL..."
                          searchPlaceholder="Search cylinder..."
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 text-[10px] mb-0.5">Axis</label>
                        <SearchableSelect
                          options={poAxisOptions}
                          value={itemAxis}
                          onChange={(val) => setItemAxis(val)}
                          placeholder="Select Axis..."
                          searchPlaceholder="Search axis..."
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    disabled={!selectedPoProduct}
                    className="px-3 py-1 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
                  >
                    + Add Line to PO
                  </button>
                </div>
              </div>

              {/* Draft Items List */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block">
                  PO Items ({draftItems.length})
                </span>
                {draftItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 border border-stone-200 rounded">
                    No items added yet.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded max-h-40 overflow-y-auto">
                    {draftItems.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-stone-900 block truncate">{item.productTitle}</span>
                          <span className="text-[10px] text-stone-400 font-mono block truncate">
                            PWR: {item.power || 'Plano'} • {item.quantity} pcs @ {formatQar(item.unitCostQar)}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-stone-900 tabular-nums shrink-0">
                          {formatQar(item.totalCostQar)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatePoOpen(false);
                    setEditingPoId(null);
                  }}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || draftItems.length === 0}
                  className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{editingPoId ? 'Save Changes' : 'Issue Purchase Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Receive PO Shipment (GRN) */}
      {isReceivePoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-md overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                <PackageCheck size={14} className="text-stone-500" />
                <span>Receive Shipment against PO (Inbound GRN)</span>
              </h3>
              <button
                onClick={() => setIsReceivePoOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitReceivePo} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-stone-700 font-medium mb-1">Select Purchase Order</label>
                <SearchableSelect
                  options={receivePoOptions}
                  value={selectedReceivingPoId}
                  onChange={(val) => setSelectedReceivingPoId(val)}
                  placeholder="Search or select PO to receive..."
                  searchPlaceholder="Search by PO number or vendor..."
                  required
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Delivery Note / Invoice #</label>
                <input
                  type="text"
                  required
                  value={recvDeliveryNote}
                  onChange={(e) => setRecvDeliveryNote(e.target.value)}
                  placeholder="e.g. DN-2026-904"
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Delivered By</label>
                  <input
                    type="text"
                    value={recvDeliveredBy}
                    onChange={(e) => setRecvDeliveredBy(e.target.value)}
                    placeholder="Courier / Driver"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={recvRepContact}
                    onChange={(e) => setRecvRepContact(e.target.value)}
                    placeholder="Phone #"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Settlement Payment Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecvPaymentChannel('BANK')}
                    className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition cursor-pointer ${
                      recvPaymentChannel === 'BANK'
                        ? 'bg-stone-900 text-stone-50 border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecvPaymentChannel('CASH')}
                    className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition cursor-pointer ${
                      recvPaymentChannel === 'CASH'
                        ? 'bg-stone-900 text-stone-50 border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Cash / Safe
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsReceivePoOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedReceivingPoId}
                  className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Record GRN Receiving</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Direct Inbound (Stock-In Without PO) */}
      {isDirectInboundOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                <Truck size={14} className="text-stone-500" />
                <span>Direct Inbound Stock-In (Fast GRN)</span>
              </h3>
              <button
                onClick={() => setIsDirectInboundOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitDirectInbound} className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
              {formError && (
                <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    required
                    list="dir-supplier-list"
                    value={dirSupplier}
                    onChange={(e) => {
                      const newSupName = e.target.value;
                      setDirSupplier(newSupName);
                      if (dirProductId) {
                        const curP = catalogProducts.find((p) => p.id === dirProductId);
                        const matchedSup = suppliers.find(
                          (s) => s.name.toLowerCase() === newSupName.trim().toLowerCase()
                        );
                        if (curP && matchedSup && !isProductAssociatedWithSupplier(curP, matchedSup)) {
                          setDirProductId('');
                        }
                      }
                    }}
                    placeholder="Type or select supplier..."
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                  />
                  <datalist id="dir-supplier-list">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.isMultiBrand ? `${s.name} (Multi-Brand Wholesaler)` : `${s.name} (Brand Specific)`}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Invoice / Delivery #</label>
                  <input
                    type="text"
                    value={dirInvoiceNo}
                    onChange={(e) => setDirInvoiceNo(e.target.value)}
                    placeholder="Invoice #"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-700 font-medium">Product</label>
                  {dirSupplier.trim() && (
                    <span className="text-[10px] font-mono text-stone-500">
                      {dirAvailableProducts.length} items available
                    </span>
                  )}
                </div>
                <SearchableSelect
                  options={dirProductOptions}
                  value={dirProductId}
                  onChange={(id) => {
                    setDirProductId(id);
                    const p = catalogProducts.find((cp) => cp.id === id);
                    if (p?.costPrice) setDirUnitCost(String(p.costPrice));
                    if (!isToricProduct(p)) {
                      setDirCylinder('');
                      setDirAxis('');
                    }
                  }}
                  placeholder="Search product by name, SKU, brand..."
                  searchPlaceholder="Type product name or SKU..."
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={dirQty}
                    onChange={(e) => setDirQty(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">FOC (Free Qty)</label>
                  <input
                    type="number"
                    min="0"
                    value={dirFocQty}
                    onChange={(e) => setDirFocQty(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Unit Cost (QAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dirUnitCost}
                    onChange={(e) => setDirUnitCost(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    required
                    value={dirBatchNo}
                    onChange={(e) => setDirBatchNo(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Expiry Date (FEFO)</label>
                  <input
                    type="text"
                    required
                    value={dirExpiry}
                    onChange={(e) => setDirExpiry(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              {isSelectedDirOptical && (
                <div
                  className={`p-2 bg-stone-50 border border-stone-200 rounded ${
                    isSelectedDirToric ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1 max-w-[200px]'
                  }`}
                >
                  <div>
                    <label className="block text-stone-600 text-[10px] mb-0.5">Power (PWR)</label>
                    <SearchableSelect
                      options={dirPowerOptions}
                      value={dirIsPlano ? '0.00' : dirPower}
                      onChange={(val) => {
                        const isPlano = val === '0.00' || val.toLowerCase().includes('plano');
                        setDirPower(val);
                        setDirIsPlano(isPlano);
                      }}
                      placeholder="Select PWR..."
                      searchPlaceholder="Search power..."
                    />
                  </div>

                  {isSelectedDirToric && (
                    <>
                      <div>
                        <label className="block text-stone-600 text-[10px] mb-0.5">Cylinder (CYL)</label>
                        <SearchableSelect
                          options={poCylOptions}
                          value={dirCylinder}
                          onChange={(val) => setDirCylinder(val)}
                          placeholder="Select CYL..."
                          searchPlaceholder="Search cylinder..."
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 text-[10px] mb-0.5">Axis</label>
                        <SearchableSelect
                          options={poAxisOptions}
                          value={dirAxis}
                          onChange={(val) => setDirAxis(val)}
                          placeholder="Select Axis..."
                          searchPlaceholder="Search axis..."
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsDirectInboundOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Stock-In Directly</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: View / Edit Shipment GRN */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 truncate flex items-center gap-1.5">
                {isEditingShipment ? <Edit3 size={14} className="text-stone-500" /> : <PackageCheck size={14} className="text-stone-500" />}
                <span>
                  {isEditingShipment
                    ? `Edit Inbound Shipment (GRN) — ${selectedShipment.invoiceNumber}`
                    : `Goods Received Note (GRN) — ${selectedShipment.invoiceNumber}`}
                </span>
              </h3>
              <button
                onClick={() => {
                  setSelectedShipment(null);
                  setIsEditingShipment(false);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {isEditingShipment ? (
              <form onSubmit={handleSaveShipment} className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
                {formError && (
                  <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                    {formError}
                  </div>
                )}

                <div className="p-3 bg-stone-50 rounded border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase block mb-1">Supplier</span>
                  <span className="font-semibold text-stone-900 text-xs">{selectedShipment.supplierName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">GRN / Invoice #</label>
                    <input
                      type="text"
                      required
                      value={editShipmentInvoice}
                      onChange={(e) => setEditShipmentInvoice(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Delivered By</label>
                    <input
                      type="text"
                      value={editShipmentDeliveredBy}
                      onChange={(e) => setEditShipmentDeliveredBy(e.target.value)}
                      placeholder="Delivery courier / driver"
                      className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Supplier Rep Contact</label>
                    <input
                      type="text"
                      value={editShipmentContact}
                      onChange={(e) => setEditShipmentContact(e.target.value)}
                      placeholder="Representative phone / contact"
                      className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Notes / Remarks</label>
                    <input
                      type="text"
                      value={editShipmentNotes}
                      onChange={(e) => setEditShipmentNotes(e.target.value)}
                      placeholder="Optional notes"
                      className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingShipment(false)}
                    className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Save GRN Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
                  <div className="p-3 bg-stone-50 rounded border border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-stone-400 block uppercase">Supplier</span>
                      <span className="font-semibold text-stone-900 block truncate">{selectedShipment.supplierName}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block uppercase">Received Date</span>
                      <span className="text-stone-700 block truncate">{selectedShipment.receivedAt}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block uppercase">Total Cost</span>
                      <span className="font-semibold text-stone-900 block tabular-nums">{formatQar(selectedShipment.totalCostQar)}</span>
                    </div>
                  </div>

                  {(selectedShipment.deliveredByName || selectedShipment.supplierRepContact || selectedShipment.notes) && (
                    <div className="p-2.5 bg-stone-50/80 rounded border border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      {selectedShipment.deliveredByName && (
                        <div>
                          <span className="text-stone-400 block text-[10px]">Delivered By</span>
                          <span className="text-stone-800 font-medium">{selectedShipment.deliveredByName}</span>
                        </div>
                      )}
                      {selectedShipment.supplierRepContact && (
                        <div>
                          <span className="text-stone-400 block text-[10px]">Supplier Rep</span>
                          <span className="text-stone-800 font-medium">{selectedShipment.supplierRepContact}</span>
                        </div>
                      )}
                      {selectedShipment.notes && (
                        <div>
                          <span className="text-stone-400 block text-[10px]">Notes</span>
                          <span className="text-stone-800">{selectedShipment.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block mb-1">
                      Received Items ({selectedShipment.items.length})
                    </span>
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded overflow-hidden">
                      {selectedShipment.items.map((it) => (
                        <div key={it.id} className="p-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-stone-900 block truncate">{it.productTitle}</span>
                            <span className="text-[10px] text-stone-400 font-mono block truncate">
                              Batch: {it.batchNumber} • Exp: {it.expiryDate || 'N/A'} • PWR: {it.power || 'Plano'}
                            </span>
                          </div>
                          <div className="text-right shrink-0 font-mono">
                            <span className="font-medium text-stone-900 block tabular-nums">{it.quantity} pcs</span>
                            <span className="text-[10px] text-stone-500 block tabular-nums">{formatQar(it.totalCostQar)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 border-t border-stone-200 flex justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditShipment(selectedShipment)}
                      className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit GRN</span>
                    </button>
                    <button
                      onClick={() => handleDeleteShipment(selectedShipment.id, selectedShipment.invoiceNumber)}
                      className="px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => setSelectedShipment(null)}
                      className="px-3 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: View PO Details */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 truncate">
                Purchase Order Details — {selectedPo.poNumber}
              </h3>
              <button
                onClick={() => setSelectedPo(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-stone-50 rounded border border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-stone-400 block uppercase">Supplier</span>
                  <span className="font-semibold text-stone-900 block truncate">{selectedPo.supplierName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase">Order Date</span>
                  <span className="text-stone-700 block truncate">{selectedPo.orderDate}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase">Status</span>
                  <span className="font-semibold text-stone-900 block truncate">{selectedPo.receivingStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider block mb-1">
                  Ordered Items ({selectedPo.items.length})
                </span>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded overflow-hidden">
                  {selectedPo.items.map((it) => (
                    <div key={it.id} className="p-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-stone-900 block truncate">{it.productTitle}</span>
                        <span className="text-[10px] text-stone-400 font-mono block truncate">
                          PWR: {it.power || 'Plano'} • SKU: {it.sku}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-medium text-stone-900 block tabular-nums">
                          {it.receivedQuantity} / {it.orderedQuantity} pcs
                        </span>
                        <span className="text-[10px] text-stone-500 block tabular-nums">{formatQar(it.totalCostQar)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-stone-200 flex justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const po = selectedPo;
                    setSelectedPo(null);
                    openEditPo(po);
                  }}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit PO</span>
                </button>
                {selectedPo.receivingStatus !== 'FULLY_RECEIVED' && (
                  <button
                    onClick={() => handleDeletePo(selectedPo.id, selectedPo.poNumber)}
                    className="px-3 py-1.5 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedPo.receivingStatus !== 'FULLY_RECEIVED' && (
                  <button
                    onClick={() => {
                      const po = selectedPo;
                      setSelectedPo(null);
                      openReceiveForPo(po);
                    }}
                    className="px-3 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 cursor-pointer"
                  >
                    Receive Shipment
                  </button>
                )}
                <button
                  onClick={() => setSelectedPo(null)}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Add / Edit Vendor */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-stone-200 w-full max-w-md overflow-hidden shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                {editingSupplierId ? <Edit3 size={14} className="text-stone-500" /> : <Building2 size={14} className="text-stone-500" />}
                <span>{editingSupplierId ? 'Edit Supplier Profile' : 'Add Supplier / Vendor'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddVendorOpen(false);
                  setEditingSupplierId(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitAddVendor} className="p-4 space-y-3 text-xs">
              {formError && (
                <div className="p-2 rounded bg-stone-100 border border-stone-300 text-stone-700 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-stone-700 font-medium mb-1">Company / Vendor Name</label>
                <input
                  type="text"
                  required
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g. Alcon Qatar W.L.L."
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={vContact}
                    onChange={(e) => setVContact(e.target.value)}
                    placeholder="Full name"
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Phone #</label>
                  <input
                    type="text"
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="+974 ..."
                    className="w-full p-2 bg-white border border-stone-300 rounded text-xs font-mono text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={vEmail}
                  onChange={(e) => setVEmail(e.target.value)}
                  placeholder="orders@vendor.qa"
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Brand Scope</label>
                  <SearchableSelect
                    options={brandScopeOptions}
                    value={vIsMultiBrand ? 'MULTI' : 'SINGLE'}
                    onChange={(val) => setVIsMultiBrand(val === 'MULTI')}
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Payment Terms</label>
                  <SearchableSelect
                    options={creditTermsOptions}
                    value={vCreditTerms}
                    onChange={(val) => setVCreditTerms(val)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  placeholder={
                    vIsMultiBrand
                      ? 'Optional: list brands e.g. Brands: Alcon, Bausch + Lomb'
                      : 'Additional remarks'
                  }
                  className="w-full p-2 bg-white border border-stone-300 rounded text-xs text-stone-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddVendorOpen(false);
                    setEditingSupplierId(null);
                  }}
                  className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{editingSupplierId ? 'Save Changes' : 'Save Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

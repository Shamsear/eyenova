'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/shell';
import { formatQar, formatQatarDate } from '@/lib/utils';
import { ProductItem, PowerPriceTier } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { StatusIndicator, StatusVariant } from '@/components/shared/status-indicator';
import { usePosStore } from '@/stores/pos-store';
import {
  Eye,
  Pencil,
  Plus,
  X,
  Layers,
  Calendar,
  Tag,
  Camera,
  Upload,
  Save,
  Check,
  Trash2,
  Loader2,
  Package,
  AlertCircle,
  DollarSign,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { BulkAvailabilityModal } from '@/components/shared/BulkAvailabilityModal';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  COLORED_CONTACT_LENSES: 'Colored Lenses',
  MEDICAL_CONTACT_LENSES: 'Medical Lenses',
  LENS_SOLUTION_CARE: 'Solutions & Care',
  LASHES_BEAUTY: 'Beauty & Lashes',
  SPECTACLES: 'Frames & Spectacles',
  SUNGLASSES: 'Sunglasses',
  ACCESSORY: 'Accessories',
};

const STANDARD_CATEGORIES = [
  { value: 'COLORED_CONTACT_LENSES', label: 'Colored Lenses' },
  { value: 'MEDICAL_CONTACT_LENSES', label: 'Medical Lenses' },
  { value: 'LENS_SOLUTION_CARE', label: 'Solutions & Care' },
  { value: 'LASHES_BEAUTY', label: 'Beauty & Lashes' },
  { value: 'SPECTACLES', label: 'Frames & Spectacles' },
  { value: 'SUNGLASSES', label: 'Sunglasses' },
  { value: 'ACCESSORY', label: 'Accessories' },
];

function formatCategoryLabel(type: string): string {
  if (CATEGORY_LABEL_MAP[type]) return CATEGORY_LABEL_MAP[type];
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStockStatus(qty: number, minAlert: number): { label: string; variant: StatusVariant } {
  if (qty <= 0) return { label: 'Out of Stock', variant: 'danger' };
  if (qty <= minAlert) return { label: `${qty} Low Stock`, variant: 'warning' };
  return { label: `${qty} In Stock`, variant: 'success' };
}

export default function ProductsPage() {
  const { showToast } = usePosStore();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Inspector / Editor Modal State
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [modalTab, setModalTab] = useState<'EDIT' | 'BATCHES' | 'TIERS' | 'VIEW'>('EDIT');
  const [editTiers, setEditTiers] = useState<PowerPriceTier[]>([]);
  const [tierName, setTierName] = useState('');
  const [tierMin, setTierMin] = useState('');
  const [tierMax, setTierMax] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierRequiresCyl, setTierRequiresCyl] = useState(false);
  const [tierRequiresAdd, setTierRequiresAdd] = useState(false);
  const [isSavingTiers, setIsSavingTiers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Form Fields for Editing
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleAr, setEditTitleAr] = useState('');
  const [editBrandName, setEditBrandName] = useState('');
  const [editProductType, setEditProductType] = useState('COLORED_CONTACT_LENSES');
  const [editSalePrice, setEditSalePrice] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editStockQuantity, setEditStockQuantity] = useState('');
  const [editMinStockAlert, setEditMinStockAlert] = useState('3');
  const [editSku, setEditSku] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editBaseCurve, setEditBaseCurve] = useState('');
  const [editDiameter, setEditDiameter] = useState('');
  const [editWaterContent, setEditWaterContent] = useState('');
  const [editReplacementSchedule, setEditReplacementSchedule] = useState('');

  // Add Batch Form State inside Product Modal
  const [batchNo, setBatchNo] = useState('');
  const [batchPower, setBatchPower] = useState('');
  const [batchQty, setBatchQty] = useState('1');
  const [batchExpiry, setBatchExpiry] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

  // New Product Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newProductType, setNewProductType] = useState('COLORED_CONTACT_LENSES');
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newStockQty, setNewStockQty] = useState('0');
  const [newMinStockAlert, setNewMinStockAlert] = useState('3');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const openProductModal = (p: ProductItem, tab: 'EDIT' | 'BATCHES' | 'TIERS' | 'VIEW' = 'EDIT') => {
    setEditingProduct(p);
    setModalTab(tab);
    setEditTitleEn(p.titleEn || '');
    setEditTitleAr(p.titleAr || '');
    setEditBrandName(p.brandName || '');
    setEditProductType(p.productType || 'COLORED_CONTACT_LENSES');
    setEditSalePrice(String(p.salePriceQar ?? p.basePriceQar ?? 0));
    setEditBasePrice(String(p.basePriceQar ?? 0));
    setEditCostPrice(String(p.costPriceQar ?? 0));
    setEditStockQuantity(String(p.stockQuantity ?? 0));
    setEditMinStockAlert(String(p.minStockAlert ?? 3));
    setEditSku(p.sku || '');
    setEditBarcode(p.barcode || '');
    setEditBaseCurve(p.baseCurve ? String(p.baseCurve) : '');
    setEditDiameter(p.diameter ? String(p.diameter) : '');
    setEditWaterContent(p.waterContent || '');
    setEditReplacementSchedule(p.replacementSchedule || '');
    setEditError('');
    setBatchError('');
    const initialTiers: PowerPriceTier[] = Array.isArray(p.powerPriceTiers)
      ? p.powerPriceTiers
      : typeof p.powerPriceTiers === 'string'
      ? JSON.parse(p.powerPriceTiers)
      : [];
    setEditTiers(initialTiers);
    setTierName('');
    setTierMin('');
    setTierMax('');
    setTierPrice('');
    setTierRequiresCyl(false);
    setTierRequiresAdd(false);
  };

  const handleAddTier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tierName.trim()) {
      showToast('Validation Error', 'Please enter a name for this pricing tier.', false);
      return;
    }
    const priceNum = parseFloat(tierPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Validation Error', 'Please enter a valid retail price in QAR.', false);
      return;
    }

    const minNum = tierMin.trim() !== '' ? parseFloat(tierMin) : null;
    const maxNum = tierMax.trim() !== '' ? parseFloat(tierMax) : null;

    const newTier: PowerPriceTier = {
      id: `tier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: tierName.trim(),
      minPower: minNum !== null && !isNaN(minNum) ? minNum : null,
      maxPower: maxNum !== null && !isNaN(maxNum) ? maxNum : null,
      priceQar: priceNum,
      requiresCylinder: tierRequiresCyl,
      requiresAdd: tierRequiresAdd,
    };

    setEditTiers((prev) => [...prev, newTier]);
    setTierName('');
    setTierMin('');
    setTierMax('');
    setTierPrice('');
    setTierRequiresCyl(false);
    setTierRequiresAdd(false);
  };

  const handleRemoveTier = (id: string) => {
    setEditTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTierPrice = (id: string, price: number) => {
    setEditTiers((prev) => prev.map((t) => (t.id === id ? { ...t, priceQar: price } : t)));
  };

  const handleApplyPreset = (presetType: 'PLANO_VS_RX' | 'THREE_TIER' | 'TORIC') => {
    if (!editingProduct) return;
    const base = Number(editingProduct.salePriceQar ?? editingProduct.basePriceQar ?? 100);

    if (presetType === 'PLANO_VS_RX') {
      setEditTiers([
        {
          id: `tier_plano_${Date.now()}`,
          name: 'Plano (0.00 / No Power)',
          minPower: 0,
          maxPower: 0,
          priceQar: base,
          requiresCylinder: false,
          requiresAdd: false,
        },
        {
          id: `tier_rx_${Date.now()}`,
          name: 'Prescription (-0.50 to -12.00)',
          minPower: -12.00,
          maxPower: -0.50,
          priceQar: base + 20,
          requiresCylinder: false,
          requiresAdd: false,
        },
      ]);
    } else if (presetType === 'THREE_TIER') {
      setEditTiers([
        {
          id: `tier_plano_${Date.now()}`,
          name: 'Plano (0.00)',
          minPower: 0,
          maxPower: 0,
          priceQar: base,
          requiresCylinder: false,
          requiresAdd: false,
        },
        {
          id: `tier_std_${Date.now()}`,
          name: 'Standard RX (-0.50 to -6.00)',
          minPower: -6.00,
          maxPower: -0.50,
          priceQar: base + 20,
          requiresCylinder: false,
          requiresAdd: false,
        },
        {
          id: `tier_high_${Date.now()}`,
          name: 'High Power (-6.25 to -12.00)',
          minPower: -12.00,
          maxPower: -6.25,
          priceQar: base + 50,
          requiresCylinder: false,
          requiresAdd: false,
        },
      ]);
    } else if (presetType === 'TORIC') {
      setEditTiers([
        {
          id: `tier_sphere_${Date.now()}`,
          name: 'Spherical Lenses',
          minPower: -12.00,
          maxPower: 0,
          priceQar: base,
          requiresCylinder: false,
          requiresAdd: false,
        },
        {
          id: `tier_toric_${Date.now()}`,
          name: 'Toric / Astigmatism (with Cylinder)',
          priceQar: base + 50,
          requiresCylinder: true,
          requiresAdd: false,
        },
      ]);
    }
  };

  const handleSaveTiers = async () => {
    if (!editingProduct) return;
    setIsSavingTiers(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          powerPriceTiers: editTiers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = { ...editingProduct, powerPriceTiers: editTiers };
        setEditingProduct(updated);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        showToast('Pricing Tiers Saved', `Saved ${editTiers.length} tier(s) for ${editingProduct.titleEn}`, true);
      } else {
        showToast('Save Failed', data.error || 'Failed to save pricing tiers', false);
      }
    } catch (err: any) {
      showToast('Save Error', err.message || 'Network error saving tiers', false);
    } finally {
      setIsSavingTiers(false);
    }
  };

  const handleImageUpload = (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size must be less than 2MB');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        const res = await fetch('/api/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: productId,
            imageUrl: dataUrl,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingProduct((prev) => (prev ? { ...prev, imageUrl: dataUrl } : null));
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, imageUrl: dataUrl } : p)));
          showToast('Image Updated', 'Product photo updated successfully', true);
        }
      } catch (err) {
        console.error('Image update failed:', err);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async (productId: string) => {
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          imageUrl: null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingProduct((prev) => (prev ? { ...prev, imageUrl: null } : null));
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, imageUrl: null } : p)));
        showToast('Image Removed', 'Product photo removed', true);
      }
    } catch (err) {
      console.error('Failed to remove image:', err);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editTitleEn.trim()) {
      setEditError('Product title (English) is required.');
      return;
    }

    setIsSaving(true);
    setEditError('');
    try {
      const payload = {
        id: editingProduct.id,
        titleEn: editTitleEn.trim(),
        titleAr: editTitleAr.trim() || null,
        brandName: editBrandName.trim() || null,
        productType: editProductType,
        salePriceQar: parseFloat(editSalePrice) || 0,
        basePriceQar: parseFloat(editBasePrice || editSalePrice) || 0,
        costPriceQar: editingProduct.costPriceQar ?? (parseFloat(editCostPrice) || 0),
        stockQuantity: editingProduct.stockQuantity ?? (parseInt(editStockQuantity, 10) || 0),
        minStockAlert: parseInt(editMinStockAlert, 10) || 3,
        sku: editSku.trim() || editingProduct.sku,
        barcode: editBarcode.trim() || null,
        baseCurve: editingProduct.baseCurve ?? null,
        diameter: editingProduct.diameter ?? null,
        waterContent: editingProduct.waterContent ?? null,
        replacementSchedule: editingProduct.replacementSchedule ?? null,
      };

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updated: ProductItem = {
          ...editingProduct,
          ...payload,
        };
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        setEditingProduct(null);
        showToast('Product Updated', `Saved changes for ${updated.titleEn}`, true);
      } else {
        setEditError(data.error || 'Failed to update product');
      }
    } catch (err: any) {
      setEditError(err.message || 'Connection error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleEn.trim()) {
      setCreateError('Product title (English) is required.');
      return;
    }
    const sale = parseFloat(newSalePrice);
    if (isNaN(sale) || sale < 0) {
      setCreateError('Please enter a valid retail price.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: newTitleEn.trim(),
          titleAr: newTitleAr.trim() || undefined,
          brandName: newBrandName.trim() || 'EyeNova',
          productType: newProductType,
          salePriceQar: sale,
          costPriceQar: 0,
          stockQuantity: 0,
          minStockAlert: parseInt(newMinStockAlert, 10) || 3,
          sku: newSku.trim() || undefined,
          barcode: newBarcode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const created: ProductItem = {
          ...data.product,
          salePriceQar: Number(data.product.salePriceQar),
          basePriceQar: Number(data.product.basePriceQar),
          costPriceQar: Number(data.product.costPriceQar || 0),
          stockQuantity: Number(data.product.stockQuantity || 0),
          minStockAlert: Number(data.product.minStockAlert || 3),
          batches: [],
          availablePowers: [],
        };
        setProducts((prev) => [created, ...prev]);
        showToast('Product Created', `Added ${created.titleEn} to catalog`, true);
        setIsCreateModalOpen(false);
        // Reset inputs
        setNewTitleEn('');
        setNewTitleAr('');
        setNewBrandName('');
        setNewSalePrice('');
        setNewCostPrice('');
        setNewStockQty('0');
        setNewSku('');
        setNewBarcode('');
      } else {
        setCreateError(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Network error while creating');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!batchNo.trim()) {
      setBatchError('Batch / Lot number is required.');
      return;
    }
    if (!batchExpiry) {
      setBatchError('Expiry date is required.');
      return;
    }

    setIsAddingBatch(true);
    setBatchError('');
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productTitle: editingProduct.titleEn,
          batchNo: batchNo.trim(),
          specs: batchPower.trim() || 'Plano',
          expDate: batchExpiry,
          stockQty: batchQty || '1',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const addedQty = parseInt(batchQty || '1', 10);
        const updatedBatches = [
          ...(editingProduct.batches || []),
          {
            id: data.batch.id,
            batchNumber: data.batch.batchNumber,
            power: data.batch.power,
            cylinder: null,
            axis: null,
            addPower: null,
            quantity: addedQty,
            expiryDate: data.batch.expiryDate,
          },
        ];
        const updatedProduct: ProductItem = {
          ...editingProduct,
          batches: updatedBatches,
          stockQuantity: editingProduct.stockQuantity + addedQty,
        };
        setEditingProduct(updatedProduct);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
        showToast('Batch Added', `Batch ${batchNo.trim()} added with ${addedQty} units`, true);
        setBatchNo('');
        setBatchPower('');
        setBatchQty('1');
        setBatchExpiry('');
      } else {
        setBatchError(data.error || 'Failed to create batch');
      }
    } catch (err: any) {
      setBatchError(err.message || 'Error adding batch');
    } finally {
      setIsAddingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: string, qty: number) => {
    if (!editingProduct) return;
    if (!confirm('Are you sure you want to remove this batch lot?')) return;

    try {
      const res = await fetch(`/api/batches?id=${batchId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updatedBatches = (editingProduct.batches || []).filter((b) => b.id !== batchId);
        const updatedProduct: ProductItem = {
          ...editingProduct,
          batches: updatedBatches,
          stockQuantity: Math.max(0, editingProduct.stockQuantity - qty),
        };
        setEditingProduct(updatedProduct);
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
        showToast('Batch Removed', 'Batch removed from inventory', true);
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  // Derive categories dynamically from loaded products
  const categoryFilters = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const type = p.productType || 'OTHER';
      counts[type] = (counts[type] || 0) + 1;
    }

    const list: { id: string; label: string }[] = [
      { id: 'ALL', label: `All Products (${products.length})` },
    ];

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((type) => {
        if (counts[type] > 0) {
          list.push({
            id: type,
            label: `${formatCategoryLabel(type)} (${counts[type]})`,
          });
        }
      });

    return list;
  }, [products]);

  // Derive brand filters dynamically from loaded products
  const brandFilters = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const b = p.brandName?.trim() || 'Other';
      counts[b] = (counts[b] || 0) + 1;
    }

    const list: { id: string; label: string; count: number }[] = [
      { id: 'ALL', label: 'All Brands', count: products.length },
    ];

    Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .forEach((b) => {
        if (counts[b] > 0) {
          list.push({
            id: b,
            label: b,
            count: counts[b],
          });
        }
      });

    return list;
  }, [products]);

  // Comprehensive optical and luxury eyewear brands for dropdown selectors
  const availableBrands = React.useMemo(() => {
    const defaultBrands = [
      'Acuvue',
      'Air Optix',
      'Alcon',
      'Amara',
      'Anesthesia',
      'Bausch + Lomb',
      'Bella',
      'Cartier',
      'CooperVision',
      'Dahab',
      'Dailies',
      'Dior',
      'EyeNova',
      'FreshLook',
      'Gucci',
      'Lens Me',
      'Oakley',
      'Persol',
      'Police',
      'Prada',
      'Ray-Ban',
      'Silhouette',
      'Solotica',
      'Tom Ford',
      'Vogue',
    ];
    const set = new Set<string>(defaultBrands);
    products.forEach((p) => {
      if (p.brandName && p.brandName.trim()) {
        set.add(p.brandName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const categoryOptions = React.useMemo<SelectOption[]>(() => {
    return STANDARD_CATEGORIES.map((cat) => ({
      value: cat.value,
      label: cat.label,
    }));
  }, []);

  const editBrandOptions = React.useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = availableBrands.map((b) => ({ value: b, label: b }));
    if (editBrandName && !availableBrands.includes(editBrandName)) {
      list.unshift({ value: editBrandName, label: editBrandName });
    }
    return list;
  }, [availableBrands, editBrandName]);

  const newBrandOptions = React.useMemo<SelectOption[]>(() => {
    const list: SelectOption[] = availableBrands.map((b) => ({ value: b, label: b }));
    if (newBrandName && !availableBrands.includes(newBrandName)) {
      list.unshift({ value: newBrandName, label: newBrandName });
    }
    return list;
  }, [availableBrands, newBrandName]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const columns: Column<ProductItem>[] = [
    {
      key: 'titleEn',
      header: 'Product',
      render: (p) => (
        <div className="truncate">
          <span className="font-medium text-stone-900 truncate block leading-tight">{p.titleEn}</span>
          <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block leading-tight truncate">
            {p.brandName || 'EyeNova'}
          </span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU / Barcode',
      render: (p) => (
        <div className="truncate font-mono">
          <span className="text-xs text-stone-800 truncate block leading-tight">{p.sku}</span>
          <span className="text-[10px] text-stone-400 truncate block leading-tight">{p.barcode || 'No barcode'}</span>
        </div>
      ),
    },
    {
      key: 'productType',
      header: 'Category',
      render: (p) => (
        <span className="text-[11px] text-stone-600 truncate block">
          {p.productType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'salePriceQar',
      header: 'Retail Price',
      align: 'right',
      render: (p) => {
        const tiers = Array.isArray(p.powerPriceTiers)
          ? p.powerPriceTiers
          : typeof p.powerPriceTiers === 'string'
          ? (JSON.parse(p.powerPriceTiers || '[]') as any[])
          : [];
        const count = tiers.length;
        return (
          <div className="flex flex-col items-end">
            <span className="font-mono font-medium text-stone-900 tabular-nums truncate block">
              {formatQar(p.salePriceQar ?? p.basePriceQar)}
            </span>
            {count > 0 && (
              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 mt-0.5">
                {count} {count === 1 ? 'Tier' : 'Tiers'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'stockQuantity',
      header: 'Stock Status',
      render: (p) => {
        const status = getStockStatus(p.stockQuantity, p.minStockAlert);
        return <StatusIndicator status={status.label} variant={status.variant} />;
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openProductModal(p, 'EDIT')}
            className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded text-xs font-mono transition cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Edit product, pricing, stock and specs"
          >
            <Pencil size={11} />
            <span>Edit</span>
          </button>
          <button
            onClick={() => openProductModal(p, 'VIEW')}
            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-mono transition cursor-pointer flex items-center gap-1"
            title="View specifications & batches"
          >
            <Eye size={11} />
            <span>Details</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <Shell
      title="Product Catalog & Inventory Master"
      subtitle="Master Product Directory, Inventory Levels & Retail Pricing"
    >
      <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden">
        {/* Page Header (Single-Line) with New Product Action */}
        <PageHeader
          title="Products Catalog"
          subtitle={`${products.length} Products`}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search SKU, Barcode, Title, Brand..."
          filters={categoryFilters}
          activeFilter={selectedCategory}
          onFilterChange={setSelectedCategory}
          primaryAction={{
            label: 'New Product',
            onClick: () => setIsCreateModalOpen(true),
            icon: Plus,
          }}
          secondaryAction={{
            label: 'Bulk Excel Availability',
            onClick: () => setIsBulkModalOpen(true),
            icon: FileSpreadsheet,
          }}
        />

        {/* Brand Filter Bar */}
        {brandFilters.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs py-1.5 px-2 bg-stone-50 border border-stone-200 rounded-md shrink-0">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider shrink-0 font-medium">Brand Filter:</span>
            {brandFilters.map((b) => {
              const isSelected = selectedBrand === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-600 text-white font-medium shadow-none'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className={`text-[10px] tabular-nums ${isSelected ? 'text-amber-100' : 'text-stone-400'}`}>
                    ({b.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Universal DataTable */}
        <DataTable
          data={products}
          columns={columns}
          keyExtractor={(p) => p.id}
          searchQuery={search}
          searchFields={[
            (p) => p.titleEn,
            (p) => p.brandName || '',
            (p) => p.sku,
            (p) => p.barcode || '',
          ]}
          filterFn={(p) => {
            if (selectedCategory !== 'ALL' && p.productType !== selectedCategory) return false;
            if (selectedBrand !== 'ALL' && p.brandName?.trim() !== selectedBrand) return false;
            return true;
          }}
          pageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          renderCard={(p) => {
            const status = getStockStatus(p.stockQuantity, p.minStockAlert);
            return (
              <>
                <div className="flex items-center justify-between gap-2 min-w-0 pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 min-w-0 truncate font-mono text-[10px]">
                    <span className="font-medium text-stone-900 uppercase">{p.brandName || 'EyeNova'}</span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-500">{p.sku}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono truncate shrink-0">
                    {p.productType.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="py-0.5">
                  <span className="font-medium text-xs text-stone-900 truncate block">
                    {p.titleEn}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                  <span className="font-mono font-medium text-xs text-stone-900 tabular-nums">
                    {formatQar(p.salePriceQar ?? p.basePriceQar)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusIndicator status={status.label} variant={status.variant} />
                    <button
                      onClick={() => openProductModal(p, 'EDIT')}
                      className="px-2 py-0.5 bg-stone-900 text-stone-50 rounded text-[10px] font-mono cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openProductModal(p, 'VIEW')}
                      className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px] font-mono cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              </>
            );
          }}
        />

        {/* =========================================================================
            PRODUCT INSPECTOR & EDITOR MODAL (View, Edit & Manage Diopter Batches)
            ========================================================================= */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Modal Top Header */}
              <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-stone-900 truncate">
                      {editingProduct.titleEn}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 shrink-0">
                      {editingProduct.sku}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono block truncate mt-0.5">
                    Brand: {editingProduct.brandName || 'EyeNova'} · Stock: {editingProduct.stockQuantity} units
                  </span>
                </div>

                {/* Tab Switcher & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setModalTab('EDIT')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        modalTab === 'EDIT'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Pencil size={11} />
                      <span>Edit Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('BATCHES')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        modalTab === 'BATCHES'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Layers size={11} />
                      <span>Batches ({editingProduct.batches?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('TIERS')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        modalTab === 'TIERS'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <DollarSign size={11} />
                      <span>Power Pricing ({editTiers.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('VIEW')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        modalTab === 'VIEW'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Eye size={11} />
                      <span>Specs</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setEditingProduct(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition cursor-pointer"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-4">
                {/* TAB 1: EDIT PRODUCT DETAILS */}
                {modalTab === 'EDIT' && (
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    {editError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    {/* Image Header with Camera Upload */}
                    <div className="flex items-center gap-3.5 p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="relative group w-16 h-16 rounded-lg bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        {editingProduct.imageUrl ? (
                          <img
                            src={editingProduct.imageUrl}
                            alt={editingProduct.titleEn}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 font-mono text-base font-bold">
                            {editingProduct.titleEn.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <label
                          title="Upload or Change Image"
                          className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition"
                        >
                          <Camera size={16} />
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImage}
                            className="hidden"
                            onChange={(e) => handleImageUpload(editingProduct.id, e)}
                          />
                        </label>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-stone-900 block truncate">
                          Product Image & Visual Representation
                        </span>
                        <span className="text-[11px] text-stone-500 block truncate">
                          JPG, PNG or WEBP (Max 2MB). Shown in POS cart, catalog & receipts.
                        </span>
                        <div className="mt-1.5 flex items-center gap-3">
                          <label className="text-xs text-sky-700 hover:text-sky-900 font-medium cursor-pointer flex items-center gap-1">
                            <Upload size={12} />
                            <span>{uploadingImage ? 'Uploading photo...' : 'Upload Image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage}
                              className="hidden"
                              onChange={(e) => handleImageUpload(editingProduct.id, e)}
                            />
                          </label>
                          {editingProduct.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(editingProduct.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                            >
                              Remove photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Basic Info Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Product Name (English) *
                        </label>
                        <input
                          type="text"
                          required
                          value={editTitleEn}
                          onChange={(e) => setEditTitleEn(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                          placeholder="e.g. 1 Day Acuvue Moist"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Product Name (Arabic)
                          <span className="text-[10px] text-stone-400 font-normal ml-1">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          dir="auto"
                          value={editTitleAr}
                          onChange={(e) => setEditTitleAr(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                          placeholder="الاسم بالعربية (اختياري)"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Brand / Manufacturer
                        </label>
                        <SearchableSelect
                          value={editBrandName}
                          onChange={setEditBrandName}
                          options={editBrandOptions}
                          placeholder="Select Brand / Manufacturer..."
                          searchPlaceholder="Search brand..."
                          allowClear
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Product Category
                        </label>
                        <SearchableSelect
                          value={editProductType}
                          onChange={setEditProductType}
                          options={categoryOptions}
                          placeholder="Select Category..."
                          searchPlaceholder="Search category..."
                        />
                      </div>
                    </div>

                    {/* Pricing & Stock Alert */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50/70 p-3 rounded-lg border border-stone-200">
                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          Retail Price (QAR) *
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          required
                          value={editSalePrice}
                          onChange={(e) => setEditSalePrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-stone-700 mb-1">
                          Low Stock Alert
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editMinStockAlert}
                          onChange={(e) => setEditMinStockAlert(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                        />
                      </div>
                    </div>

                    {/* Barcodes & Identifiers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          SKU Identifier
                        </label>
                        <input
                          type="text"
                          value={editSku}
                          onChange={(e) => setEditSku(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Barcode / EAN
                        </label>
                        <input
                          type="text"
                          value={editBarcode}
                          onChange={(e) => setEditBarcode(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Form Action Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="px-3 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-medium cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            <span>Save Product</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: BATCHES & DIOPTERS MANAGEMENT */}
                {modalTab === 'BATCHES' && (
                  <div className="space-y-4">
                    {/* Add Diopter Batch Form */}
                    <form onSubmit={handleAddBatch} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5">
                      <span className="text-xs font-semibold text-stone-900 block">
                        + Register New Batch / Diopter Stock
                      </span>

                      {batchError && (
                        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                          {batchError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Batch / Lot *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. LOT-202611"
                            value={batchNo}
                            onChange={(e) => setBatchNo(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-stone-300 text-xs font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Diopter Power</label>
                          <input
                            type="text"
                            placeholder="e.g. -2.50 or Plano"
                            value={batchPower}
                            onChange={(e) => setBatchPower(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-stone-300 text-xs font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Quantity (Units)</label>
                          <input
                            type="number"
                            min="1"
                            value={batchQty}
                            onChange={(e) => setBatchQty(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-stone-300 text-xs font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-stone-600 mb-0.5">Expiry Date *</label>
                          <input
                            type="date"
                            required
                            value={batchExpiry}
                            onChange={(e) => setBatchExpiry(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-stone-300 text-xs font-mono bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isAddingBatch}
                          className="px-3 py-1 bg-stone-900 text-white hover:bg-stone-800 rounded text-xs font-medium cursor-pointer flex items-center gap-1 transition"
                        >
                          {isAddingBatch ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                          <span>Add Diopter Batch</span>
                        </button>
                      </div>
                    </form>

                    {/* Existing Batches List */}
                    <div>
                      <span className="text-[11px] font-mono uppercase text-stone-500 font-semibold block mb-1.5">
                        Registered Inventory Batches ({editingProduct.batches?.length || 0})
                      </span>

                      {editingProduct.batches && editingProduct.batches.length > 0 ? (
                        <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-56 overflow-y-auto">
                          {editingProduct.batches.map((b) => (
                            <div key={b.id} className="p-2.5 flex items-center justify-between text-xs font-mono hover:bg-stone-50 transition">
                              <div>
                                <span className="font-semibold text-stone-900">{b.batchNumber}</span>
                                <span className="ml-2 text-stone-600">
                                  PWR: {b.power || 'Plano'}
                                  {b.cylinder ? ` · CYL: ${b.cylinder}` : ''}
                                  {b.axis ? ` · AX: ${b.axis}°` : ''}
                                </span>
                                {b.expiryDate && (
                                  <span className="ml-2 text-stone-400 text-[11px]">
                                    Exp: {formatQatarDate(b.expiryDate)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-stone-900 tabular-nums">
                                  {b.quantity} pcs
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center border border-dashed border-stone-200 rounded-lg text-stone-400 text-xs">
                          No distinct lot batches recorded. Add a batch above to track separate diopters.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: POWER PRICING TIERS */}
                {modalTab === 'TIERS' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                          <DollarSign size={14} className="text-purple-600" />
                          Power & Prescription Price Tiers
                        </h4>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          Set custom retail prices for Plano (0.00), standard powers, high powers, or toric lenses. POS and online cart auto-select the right price.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="text-[10px] font-semibold text-purple-900">Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('PLANO_VS_RX')}
                          className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-900 text-[10px] font-medium rounded-md shadow-2xs cursor-pointer transition flex items-center gap-1"
                        >
                          <Sparkles size={10} className="text-purple-600" /> Plano vs RX (+20)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('THREE_TIER')}
                          className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-900 text-[10px] font-medium rounded-md shadow-2xs cursor-pointer transition flex items-center gap-1"
                        >
                          3-Tier (Plano/Std/High)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('TORIC')}
                          className="px-2 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-900 text-[10px] font-medium rounded-md shadow-2xs cursor-pointer transition flex items-center gap-1"
                        >
                          Toric / Astigmatism
                        </button>
                      </div>
                    </div>

                    {/* Active Tiers List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800">
                          Configured Tiers ({editTiers.length})
                        </span>
                        {editTiers.length === 0 && (
                          <span className="text-[11px] text-stone-500 italic">
                            No tiers active — product sells at flat base price ({formatQar(editingProduct.salePriceQar ?? editingProduct.basePriceQar)}).
                          </span>
                        )}
                      </div>

                      {editTiers.length > 0 && (
                        <div className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-2xs divide-y divide-stone-100">
                          <div className="grid grid-cols-12 gap-2 p-2.5 bg-stone-50 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                            <div className="col-span-4">Tier Name</div>
                            <div className="col-span-3">Power Range / Condition</div>
                            <div className="col-span-3 text-right">Retail Price (QAR)</div>
                            <div className="col-span-2 text-center">Action</div>
                          </div>

                          {editTiers.map((tier) => (
                            <div key={tier.id} className="grid grid-cols-12 gap-2 p-2.5 items-center text-xs hover:bg-stone-50/50 transition">
                              <div className="col-span-4 font-medium text-stone-900 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                                <span className="truncate">{tier.name}</span>
                              </div>

                              <div className="col-span-3 font-mono text-[11px] text-stone-600">
                                {tier.requiresCylinder ? (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                                    Toric (Cyl)
                                  </span>
                                ) : tier.requiresAdd ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                                    Multifocal (Add)
                                  </span>
                                ) : (tier.minPower === 0 && tier.maxPower === 0) || tier.name.toLowerCase().includes('plano') ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                                    Plano 0.00
                                  </span>
                                ) : tier.minPower !== null && tier.minPower !== undefined && tier.maxPower !== null && tier.maxPower !== undefined ? (
                                  <span>{tier.minPower > 0 ? `+${tier.minPower}` : tier.minPower} to {tier.maxPower > 0 ? `+${tier.maxPower}` : tier.maxPower}</span>
                                ) : (
                                  <span className="text-stone-400 italic">All powers</span>
                                )}
                              </div>

                              <div className="col-span-3 flex justify-end items-center gap-1 font-mono">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={tier.priceQar}
                                  onChange={(e) => handleUpdateTierPrice(tier.id, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-right font-bold text-xs bg-stone-50 border border-stone-300 rounded focus:bg-white focus:border-purple-600 focus:outline-hidden"
                                />
                                <span className="text-[10px] text-stone-500">QAR</span>
                              </div>

                              <div className="col-span-2 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTier(tier.id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Remove Tier"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Custom Tier Form */}
                    <form onSubmit={handleAddTier} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                          <Plus size={13} className="text-stone-600" /> Add Custom Tier Rule
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Tier Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Standard RX"
                            value={tierName}
                            onChange={(e) => setTierName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-hidden focus:border-purple-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Power From (Min)</label>
                          <input
                            type="number"
                            step="0.25"
                            placeholder="e.g. -12.00"
                            value={tierMin}
                            onChange={(e) => setTierMin(e.target.value)}
                            disabled={tierRequiresCyl || tierRequiresAdd}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-purple-600 disabled:opacity-40"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Power To (Max)</label>
                          <input
                            type="number"
                            step="0.25"
                            placeholder="e.g. -0.50"
                            value={tierMax}
                            onChange={(e) => setTierMax(e.target.value)}
                            disabled={tierRequiresCyl || tierRequiresAdd}
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-purple-600 disabled:opacity-40"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Retail Price (QAR) *</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="180"
                              value={tierPrice}
                              onChange={(e) => setTierPrice(e.target.value)}
                              className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-bold font-mono focus:outline-hidden focus:border-purple-600"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-stone-400 font-mono">QAR</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none text-stone-700">
                            <input
                              type="checkbox"
                              checked={tierRequiresCyl}
                              onChange={(e) => {
                                setTierRequiresCyl(e.target.checked);
                                if (e.target.checked) setTierRequiresAdd(false);
                              }}
                              className="rounded border-stone-300 text-purple-600"
                            />
                            <span className="text-[11px]">Requires Cylinder (Toric)</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none text-stone-700">
                            <input
                              type="checkbox"
                              checked={tierRequiresAdd}
                              onChange={(e) => {
                                setTierRequiresAdd(e.target.checked);
                                if (e.target.checked) setTierRequiresCyl(false);
                              }}
                              className="rounded border-stone-300 text-purple-600"
                            />
                            <span className="text-[11px]">Requires Add (Multifocal)</span>
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Plus size={12} /> Add Tier
                        </button>
                      </div>
                    </form>

                    {/* Save Button */}
                    <div className="pt-2 flex justify-end items-center gap-2 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={handleSaveTiers}
                        disabled={isSavingTiers}
                        className="px-4 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        {isSavingTiers ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            <span>Save Pricing Tiers</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: READ-ONLY SPECIFICATIONS & DETAILS */}
                {modalTab === 'VIEW' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
                      <div>
                        <span className="text-stone-400 text-[10px] block">Category</span>
                        <span className="font-medium text-stone-800">{formatCategoryLabel(editingProduct.productType)}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block">Retail Price</span>
                        <span className="font-mono font-bold text-stone-900">
                          {formatQar(editingProduct.salePriceQar ?? editingProduct.basePriceQar)}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block">Stock on Hand</span>
                        <span className="font-mono font-medium text-stone-800">{editingProduct.stockQuantity} units</span>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[10px] block">Barcode</span>
                        <span className="font-mono text-stone-800">{editingProduct.barcode || 'N/A'}</span>
                      </div>
                    </div>

                    {(editingProduct.baseCurve || editingProduct.diameter || editingProduct.waterContent) && (
                      <div className="p-3 bg-white rounded-lg border border-stone-200 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase block">Base Curve</span>
                          <span className="font-semibold text-stone-800">{editingProduct.baseCurve || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase block">Diameter</span>
                          <span className="font-semibold text-stone-800">{editingProduct.diameter || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase block">Water Content</span>
                          <span className="font-semibold text-stone-800">{editingProduct.waterContent || '—'}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModalTab('EDIT')}
                        className="px-3.5 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Pencil size={12} />
                        <span>Edit Product Info</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CREATE NEW PRODUCT MODAL (+ New Product)
            ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-stone-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
              <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Add New Product to Catalog</h3>
                  <span className="text-[11px] text-stone-500">Register new optical frames, contact lenses or solutions</span>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-4 space-y-3 flex-1 overflow-y-auto">
                {createError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Product Title (English) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acuvue Oasys with HydraLuxe"
                      value={newTitleEn}
                      onChange={(e) => setNewTitleEn(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Product Title (Arabic)
                      <span className="text-[10px] text-stone-400 font-normal ml-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      dir="auto"
                      placeholder="الاسم بالعربية (اختياري)"
                      value={newTitleAr}
                      onChange={(e) => setNewTitleAr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Brand / Manufacturer</label>
                    <SearchableSelect
                      value={newBrandName}
                      onChange={setNewBrandName}
                      options={newBrandOptions}
                      placeholder="Select Brand / Manufacturer..."
                      searchPlaceholder="Search brand..."
                      allowClear
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Category</label>
                    <SearchableSelect
                      value={newProductType}
                      onChange={setNewProductType}
                      options={categoryOptions}
                      placeholder="Select Category..."
                      searchPlaceholder="Search category..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Retail Price (QAR) *</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      required
                      placeholder="0.00"
                      value={newSalePrice}
                      onChange={(e) => setNewSalePrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-medium focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      min="1"
                      value={newMinStockAlert}
                      onChange={(e) => setNewMinStockAlert(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">SKU (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Barcode / EAN</label>
                    <input
                      type="text"
                      placeholder="Scan or enter barcode"
                      value={newBarcode}
                      onChange={(e) => setNewBarcode(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-mono focus:ring-1 focus:ring-stone-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Create Product</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <BulkAvailabilityModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchProducts}
      />
    </Shell>
  );
}

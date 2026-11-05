import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cleanValue } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import type { CreateOrderItem, Product, Variant } from '../types';

interface ProductVariantSelectorProps {
  product: Product;
  variants: Variant[];
  onVariantChange?: (variant: Variant | null) => void;
}

const COLOR_MAP: Record<string, string> = {
  black: '#1f2937',
  bk: '#1f2937',
  white: '#ffffff',
  wh: '#ffffff',
  grey: '#9ca3af',
  gray: '#9ca3af',
  gy: '#9ca3af',
  charcoal: '#374151',
  ch: '#374151',
  red: '#dc2626',
  rd: '#dc2626',
  blue: '#2563eb',
  'navy blue': '#1e3a8a',
  navy: '#1e3a8a',
  nb: '#1e3a8a',
  'sky blue': '#38bdf8',
  sb: '#38bdf8',
  green: '#16a34a',
  'olive green': '#556b2f',
  olive: '#556b2f',
  og: '#556b2f',
  maroon: '#800000',
  mr: '#800000',
  mustard: '#ca8a04',
  mu: '#ca8a04',
  beige: '#f5f5dc',
  be: '#f5f5dc',
  pink: '#ec4899',
  pk: '#ec4899',
  yellow: '#eab308',
  orange: '#ea580c',
  purple: '#9333ea',
  brown: '#78350f',
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

function getColorHex(colorName: string): string | null {
  if (!colorName) return null;
  const norm = colorName.trim().toLowerCase();
  if (norm === 'na' || norm === 'none' || norm === '-') return null;
  return COLOR_MAP[norm] || colorName;
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();
    const aIdx = SIZE_ORDER.indexOf(aUpper);
    const bIdx = SIZE_ORDER.indexOf(bUpper);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    const aNum = Number(a);
    const bNum = Number(b);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return a.localeCompare(b);
  });
}

function getStockInfo(stock: number, active: boolean) {
  if (!active) return { label: 'Inactive', cls: 'out' as const, isAvailable: false };
  if (stock <= 0) return { label: 'Out of stock', cls: 'out' as const, isAvailable: false };
  if (stock <= 10) return { label: `Only ${stock} left`, cls: 'low' as const, isAvailable: true };
  return { label: 'In stock', cls: 'in' as const, isAvailable: true };
}

export default function ProductVariantSelector({
  product,
  variants,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated, requireAuth } = useAuth();

  const quantity = 1;
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  // 1. Dynamic Sizes: extracted directly from backend variants
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) {
      const s = cleanValue(v.size);
      if (s && s.toUpperCase() !== 'NA') {
        set.add(s);
      }
    }
    return sortSizes(Array.from(set));
  }, [variants]);

  const hasSizes = allSizes.length > 0;

  // 2. Dynamic Colors: extracted directly from backend variants
  const allColors = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const v of variants) {
      const c = cleanValue(v.color);
      if (c && c.toUpperCase() !== 'NA' && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
        list.push(c);
      }
    }
    return list;
  }, [variants]);

  const hasColors = allColors.length > 0;

  // 3. Dynamic RAM: from product.attributes or variants
  const ramOptions = useMemo(() => {
    const set = new Set<string>();
    const raw = product.attributes?.ram_gb ?? product.attributes?.ram;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '' && String(raw).trim().toUpperCase() !== 'NA') {
      const formatted = typeof raw === 'number' ? `${raw} GB` : String(raw).toUpperCase().includes('GB') ? String(raw) : `${raw} GB`;
      set.add(formatted);
    }
    return Array.from(set);
  }, [product.attributes]);

  const hasRam = ramOptions.length > 0;

  // 4. Dynamic Storage: from product.attributes or variants
  const storageOptions = useMemo(() => {
    const set = new Set<string>();
    const raw = product.attributes?.storage_gb ?? product.attributes?.storage;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '' && String(raw).trim().toUpperCase() !== 'NA') {
      const formatted = typeof raw === 'number' ? `${raw} GB` : String(raw);
      set.add(formatted);
    }
    return Array.from(set);
  }, [product.attributes]);

  const hasStorage = storageOptions.length > 0;

  // 5. Dynamic Capacity / Volume: from product.attributes
  const capacityOptions = useMemo(() => {
    const set = new Set<string>();
    const mah = product.attributes?.capacity_mah;
    if (mah && String(mah).toUpperCase() !== 'NA') set.add(`${mah} mAh`);

    const ml = product.attributes?.capacity_ml ?? product.attributes?.volume_ml;
    if (ml && String(ml).toUpperCase() !== 'NA') set.add(`${ml} ml`);

    const l = product.attributes?.capacity_litres;
    if (l && String(l).toUpperCase() !== 'NA') set.add(`${l} L`);

    return Array.from(set);
  }, [product.attributes]);

  const hasCapacity = capacityOptions.length > 0;

  // Selected states
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedRam, setSelectedRam] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');

  useEffect(() => {
    if (ramOptions.length > 0) setSelectedRam(ramOptions[0]);
  }, [ramOptions]);

  useEffect(() => {
    if (storageOptions.length > 0) setSelectedStorage(storageOptions[0]);
  }, [storageOptions]);

  useEffect(() => {
    if (capacityOptions.length > 0) setSelectedCapacity(capacityOptions[0]);
  }, [capacityOptions]);

  // Initial selection for sizes and colors
  useEffect(() => {
    if (variants.length === 0) return;

    if (hasSizes) {
      // Find first in-stock variant with size
      const inStockVar = variants.find(
        (v) => v.active && v.stock > 0 && cleanValue(v.size) && cleanValue(v.size).toUpperCase() !== 'NA'
      );

      if (inStockVar) {
        setSelectedSize(cleanValue(inStockVar.size));
        const c = cleanValue(inStockVar.color);
        if (c && c.toUpperCase() !== 'NA') setSelectedColor(c);
      } else {
        const firstAvailable = allSizes.find((size) =>
          variants.some(
            (v) => cleanValue(v.size).toUpperCase() === size.toUpperCase() && v.active && v.stock > 0
          )
        );
        setSelectedSize(firstAvailable || allSizes[0] || '');
      }
    } else if (hasColors) {
      // Products with color only
      const inStockVar = variants.find(
        (v) => v.active && v.stock > 0 && cleanValue(v.color) && cleanValue(v.color).toUpperCase() !== 'NA'
      );
      if (inStockVar) {
        setSelectedColor(cleanValue(inStockVar.color));
      } else if (allColors.length > 0) {
        setSelectedColor(allColors[0]);
      }
    }
  }, [variants, hasSizes, hasColors, allSizes, allColors]);

  // Resolve matching variant
  const currentVariant = useMemo(() => {
    if (variants.length === 0) return null;

    if (hasSizes && hasColors && selectedSize && selectedColor) {
      return (
        variants.find(
          (v) =>
            cleanValue(v.size).toUpperCase() === selectedSize.toUpperCase() &&
            cleanValue(v.color).toLowerCase() === selectedColor.toLowerCase()
        ) || null
      );
    }

    if (hasSizes && selectedSize) {
      return (
        variants.find(
          (v) => cleanValue(v.size).toUpperCase() === selectedSize.toUpperCase()
        ) || null
      );
    }

    if (hasColors && selectedColor) {
      return (
        variants.find(
          (v) => cleanValue(v.color).toLowerCase() === selectedColor.toLowerCase()
        ) || null
      );
    }

    return variants[0] || null;
  }, [variants, hasSizes, hasColors, selectedSize, selectedColor]);

  // Sync variant image and details with parent only when variantId actually changes
  const lastVariantIdRef = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    const curId = currentVariant ? currentVariant.variantId : null;
    if (lastVariantIdRef.current !== curId) {
      lastVariantIdRef.current = curId;
      onVariantChange?.(currentVariant);
    }
  }, [currentVariant, onVariantChange]);

  // Handle Size change
  const handleSizeSelect = (newSize: string) => {
    setSelectedSize(newSize);
    if (!hasColors) return;

    const currentStillValid = variants.some(
      (v) =>
        cleanValue(v.size).toUpperCase() === newSize.toUpperCase() &&
        cleanValue(v.color).toLowerCase() === selectedColor.toLowerCase() &&
        v.active &&
        v.stock > 0
    );

    if (!currentStillValid) {
      const firstAvailableForSize = allColors.find((c) =>
        variants.some(
          (v) =>
            cleanValue(v.size).toUpperCase() === newSize.toUpperCase() &&
            cleanValue(v.color).toLowerCase() === c.toLowerCase() &&
            v.active &&
            v.stock > 0
        )
      );

      if (firstAvailableForSize) {
        setSelectedColor(firstAvailableForSize);
      } else {
        const anyMatchingColor = allColors.find((c) =>
          variants.some(
            (v) =>
              cleanValue(v.size).toUpperCase() === newSize.toUpperCase() &&
              cleanValue(v.color).toLowerCase() === c.toLowerCase()
          )
        );
        if (anyMatchingColor) {
          setSelectedColor(anyMatchingColor);
        }
      }
    }
  };

  // Add to cart handler
  async function doAddToCart() {
    setAdding(true);
    try {
      const targetVariantId = currentVariant?.variantId || (variants[0] ? variants[0].variantId : product.id);
      const targetPrice = currentVariant?.price ?? product.price;

      await addItem({
        productId: String(product.id),
        variantId: String(targetVariantId),
        price: targetPrice,
        quantity,
      });
      toast.success(`Added ${quantity > 1 ? `${quantity}x ` : ''}"${product.productName}" to cart!`);
    } catch {
      toast.error('Could not add item to cart. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  function handleAddToCart() {
    if (!isAuthenticated) {
      requireAuth(() => {
        doAddToCart();
      });
      return;
    }
    doAddToCart();
  }

  // Buy now handler
  async function doBuyNow() {
    setBuying(true);
    try {
      const targetVariantId = currentVariant?.variantId || (variants[0] ? variants[0].variantId : product.id);
      const targetPrice = currentVariant?.price ?? product.price;

      if (isAuthenticated) {
        try {
          await addItem({
            productId: String(product.id),
            variantId: String(targetVariantId),
            price: targetPrice,
            quantity,
          });
        } catch {
          // Background cart sync is non-blocking for direct Buy Now
        }
      }

      const orderItem: CreateOrderItem = {
        productId: String(product.id),
        variantId: String(targetVariantId),
        productName: product.productName,
        size: cleanValue(currentVariant?.size),
        color: cleanValue(currentVariant?.color),
        quantity: String(quantity),
        priceAtBooking: String(targetPrice),
      };

      navigate('/checkout', { state: { orderItems: [orderItem] } });
    } catch {
      toast.error('Could not proceed to checkout. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  function handleBuyNow() {
    doBuyNow();
  }

  // Stock calculation
  const stockInfo = currentVariant
    ? getStockInfo(currentVariant.stock, currentVariant.active)
    : { label: 'In stock', cls: 'in' as const, isAvailable: true };

  const canAddToCart = Boolean(
    !currentVariant || (stockInfo.isAvailable && currentVariant.stock >= quantity)
  );

  return (
    <div className="product-variant-selector">

      {/* 1. DYNAMIC RAM: from product.attributes */}
      {hasRam && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">RAM:</span>
            <span className="variant-option-value">{selectedRam}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="RAM options">
            {ramOptions.map((ram) => {
              const isSelected = selectedRam.toLowerCase() === ram.toLowerCase();

              return (
                <button
                  key={ram}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`size-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedRam(ram)}
                  title={`RAM ${ram}`}
                >
                  <span>{ram}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. DYNAMIC STORAGE: from product.attributes */}
      {hasStorage && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Storage:</span>
            <span className="variant-option-value">{selectedStorage}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Storage options">
            {storageOptions.map((st) => {
              const isSelected = selectedStorage.toLowerCase() === st.toLowerCase();

              return (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`size-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedStorage(st)}
                  title={`Storage ${st}`}
                >
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DYNAMIC CAPACITY / VOLUME: from product.attributes */}
      {hasCapacity && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Capacity:</span>
            <span className="variant-option-value">{selectedCapacity}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Capacity options">
            {capacityOptions.map((cap) => {
              const isSelected = selectedCapacity.toLowerCase() === cap.toLowerCase();

              return (
                <button
                  key={cap}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`size-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCapacity(cap)}
                  title={`Capacity ${cap}`}
                >
                  <span>{cap}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DYNAMIC SIZES: from backend variants */}
      {hasSizes && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Size:</span>
            <span className="variant-option-value">{selectedSize || 'Select a size'}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Size options">
            {allSizes.map((size) => {
              const isSelected = selectedSize.toUpperCase() === size.toUpperCase();
              const isAvailable = variants.some(
                (v) =>
                  cleanValue(v.size).toUpperCase() === size.toUpperCase() &&
                  v.active &&
                  v.stock > 0
              );

              return (
                <button
                  key={size}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isAvailable}
                  className={`size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) {
                      handleSizeSelect(size);
                    }
                  }}
                  title={!isAvailable ? `${size} (Unavailable)` : `Size ${size}`}
                >
                  <span>{size}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. DYNAMIC COLORS: from backend variants */}
      {hasColors && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Color:</span>
            <span className="variant-option-value">{selectedColor || 'Select a color'}</span>
          </div>

          <div className="color-options-list" role="radiogroup" aria-label="Color options">
            {allColors.map((color) => {
              const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
              const hex = getColorHex(color);
              const isLightColor =
                hex &&
                (hex.toLowerCase() === '#ffffff' ||
                  hex.toLowerCase() === '#f5f5dc' ||
                  hex.toLowerCase() === 'white' ||
                  hex.toLowerCase() === 'beige');

              let isCombinationPresent: boolean;
              let isOutOfStock = false;

              if (hasSizes && selectedSize) {
                const match = variants.find(
                  (v) =>
                    cleanValue(v.size).toUpperCase() === selectedSize.toUpperCase() &&
                    cleanValue(v.color).toLowerCase() === color.toLowerCase()
                );

                if (!match) {
                  isCombinationPresent = false;
                } else if (!match.active || match.stock <= 0) {
                  isCombinationPresent = false;
                  isOutOfStock = true;
                } else {
                  isCombinationPresent = true;
                }
              } else {
                const match = variants.find(
                  (v) => cleanValue(v.color).toLowerCase() === color.toLowerCase()
                );
                if (!match) {
                  isCombinationPresent = false;
                } else if (!match.active || match.stock <= 0) {
                  isCombinationPresent = false;
                  isOutOfStock = true;
                } else {
                  isCombinationPresent = true;
                }
              }

              const tooltip = !isCombinationPresent
                ? isOutOfStock
                  ? hasSizes
                    ? `${color} (Out of stock in size ${selectedSize})`
                    : `${color} (Out of stock)`
                  : hasSizes
                  ? `${color} (Not available in size ${selectedSize})`
                  : `${color} (Currently unavailable)`
                : `${color}`;

              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isCombinationPresent}
                  onClick={() => setSelectedColor(color)}
                  className={`color-swatch-btn ${isSelected ? 'selected' : ''} ${!isCombinationPresent ? 'disabled' : ''} ${isLightColor ? 'light' : ''}`}
                  title={tooltip}
                  aria-label={tooltip}
                >
                  {hex ? (
                    <span
                      className="color-swatch-circle"
                      style={{ backgroundColor: hex }}
                    />
                  ) : null}
                  <span className="color-swatch-name">{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. PURCHASE ACTIONS: Add to Cart & Buy Now in one line */}
      <div className="product-purchase-actions">
        <button
          type="button"
          className="variant-add-cart-btn"
          onClick={handleAddToCart}
          disabled={!canAddToCart || adding || buying}
        >
          {adding
            ? 'Adding…'
            : canAddToCart
            ? 'Add to Cart'
            : stockInfo.label === 'Out of stock'
            ? 'Out of Stock'
            : 'Unavailable'}
        </button>

        {canAddToCart && (
          <button
            type="button"
            className="variant-buy-now-btn"
            onClick={handleBuyNow}
            disabled={adding || buying}
          >
            {buying ? 'Proceeding…' : 'Buy Now'}
          </button>
        )}
      </div>
    </div>
  );
}

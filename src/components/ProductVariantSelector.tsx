import { useState, useEffect, useMemo } from 'react';
import { formatINR, cleanValue } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AddToCartResultModal from './AddToCartResultModal';
import type { Product, Variant } from '../types';

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
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const FOOTWEAR_SIZES = ['6', '7', '8', '9', '10', '11', '12'];

function getColorHex(colorName: string): string | null {
  if (!colorName) return null;
  const norm = colorName.trim().toLowerCase();
  if (norm === 'na' || norm === 'none' || norm === '-') return null;
  // Look up in map; if not found, return the name itself if it's a valid CSS color, but NEVER fallback to white
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
  const { addItem } = useCart();
  const { isAuthenticated, requireAuth } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const normCategory = (product.category || '').trim().toLowerCase();
  const isClothing = normCategory === 'clothing';
  const isFootwear = normCategory === 'footwear';

  // 1. RAM: ONLY check from product attributes/variables
  const rawRam = product.attributes?.ram_gb ?? product.attributes?.ram;
  const hasRamKey = Boolean(
    rawRam !== undefined &&
      rawRam !== null &&
      String(rawRam).trim() !== '' &&
      String(rawRam).trim().toUpperCase() !== 'NA'
  );

  const ramValue = hasRamKey
    ? typeof rawRam === 'number'
      ? `${rawRam} GB`
      : String(rawRam).toUpperCase().includes('GB')
      ? String(rawRam)
      : `${rawRam} GB`
    : '';

  const ramOptions = useMemo(() => {
    if (!hasRamKey || !ramValue) return [];
    const tiers = ['8 GB', '16 GB', '32 GB'];
    if (!tiers.some((t) => t.toLowerCase() === ramValue.toLowerCase())) {
      return [ramValue, ...tiers];
    }
    return tiers;
  }, [hasRamKey, ramValue]);

  // 2. Storage: ONLY check from product attributes/variables
  const rawStorage = product.attributes?.storage_gb ?? product.attributes?.storage;
  const hasStorageKey = Boolean(
    rawStorage !== undefined &&
      rawStorage !== null &&
      String(rawStorage).trim() !== '' &&
      String(rawStorage).trim().toUpperCase() !== 'NA'
  );

  const storageValue = hasStorageKey
    ? typeof rawStorage === 'number'
      ? `${rawStorage} GB`
      : String(rawStorage)
    : '';

  const storageOptions = useMemo(() => {
    if (!hasStorageKey || !storageValue) return [];
    const isSSD = storageValue.toLowerCase().includes('ssd');
    const tiers = isSSD
      ? ['256 GB SSD', '512 GB SSD', '1 TB SSD']
      : ['128 GB', '256 GB', '512 GB', '1 TB'];
    if (!tiers.some((t) => t.toLowerCase() === storageValue.toLowerCase())) {
      return [storageValue, ...tiers];
    }
    return tiers;
  }, [hasStorageKey, storageValue]);

  // 3. Other selectable attribute options from product.attributes (e.g. Capacity)
  const rawCapacityMah = product.attributes?.capacity_mah;
  const hasCapacityMahKey = Boolean(
    rawCapacityMah !== undefined &&
      rawCapacityMah !== null &&
      String(rawCapacityMah).trim() !== '' &&
      String(rawCapacityMah).trim().toUpperCase() !== 'NA'
  );
  const capacityMahValue = hasCapacityMahKey ? `${rawCapacityMah} mAh` : '';
  const capacityMahOptions = useMemo(() => {
    if (!hasCapacityMahKey || !capacityMahValue) return [];
    const tiers = ['10000 mAh', '20000 mAh'];
    if (!tiers.some((t) => t.toLowerCase() === capacityMahValue.toLowerCase())) {
      return [capacityMahValue, ...tiers];
    }
    return tiers;
  }, [hasCapacityMahKey, capacityMahValue]);

  const rawCapacityMl = product.attributes?.capacity_ml ?? product.attributes?.volume_ml;
  const hasCapacityMlKey = Boolean(
    rawCapacityMl !== undefined &&
      rawCapacityMl !== null &&
      String(rawCapacityMl).trim() !== '' &&
      String(rawCapacityMl).trim().toUpperCase() !== 'NA'
  );
  const capacityMlValue = hasCapacityMlKey ? `${rawCapacityMl} ml` : '';
  const capacityMlOptions = useMemo(() => {
    if (!hasCapacityMlKey || !capacityMlValue) return [];
    const tiers = ['500 ml', '750 ml', '1000 ml'];
    if (!tiers.some((t) => t.toLowerCase() === capacityMlValue.toLowerCase())) {
      return [capacityMlValue, ...tiers];
    }
    return tiers;
  }, [hasCapacityMlKey, capacityMlValue]);

  const [selectedRam, setSelectedRam] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');

  useEffect(() => {
    if (ramValue) setSelectedRam(ramValue);
  }, [ramValue]);

  useEffect(() => {
    if (storageValue) setSelectedStorage(storageValue);
  }, [storageValue]);

  useEffect(() => {
    if (capacityMahValue) setSelectedCapacity(capacityMahValue);
    else if (capacityMlValue) setSelectedCapacity(capacityMlValue);
  }, [capacityMahValue, capacityMlValue]);

  // 3. Size: Only for Clothing & Footwear if variants have sizes
  const allSizes = useMemo(() => {
    if (!isClothing && !isFootwear) return [];

    const presentSizes = new Set<string>();
    for (const v of variants) {
      const s = cleanValue(v.size);
      if (s && s.toUpperCase() !== 'NA') {
        presentSizes.add(s.toUpperCase());
      }
    }

    if (isFootwear) {
      const merged = new Set([...FOOTWEAR_SIZES, ...presentSizes]);
      return Array.from(merged).sort((a, b) => Number(a) - Number(b));
    }

    if (isClothing) {
      const merged = new Set<string>();
      if (presentSizes.has('XS')) merged.add('XS');
      for (const s of CLOTHING_SIZES) merged.add(s);
      for (const s of presentSizes) merged.add(s);
      return sortSizes(Array.from(merged));
    }

    return [];
  }, [variants, isClothing, isFootwear]);

  const hasSizes = allSizes.length > 0;

  // 4. Color: ONLY show color if explicitly mentioned (non-empty and not 'NA')
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

  // Check if product has ANY selectable variant options at all
  const hasAnyOptions =
    hasSizes ||
    hasColors ||
    hasRamKey ||
    hasStorageKey ||
    hasCapacityMahKey ||
    hasCapacityMlKey;

  // Selected size & color states
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Initial selection
  useEffect(() => {
    if (variants.length === 0) return;

    if (hasSizes) {
      // Find first in-stock variant with size
      const inStockVar = variants.find(
        (v) => v.active && v.stock > 0 && cleanValue(v.size) && cleanValue(v.size).toUpperCase() !== 'NA'
      );

      if (inStockVar) {
        setSelectedSize(cleanValue(inStockVar.size).toUpperCase());
        const c = cleanValue(inStockVar.color);
        if (c && c.toUpperCase() !== 'NA') setSelectedColor(c);
      } else {
        const firstAvailable = allSizes.find((size) =>
          variants.some(
            (v) => cleanValue(v.size).toUpperCase() === size.toUpperCase() && v.active && v.stock > 0
          )
        );
        setSelectedSize(firstAvailable || allSizes[0] || 'S');
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

  // Sync variant with parent
  useEffect(() => {
    if (onVariantChange) {
      onVariantChange(currentVariant);
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
      setResult('success');
    } catch {
      setResult('error');
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

  // Stock calculation
  const stockInfo = currentVariant
    ? getStockInfo(currentVariant.stock, currentVariant.active)
    : { label: 'In stock', cls: 'in' as const, isAvailable: true };

  const canAddToCart = Boolean(
    !currentVariant || (stockInfo.isAvailable && currentVariant.stock >= quantity)
  );

  const displayPrice = currentVariant?.price ?? product.price;

  return (
    <div className="product-variant-selector">
      {hasAnyOptions && (
        <h2 className="section-label" style={{ marginBottom: '8px' }}>Select Variant</h2>
      )}

      {/* 1. RAM SELECTION: Only show if product variables have RAM key */}
      {hasRamKey && ramOptions.length > 0 && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">RAM:</span>
            <span className="variant-option-value">{selectedRam || ramValue}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="RAM options">
            {ramOptions.map((ram) => {
              const isSelected = selectedRam.toLowerCase() === ram.toLowerCase();
              const isAvailable = ramValue.toLowerCase() === ram.toLowerCase();

              return (
                <button
                  key={ram}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isAvailable}
                  className={`size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) setSelectedRam(ram);
                  }}
                  title={!isAvailable ? `${ram} (Unavailable)` : `RAM ${ram}`}
                >
                  <span>{ram}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. STORAGE SELECTION: Only show if product variables have Storage key */}
      {hasStorageKey && storageOptions.length > 0 && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Storage:</span>
            <span className="variant-option-value">{selectedStorage || storageValue}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Storage options">
            {storageOptions.map((st) => {
              const isSelected = selectedStorage.toLowerCase() === st.toLowerCase();
              const isAvailable = storageValue.toLowerCase() === st.toLowerCase();

              return (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isAvailable}
                  className={`size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) setSelectedStorage(st);
                  }}
                  title={!isAvailable ? `${st} (Unavailable)` : `Storage ${st}`}
                >
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CAPACITY / VOLUME SELECTION: Only if product variables have capacity key */}
      {hasCapacityMahKey && capacityMahOptions.length > 0 && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Capacity:</span>
            <span className="variant-option-value">{selectedCapacity || capacityMahValue}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Capacity options">
            {capacityMahOptions.map((cap) => {
              const isSelected = selectedCapacity.toLowerCase() === cap.toLowerCase();
              const isAvailable = capacityMahValue.toLowerCase() === cap.toLowerCase();

              return (
                <button
                  key={cap}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isAvailable}
                  className={`size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) setSelectedCapacity(cap);
                  }}
                  title={!isAvailable ? `${cap} (Unavailable)` : `Capacity ${cap}`}
                >
                  <span>{cap}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasCapacityMlKey && capacityMlOptions.length > 0 && (
        <div className="variant-option-group">
          <div className="variant-option-header">
            <span className="variant-option-label">Volume:</span>
            <span className="variant-option-value">{selectedCapacity || capacityMlValue}</span>
          </div>

          <div className="size-options-list" role="radiogroup" aria-label="Volume options">
            {capacityMlOptions.map((vol) => {
              const isSelected = selectedCapacity.toLowerCase() === vol.toLowerCase();
              const isAvailable = capacityMlValue.toLowerCase() === vol.toLowerCase();

              return (
                <button
                  key={vol}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!isAvailable}
                  className={`size-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) setSelectedCapacity(vol);
                  }}
                  title={!isAvailable ? `${vol} (Unavailable)` : `Volume ${vol}`}
                >
                  <span>{vol}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SIZE OPTIONS: Only for Clothing & Footwear */}
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

      {/* 4. COLOR OPTIONS: Only if variants have mentioned color */}
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

              let isCombinationPresent = false;
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

      {/* 5. ACTION & PURCHASE CARD */}
      <div className="selected-variant-summary">
        <div className="variant-summary-info">
          <div className="variant-summary-primary">
            <span className="variant-summary-price">
              {formatINR(displayPrice)}
            </span>
            <span className={`variant-stock-badge ${stockInfo.cls}`}>
              {stockInfo.label}
            </span>
            {[selectedRam, selectedStorage, selectedCapacity].some(Boolean) && (
              <span className="variant-spec-pill">
                {[selectedRam, selectedStorage, selectedCapacity].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          {currentVariant?.sku && (
            <div className="variant-summary-sku">
              SKU: <code>{currentVariant.sku}</code>
            </div>
          )}
        </div>

        <div className="variant-action-row">
          {stockInfo.isAvailable && (
            <div className="variant-qty-selector">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || adding}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-number">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(currentVariant?.stock ?? 100, q + 1)
                  )
                }
                disabled={Boolean(
                  currentVariant && quantity >= currentVariant.stock
                ) || adding}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            className="variant-add-cart-btn"
            onClick={handleAddToCart}
            disabled={!canAddToCart || adding}
          >
            {adding
              ? 'Adding to cart…'
              : canAddToCart
              ? 'Add to cart'
              : stockInfo.label === 'Out of stock'
              ? 'Out of stock'
              : 'Unavailable'}
          </button>
        </div>
      </div>

      {result && (
        <AddToCartResultModal
          status={result}
          productName={product.productName}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

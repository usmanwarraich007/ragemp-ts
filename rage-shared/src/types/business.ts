// ── Business types ─────────────────────────────────────────────────────────

import type { VehicleModelConfigDto } from './vehicle';
export type { VehicleModelConfigDto };

// ── Dealership composite DTOs ──────────────────────────────────────────────

/** One line in the customer browse list: catalog metadata + live stock/price. */
export interface DealershipStockItemDto {
  config:  VehicleModelConfigDto;
  stock:   number;
  price:   number;   // dealership's current sell price
  invId:   number;   // BusinessInventory.id
}

/** Full payload for the owner management CEF page. */
export interface DealershipManageDto {
  businessId: number;
  name:       string;
  balance:    number;
  isOpen:     boolean;
  /** Current inventory, enriched with catalog. */
  stock: Array<{
    config:        VehicleModelConfigDto;
    stock:         number;
    purchasePrice: number;
    sellPrice:     number;
    invId:         number;
  }>;
  /** All catalog entries — powers the "Add Stock" dropdown. */
  catalog: VehicleModelConfigDto[];
}


export type BusinessType = 'DEALERSHIP' | 'STORE_247' | 'CLOTHING' | 'PROPERTY';

export interface BusinessZoneDto {
  x: number;
  y: number;
  z: number;
}

/** Serializable snapshot of a business sent from server → client. */
export interface BusinessDto {
  id:      number;
  type:    BusinessType;
  name:    string;
  /** null = unowned (government / admin-managed) */
  ownerId: number | null;
  isOpen:  boolean;
  /** Business bank balance — clients don't need this; only sent to the owner */
  balance?: number;
  x: number;
  y: number;
  z: number;
  /**
   * Per-zone world positions keyed by zone name (e.g. 'customer', 'owner', 'showcase').
   * Only present in updates that actually changed zone positions.
   * Omitted on toggle/transfer/etc. broadcasts so clients don't lose their saved positions.
   */
  zones?: Record<string, BusinessZoneDto>;
}

/** One inventory slot inside a business. */
export interface BusinessInventoryItemDto {
  id:            number;
  businessId:    number;
  /** Vehicle model name (dealership) or item key (store) */
  itemKey:       string;
  stock:         number;
  purchasePrice: number;
  sellPrice:     number;
}

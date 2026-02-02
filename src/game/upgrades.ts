import type { BusinessId } from "./economy";

export type UpgradeKind = "business" | "global";

export type UpgradeEffect = {
  profitMult?: number;
  timeMult?: number;
};

export type UpgradeUnlock = {
  businessId?: BusinessId;
  countAtLeast?: number;
  totalCashEarnedAtLeast?: number;
};

export type UpgradeDef = {
  id: string;
  name: string;
  cost: number;
  kind: UpgradeKind;
  targetBusinessId?: BusinessId;
  effect: UpgradeEffect;
  unlock: UpgradeUnlock;
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "lemonade-promo",
    name: "Lemonade Promo",
    cost: 300,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { profitMult: 3 },
    unlock: { businessId: "lemonade", countAtLeast: 10 },
  },
  {
    id: "lemonade-automation-kit",
    name: "Lemonade Automation Kit",
    cost: 900,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "lemonade", countAtLeast: 25 },
  },
  {
    id: "newspaper-promo",
    name: "Newspaper Promo",
    cost: 1500,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { profitMult: 3 },
    unlock: { businessId: "newspaper", countAtLeast: 10 },
  },
  {
    id: "newspaper-automation-kit",
    name: "Newspaper Automation Kit",
    cost: 5000,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "newspaper", countAtLeast: 25 },
  },
  {
    id: "carwash-promo",
    name: "Car Wash Promo",
    cost: 8000,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { profitMult: 3 },
    unlock: { businessId: "carwash", countAtLeast: 10 },
  },
  {
    id: "carwash-automation-kit",
    name: "Car Wash Automation Kit",
    cost: 20000,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "carwash", countAtLeast: 25 },
  },
  {
    id: "pizza-promo",
    name: "Pizza Shop Promo",
    cost: 40000,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { profitMult: 3 },
    unlock: { businessId: "pizza", countAtLeast: 10 },
  },
  {
    id: "pizza-automation-kit",
    name: "Pizza Shop Automation Kit",
    cost: 100000,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "pizza", countAtLeast: 25 },
  },
  {
    id: "billboard-blitz",
    name: "Billboard Blitz",
    cost: 750,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 500 },
  },
  {
    id: "bulk-supplier",
    name: "Bulk Supplier",
    cost: 2500,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 2000 },
  },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADE_DEFS.map((def) => [def.id, def])
) as Record<string, UpgradeDef>;

export type BusinessCounts = Record<BusinessId, number>;

export const isUpgradeUnlockedForCounts = (
  upgrade: UpgradeDef,
  counts: BusinessCounts,
  totalEarned: number
) => {
  if (upgrade.unlock.businessId) {
    const requiredCount = upgrade.unlock.countAtLeast ?? 0;
    const owned = counts[upgrade.unlock.businessId] ?? 0;
    if (owned < requiredCount) {
      return false;
    }
  }
  if (upgrade.unlock.totalCashEarnedAtLeast) {
    if (totalEarned < upgrade.unlock.totalCashEarnedAtLeast) {
      return false;
    }
  }
  return true;
};

export const getAvailableUpgradesForCounts = (
  counts: BusinessCounts,
  totalEarned: number,
  purchasedUpgrades: string[]
) =>
  UPGRADE_DEFS.filter(
    (upgrade) =>
      !purchasedUpgrades.includes(upgrade.id) &&
      isUpgradeUnlockedForCounts(upgrade, counts, totalEarned)
  );

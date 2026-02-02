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
  targetSeconds: number;
  kind: UpgradeKind;
  targetBusinessId?: BusinessId;
  effect: UpgradeEffect;
  unlock: UpgradeUnlock;
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "lemonade-promo",
    name: "Lemonade Promo",
    targetSeconds: 60,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { profitMult: 2 },
    unlock: { businessId: "lemonade", countAtLeast: 10 },
  },
  {
    id: "lemonade-production",
    name: "Lemonade Production Kit",
    targetSeconds: 180,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "lemonade", countAtLeast: 25 },
  },
  {
    id: "lemonade-brand-push",
    name: "Lemonade Brand Push",
    targetSeconds: 600,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { profitMult: 5 },
    unlock: { businessId: "lemonade", countAtLeast: 50 },
  },
  {
    id: "lemonade-turbo-line",
    name: "Lemonade Turbo Line",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { timeMult: 0.6 },
    unlock: { businessId: "lemonade", countAtLeast: 100 },
  },
  {
    id: "newspaper-promo",
    name: "Newspaper Promo",
    targetSeconds: 90,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { profitMult: 2 },
    unlock: { businessId: "newspaper", countAtLeast: 10 },
  },
  {
    id: "newspaper-production",
    name: "Newspaper Production Kit",
    targetSeconds: 240,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "newspaper", countAtLeast: 25 },
  },
  {
    id: "newspaper-brand-push",
    name: "Newspaper Brand Push",
    targetSeconds: 900,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { profitMult: 5 },
    unlock: { businessId: "newspaper", countAtLeast: 50 },
  },
  {
    id: "newspaper-turbo-line",
    name: "Newspaper Turbo Line",
    targetSeconds: 2400,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { timeMult: 0.6 },
    unlock: { businessId: "newspaper", countAtLeast: 100 },
  },
  {
    id: "carwash-promo",
    name: "Car Wash Promo",
    targetSeconds: 120,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { profitMult: 2 },
    unlock: { businessId: "carwash", countAtLeast: 10 },
  },
  {
    id: "carwash-production",
    name: "Car Wash Production Kit",
    targetSeconds: 300,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "carwash", countAtLeast: 25 },
  },
  {
    id: "carwash-brand-push",
    name: "Car Wash Brand Push",
    targetSeconds: 1200,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { profitMult: 5 },
    unlock: { businessId: "carwash", countAtLeast: 50 },
  },
  {
    id: "carwash-turbo-line",
    name: "Car Wash Turbo Line",
    targetSeconds: 3600,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { timeMult: 0.6 },
    unlock: { businessId: "carwash", countAtLeast: 100 },
  },
  {
    id: "pizza-promo",
    name: "Pizza Shop Promo",
    targetSeconds: 180,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { profitMult: 2 },
    unlock: { businessId: "pizza", countAtLeast: 10 },
  },
  {
    id: "pizza-production",
    name: "Pizza Shop Production Kit",
    targetSeconds: 420,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "pizza", countAtLeast: 25 },
  },
  {
    id: "pizza-brand-push",
    name: "Pizza Shop Brand Push",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { profitMult: 5 },
    unlock: { businessId: "pizza", countAtLeast: 50 },
  },
  {
    id: "pizza-turbo-line",
    name: "Pizza Shop Turbo Line",
    targetSeconds: 7200,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { timeMult: 0.6 },
    unlock: { businessId: "pizza", countAtLeast: 100 },
  },
  {
    id: "cashflow-playbook",
    name: "Cashflow Playbook",
    targetSeconds: 90,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 200 },
  },
  {
    id: "billboard-blitz",
    name: "Billboard Blitz",
    targetSeconds: 300,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 500 },
  },
  {
    id: "lean-ops",
    name: "Lean Ops",
    targetSeconds: 600,
    kind: "global",
    effect: { timeMult: 0.9 },
    unlock: { totalCashEarnedAtLeast: 2000 },
  },
  {
    id: "bulk-supplier",
    name: "Bulk Supplier",
    targetSeconds: 1800,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 5000 },
  },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADE_DEFS.map((def) => [def.id, def])
) as Record<string, UpgradeDef>;

export type BusinessCounts = Record<BusinessId, number>;

export const getUpgradeCost = (incomePerSec: number, upgrade: UpgradeDef) =>
  Math.max(0, incomePerSec * upgrade.targetSeconds);

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
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
    id: "lemonade-efficiency",
    name: "Lemonade Efficiency Kit",
    targetSeconds: 180,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "lemonade", countAtLeast: 25 },
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
    id: "newspaper-efficiency",
    name: "Newspaper Efficiency Kit",
    targetSeconds: 240,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "newspaper", countAtLeast: 25 },
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
    id: "carwash-efficiency",
    name: "Car Wash Efficiency Kit",
    targetSeconds: 300,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "carwash", countAtLeast: 25 },
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
    id: "pizza-efficiency",
    name: "Pizza Shop Efficiency Kit",
    targetSeconds: 420,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "pizza", countAtLeast: 25 },
  },
  {
    id: "coffee-promo",
    name: "Coffee Cart Promo",
    targetSeconds: 240,
    kind: "business",
    targetBusinessId: "coffee",
    effect: { profitMult: 2 },
    unlock: { businessId: "coffee", countAtLeast: 10 },
  },
  {
    id: "coffee-efficiency",
    name: "Coffee Cart Efficiency Kit",
    targetSeconds: 600,
    kind: "business",
    targetBusinessId: "coffee",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "coffee", countAtLeast: 25 },
  },
  {
    id: "foodtruck-promo",
    name: "Food Truck Promo",
    targetSeconds: 300,
    kind: "business",
    targetBusinessId: "foodtruck",
    effect: { profitMult: 2 },
    unlock: { businessId: "foodtruck", countAtLeast: 10 },
  },
  {
    id: "foodtruck-efficiency",
    name: "Food Truck Efficiency Kit",
    targetSeconds: 720,
    kind: "business",
    targetBusinessId: "foodtruck",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "foodtruck", countAtLeast: 25 },
  },
  {
    id: "gym-promo",
    name: "Gym Promo",
    targetSeconds: 360,
    kind: "business",
    targetBusinessId: "gym",
    effect: { profitMult: 2 },
    unlock: { businessId: "gym", countAtLeast: 10 },
  },
  {
    id: "gym-efficiency",
    name: "Gym Efficiency Kit",
    targetSeconds: 900,
    kind: "business",
    targetBusinessId: "gym",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "gym", countAtLeast: 25 },
  },
  {
    id: "laundromat-promo",
    name: "Laundromat Promo",
    targetSeconds: 420,
    kind: "business",
    targetBusinessId: "laundromat",
    effect: { profitMult: 2 },
    unlock: { businessId: "laundromat", countAtLeast: 10 },
  },
  {
    id: "laundromat-efficiency",
    name: "Laundromat Efficiency Kit",
    targetSeconds: 1200,
    kind: "business",
    targetBusinessId: "laundromat",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "laundromat", countAtLeast: 25 },
  },
  {
    id: "arcade-promo",
    name: "Arcade Promo",
    targetSeconds: 600,
    kind: "business",
    targetBusinessId: "arcade",
    effect: { profitMult: 2 },
    unlock: { businessId: "arcade", countAtLeast: 10 },
  },
  {
    id: "arcade-efficiency",
    name: "Arcade Efficiency Kit",
    targetSeconds: 1500,
    kind: "business",
    targetBusinessId: "arcade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "arcade", countAtLeast: 25 },
  },
  {
    id: "hotel-promo",
    name: "Hotel Promo",
    targetSeconds: 900,
    kind: "business",
    targetBusinessId: "hotel",
    effect: { profitMult: 2 },
    unlock: { businessId: "hotel", countAtLeast: 10 },
  },
  {
    id: "hotel-efficiency",
    name: "Hotel Efficiency Kit",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "hotel",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "hotel", countAtLeast: 25 },
  },
  {
    id: "airline-promo",
    name: "Airline Promo",
    targetSeconds: 1200,
    kind: "business",
    targetBusinessId: "airline",
    effect: { profitMult: 2 },
    unlock: { businessId: "airline", countAtLeast: 10 },
  },
  {
    id: "airline-efficiency",
    name: "Airline Efficiency Kit",
    targetSeconds: 2400,
    kind: "business",
    targetBusinessId: "airline",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "airline", countAtLeast: 25 },
  },
  {
    id: "datacenter-promo",
    name: "Data Center Promo",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "datacenter",
    effect: { profitMult: 2 },
    unlock: { businessId: "datacenter", countAtLeast: 10 },
  },
  {
    id: "datacenter-efficiency",
    name: "Data Center Efficiency Kit",
    targetSeconds: 3600,
    kind: "business",
    targetBusinessId: "datacenter",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "datacenter", countAtLeast: 25 },
  },
  {
    id: "cashflow-playbook",
    name: "Cashflow Playbook",
    targetSeconds: 120,
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
    unlock: { totalCashEarnedAtLeast: 1000 },
  },
  {
    id: "lean-ops",
    name: "Lean Ops",
    targetSeconds: 900,
    kind: "global",
    effect: { timeMult: 0.9 },
    unlock: { totalCashEarnedAtLeast: 5000 },
  },
  {
    id: "hyper-logistics",
    name: "Hyper Logistics",
    targetSeconds: 1800,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 20000 },
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

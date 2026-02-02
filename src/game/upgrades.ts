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
  description: string;
  targetSeconds: number;
  kind: UpgradeKind;
  targetBusinessId?: BusinessId;
  effect: UpgradeEffect;
  unlock: UpgradeUnlock;
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: "lemonade-promo",
    name: "Backroom Card Table Spotlight",
    description: "Increase Backroom Card Table profit.",
    targetSeconds: 60,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { profitMult: 2 },
    unlock: { businessId: "lemonade", countAtLeast: 10 },
  },
  {
    id: "lemonade-efficiency",
    name: "Backroom Card Table Process Kit",
    description: "Reduce Backroom Card Table cycle time.",
    targetSeconds: 180,
    kind: "business",
    targetBusinessId: "lemonade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "lemonade", countAtLeast: 25 },
  },
  {
    id: "newspaper-promo",
    name: "Clickfarm Studio Spotlight",
    description: "Increase Clickfarm Studio profit.",
    targetSeconds: 90,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { profitMult: 2 },
    unlock: { businessId: "newspaper", countAtLeast: 10 },
  },
  {
    id: "newspaper-efficiency",
    name: "Clickfarm Studio Process Kit",
    description: "Reduce Clickfarm Studio cycle time.",
    targetSeconds: 240,
    kind: "business",
    targetBusinessId: "newspaper",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "newspaper", countAtLeast: 25 },
  },
  {
    id: "carwash-promo",
    name: "Course Academy Lite Spotlight",
    description: "Increase Course Academy Lite profit.",
    targetSeconds: 120,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { profitMult: 2 },
    unlock: { businessId: "carwash", countAtLeast: 10 },
  },
  {
    id: "carwash-efficiency",
    name: "Course Academy Lite Process Kit",
    description: "Reduce Course Academy Lite cycle time.",
    targetSeconds: 300,
    kind: "business",
    targetBusinessId: "carwash",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "carwash", countAtLeast: 25 },
  },
  {
    id: "pizza-promo",
    name: "Refund Desk Spotlight",
    description: "Increase Refund Desk profit.",
    targetSeconds: 180,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { profitMult: 2 },
    unlock: { businessId: "pizza", countAtLeast: 10 },
  },
  {
    id: "pizza-efficiency",
    name: "Refund Desk Process Kit",
    description: "Reduce Refund Desk cycle time.",
    targetSeconds: 420,
    kind: "business",
    targetBusinessId: "pizza",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "pizza", countAtLeast: 25 },
  },
  {
    id: "coffee-promo",
    name: "Cafe Front Spotlight",
    description: "Increase Cafe Front profit.",
    targetSeconds: 240,
    kind: "business",
    targetBusinessId: "coffee",
    effect: { profitMult: 2 },
    unlock: { businessId: "coffee", countAtLeast: 10 },
  },
  {
    id: "coffee-efficiency",
    name: "Cafe Front Process Kit",
    description: "Reduce Cafe Front cycle time.",
    targetSeconds: 600,
    kind: "business",
    targetBusinessId: "coffee",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "coffee", countAtLeast: 25 },
  },
  {
    id: "foodtruck-promo",
    name: "Delivery Kiosk Spotlight",
    description: "Increase Delivery Kiosk profit.",
    targetSeconds: 300,
    kind: "business",
    targetBusinessId: "foodtruck",
    effect: { profitMult: 2 },
    unlock: { businessId: "foodtruck", countAtLeast: 10 },
  },
  {
    id: "foodtruck-efficiency",
    name: "Delivery Kiosk Process Kit",
    description: "Reduce Delivery Kiosk cycle time.",
    targetSeconds: 720,
    kind: "business",
    targetBusinessId: "foodtruck",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "foodtruck", countAtLeast: 25 },
  },
  {
    id: "gym-promo",
    name: "Influencer Agency Spotlight",
    description: "Increase Influencer Agency profit.",
    targetSeconds: 360,
    kind: "business",
    targetBusinessId: "gym",
    effect: { profitMult: 2 },
    unlock: { businessId: "gym", countAtLeast: 10 },
  },
  {
    id: "gym-efficiency",
    name: "Influencer Agency Process Kit",
    description: "Reduce Influencer Agency cycle time.",
    targetSeconds: 900,
    kind: "business",
    targetBusinessId: "gym",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "gym", countAtLeast: 25 },
  },
  {
    id: "laundromat-promo",
    name: "Local News Desk Spotlight",
    description: "Increase Local News Desk profit.",
    targetSeconds: 420,
    kind: "business",
    targetBusinessId: "laundromat",
    effect: { profitMult: 2 },
    unlock: { businessId: "laundromat", countAtLeast: 10 },
  },
  {
    id: "laundromat-efficiency",
    name: "Local News Desk Process Kit",
    description: "Reduce Local News Desk cycle time.",
    targetSeconds: 1200,
    kind: "business",
    targetBusinessId: "laundromat",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "laundromat", countAtLeast: 25 },
  },
  {
    id: "arcade-promo",
    name: "Media Channel Spotlight",
    description: "Increase Media Channel profit.",
    targetSeconds: 600,
    kind: "business",
    targetBusinessId: "arcade",
    effect: { profitMult: 2 },
    unlock: { businessId: "arcade", countAtLeast: 10 },
  },
  {
    id: "arcade-efficiency",
    name: "Media Channel Process Kit",
    description: "Reduce Media Channel cycle time.",
    targetSeconds: 1500,
    kind: "business",
    targetBusinessId: "arcade",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "arcade", countAtLeast: 25 },
  },
  {
    id: "hotel-promo",
    name: "Logistics Yard Spotlight",
    description: "Increase Logistics Yard profit.",
    targetSeconds: 900,
    kind: "business",
    targetBusinessId: "hotel",
    effect: { profitMult: 2 },
    unlock: { businessId: "hotel", countAtLeast: 10 },
  },
  {
    id: "hotel-efficiency",
    name: "Logistics Yard Process Kit",
    description: "Reduce Logistics Yard cycle time.",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "hotel",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "hotel", countAtLeast: 25 },
  },
  {
    id: "airline-promo",
    name: "Real Estate Rollup Spotlight",
    description: "Increase Real Estate Rollup profit.",
    targetSeconds: 1200,
    kind: "business",
    targetBusinessId: "airline",
    effect: { profitMult: 2 },
    unlock: { businessId: "airline", countAtLeast: 10 },
  },
  {
    id: "airline-efficiency",
    name: "Real Estate Rollup Process Kit",
    description: "Reduce Real Estate Rollup cycle time.",
    targetSeconds: 2400,
    kind: "business",
    targetBusinessId: "airline",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "airline", countAtLeast: 25 },
  },
  {
    id: "datacenter-promo",
    name: "Cloud Infrastructure Spotlight",
    description: "Increase Cloud Infrastructure profit.",
    targetSeconds: 1800,
    kind: "business",
    targetBusinessId: "datacenter",
    effect: { profitMult: 2 },
    unlock: { businessId: "datacenter", countAtLeast: 10 },
  },
  {
    id: "datacenter-efficiency",
    name: "Cloud Infrastructure Process Kit",
    description: "Reduce Cloud Infrastructure cycle time.",
    targetSeconds: 3600,
    kind: "business",
    targetBusinessId: "datacenter",
    effect: { timeMult: 0.8 },
    unlock: { businessId: "datacenter", countAtLeast: 25 },
  },
  {
    id: "cashflow-playbook",
    name: "Liquidity Playbook",
    description: "Double profits across all operations.",
    targetSeconds: 120,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 200 },
  },
  {
    id: "billboard-blitz",
    name: "Narrative Placement",
    description: "Double profits across all operations.",
    targetSeconds: 300,
    kind: "global",
    effect: { profitMult: 2 },
    unlock: { totalCashEarnedAtLeast: 1000 },
  },
  {
    id: "lean-ops",
    name: "Operational Discipline",
    description: "Reduce all cycle times.",
    targetSeconds: 900,
    kind: "global",
    effect: { timeMult: 0.9 },
    unlock: { totalCashEarnedAtLeast: 5000 },
  },
  {
    id: "hyper-logistics",
    name: "Network Leverage",
    description: "Double profits across all operations.",
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

export type BusinessId =
  | "lemonade"
  | "newspaper"
  | "carwash"
  | "pizza"
  | "coffee"
  | "foodtruck"
  | "gym"
  | "laundromat"
  | "arcade"
  | "hotel"
  | "airline"
  | "datacenter";

export type BusinessDef = {
  id: BusinessId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  baseProfitPerCycle: number;
  profitGrowth?: number;
  baseCycleTimeMs: number;
  managerCostMult?: number;
  unlockAtTotalEarned?: number;
};

export const BUSINESS_DEFS: BusinessDef[] = [
  {
    id: "lemonade",
    name: "Backroom Card Table",
    description: "Quiet stakes. Loud obligations.",
    baseCost: 10,
    costGrowth: 1.15,
    baseProfitPerCycle: 0.4,
    profitGrowth: 1.0,
    baseCycleTimeMs: 2000,
    managerCostMult: 12,
    unlockAtTotalEarned: 0,
  },
  {
    id: "newspaper",
    name: "Clickfarm Studio",
    description: "Engagement on demand. Truth optional.",
    baseCost: 50,
    costGrowth: 1.16,
    baseProfitPerCycle: 4.8,
    profitGrowth: 1.0,
    baseCycleTimeMs: 4000,
    managerCostMult: 16,
    unlockAtTotalEarned: 0,
  },
  {
    id: "carwash",
    name: "Course Academy Lite",
    description: "Sell the dream, keep the refunds moving.",
    baseCost: 200,
    costGrowth: 1.17,
    baseProfitPerCycle: 36.0,
    profitGrowth: 1.0,
    baseCycleTimeMs: 8000,
    managerCostMult: 20,
    unlockAtTotalEarned: 500,
  },
  {
    id: "pizza",
    name: "Refund Desk",
    description: "Customer success, just inverted.",
    baseCost: 1000,
    costGrowth: 1.18,
    baseProfitPerCycle: 240.0,
    profitGrowth: 1.0,
    baseCycleTimeMs: 12000,
    managerCostMult: 24,
    unlockAtTotalEarned: 2000,
  },
  {
    id: "coffee",
    name: "Cafe Front",
    description: "A clean story with a back door.",
    baseCost: 5000,
    costGrowth: 1.19,
    baseProfitPerCycle: 900,
    profitGrowth: 1.0,
    baseCycleTimeMs: 10000,
    managerCostMult: 26,
    unlockAtTotalEarned: 50000,
  },
  {
    id: "foodtruck",
    name: "Delivery Kiosk",
    description: "Convenience with a paper trail.",
    baseCost: 25000,
    costGrowth: 1.2,
    baseProfitPerCycle: 4800,
    profitGrowth: 1.0,
    baseCycleTimeMs: 12000,
    managerCostMult: 27,
    unlockAtTotalEarned: 250000,
  },
  {
    id: "gym",
    name: "Influencer Agency",
    description: "Market trust, bulk rates.",
    baseCost: 120000,
    costGrowth: 1.205,
    baseProfitPerCycle: 27000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 15000,
    managerCostMult: 28,
    unlockAtTotalEarned: 1000000,
  },
  {
    id: "laundromat",
    name: "Local News Desk",
    description: "Own the narrative, write the receipts.",
    baseCost: 600000,
    costGrowth: 1.21,
    baseProfitPerCycle: 144000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 18000,
    managerCostMult: 29,
    unlockAtTotalEarned: 5000000,
  },
  {
    id: "arcade",
    name: "Media Channel",
    description: "Volume beats accuracy.",
    baseCost: 3000000,
    costGrowth: 1.215,
    baseProfitPerCycle: 700000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 20000,
    managerCostMult: 30,
    unlockAtTotalEarned: 25000000,
  },
  {
    id: "hotel",
    name: "Logistics Yard",
    description: "Inventory moves. So do favors.",
    baseCost: 15000000,
    costGrowth: 1.22,
    baseProfitPerCycle: 3750000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 25000,
    managerCostMult: 31,
    unlockAtTotalEarned: 100000000,
  },
  {
    id: "airline",
    name: "Real Estate Rollup",
    description: "Rent is forever.",
    baseCost: 80000000,
    costGrowth: 1.225,
    baseProfitPerCycle: 21000000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 30000,
    managerCostMult: 32,
    unlockAtTotalEarned: 500000000,
  },
  {
    id: "datacenter",
    name: "Cloud Infrastructure",
    description: "If you host it, you control it.",
    baseCost: 400000000,
    costGrowth: 1.23,
    baseProfitPerCycle: 120000000,
    profitGrowth: 1.0,
    baseCycleTimeMs: 40000,
    managerCostMult: 33,
    unlockAtTotalEarned: 2000000000,
  },
];

export const BUSINESS_BY_ID: Record<BusinessId, BusinessDef> = Object.fromEntries(
  BUSINESS_DEFS.map((def) => [def.id, def])
) as Record<BusinessId, BusinessDef>;

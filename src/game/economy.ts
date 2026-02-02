export type BusinessId = "lemonade" | "newspaper" | "carwash" | "pizza";

export type BusinessDef = {
  id: BusinessId;
  name: string;
  baseCost: number;
  costGrowth: number;
  baseProfitPerCycle: number;
  profitGrowth?: number;
  baseCycleTimeMs: number;
};

export const BUSINESS_DEFS: BusinessDef[] = [
  {
    id: "lemonade",
    name: "Lemonade Stand",
    baseCost: 10,
    costGrowth: 1.15,
    baseProfitPerCycle: 0.4,
    profitGrowth: 1.0,
    baseCycleTimeMs: 2000,
  },
  {
    id: "newspaper",
    name: "Newspaper Rack",
    baseCost: 50,
    costGrowth: 1.16,
    baseProfitPerCycle: 4.8,
    profitGrowth: 1.0,
    baseCycleTimeMs: 4000,
  },
  {
    id: "carwash",
    name: "Car Wash",
    baseCost: 200,
    costGrowth: 1.17,
    baseProfitPerCycle: 36.0,
    profitGrowth: 1.0,
    baseCycleTimeMs: 8000,
  },
  {
    id: "pizza",
    name: "Pizza Shop",
    baseCost: 1000,
    costGrowth: 1.18,
    baseProfitPerCycle: 240.0,
    profitGrowth: 1.0,
    baseCycleTimeMs: 12000,
  },
];

export const BUSINESS_BY_ID: Record<BusinessId, BusinessDef> = Object.fromEntries(
  BUSINESS_DEFS.map((def) => [def.id, def])
) as Record<BusinessId, BusinessDef>;
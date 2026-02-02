import type { BusinessId } from "./economy";

export type Plot = {
  id: string;
  x: number;
  y: number;
  buildingId?: string;
};

export type BuildingTypeId = "hq" | "lemonade" | "newspaper" | "carwash" | "pizza";

export type BuildingDef = {
  id: BuildingTypeId;
  name: string;
  businessId?: BusinessId;
  buildCost: number;
  upgradeBaseCost?: number;
  hqLevelRequired: number;
};

export type BuildingInstance = {
  id: string;
  typeId: BuildingTypeId;
  plotId: string;
  buildingLevel: number;
  upgradingUntil: number | null;
};

export type HQLevelConfig = {
  level: number;
  plots: number;
  unlockedBuildingIds: BuildingTypeId[];
  queueSlots: number;
  buyModeUnlocks: Array<"x1" | "x10" | "x100" | "max">;
};

const GRID_COLUMNS = 6;

export const BUILDING_DEFS: BuildingDef[] = [
  {
    id: "hq",
    name: "HQ",
    buildCost: 0,
    upgradeBaseCost: 200,
    hqLevelRequired: 1,
  },
  {
    id: "lemonade",
    name: "Lemonade Stand",
    businessId: "lemonade",
    buildCost: 15,
    hqLevelRequired: 1,
  },
  {
    id: "newspaper",
    name: "Newspaper Rack",
    businessId: "newspaper",
    buildCost: 60,
    hqLevelRequired: 1,
  },
  {
    id: "carwash",
    name: "Car Wash",
    businessId: "carwash",
    buildCost: 250,
    hqLevelRequired: 2,
  },
  {
    id: "pizza",
    name: "Pizza Shop",
    businessId: "pizza",
    buildCost: 1200,
    hqLevelRequired: 3,
  },
];

export const BUILDING_BY_ID: Record<BuildingTypeId, BuildingDef> = Object.fromEntries(
  BUILDING_DEFS.map((def) => [def.id, def])
) as Record<BuildingTypeId, BuildingDef>;

export const HQ_LEVELS: HQLevelConfig[] = [
  {
    level: 1,
    plots: 6,
    unlockedBuildingIds: ["lemonade", "newspaper"],
    queueSlots: 1,
    buyModeUnlocks: ["x1"],
  },
  {
    level: 2,
    plots: 10,
    unlockedBuildingIds: ["lemonade", "newspaper", "carwash"],
    queueSlots: 1,
    buyModeUnlocks: ["x1", "x10"],
  },
  {
    level: 3,
    plots: 14,
    unlockedBuildingIds: ["lemonade", "newspaper", "carwash", "pizza"],
    queueSlots: 1,
    buyModeUnlocks: ["x1", "x10", "x100", "max"],
  },
  {
    level: 4,
    plots: 18,
    unlockedBuildingIds: ["lemonade", "newspaper", "carwash", "pizza"],
    queueSlots: 2,
    buyModeUnlocks: ["x1", "x10", "x100", "max"],
  },
];

export const getHqConfig = (level: number) => {
  const sorted = [...HQ_LEVELS].sort((a, b) => a.level - b.level);
  return sorted.reduce((acc, entry) => (entry.level <= level ? entry : acc), sorted[0]);
};

export const getPlotCountForHqLevel = (level: number) => getHqConfig(level).plots;

export const getUnlockedBuildingIdsForHq = (level: number) => getHqConfig(level).unlockedBuildingIds;

export const getQueueSlotsForHq = (level: number) => getHqConfig(level).queueSlots;

export const getUnlockedBuyModesForHq = (level: number) => getHqConfig(level).buyModeUnlocks;

export const createPlots = (count: number) => {
  const plots: Plot[] = [];
  for (let i = 0; i < count; i += 1) {
    plots.push({
      id: `plot-${i + 1}`,
      x: i % GRID_COLUMNS,
      y: Math.floor(i / GRID_COLUMNS),
    });
  }
  return plots;
};

export const getBuildingProfitMult = (level: number) => {
  if (level <= 1) {
    return 1;
  }
  return 1 + 0.25 * (level - 1);
};

export const getBuildingTimeMult = (level: number) => {
  if (level <= 1) {
    return 1;
  }
  return Math.max(0.6, 1 - 0.05 * (level - 1));
};

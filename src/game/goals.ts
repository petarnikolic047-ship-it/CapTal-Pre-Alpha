import type { BusinessId } from "./economy";
import { BUSINESS_BY_ID } from "./economy";
import type { BuildingTypeId } from "./base";
import { BUILDING_BY_ID } from "./base";

export type GoalType =
  | "own-count"
  | "buy-upgrade"
  | "start-project"
  | "hire-manager"
  | "upgrade-hq"
  | "upgrade-building"
  | "place-building"
  | "bulk-buy";

export type GoalReward =
  | {
      kind: "business-profit";
      businessId: BusinessId;
      mult: number;
      durationMs: number;
    }
  | {
      kind: "project-time";
      mult: number;
      durationMs: number;
    };

export type GoalState = {
  id: string;
  type: GoalType;
  businessId?: BusinessId;
  buildingTypeId?: BuildingTypeId;
  target: number;
  reward: GoalReward;
};

export type GoalProgress = {
  current: number;
  target: number;
  complete: boolean;
};

export type GoalContext = {
  counts: Record<BusinessId, number>;
  managersOwned: Record<BusinessId, boolean>;
  bulkBuys: number;
  purchasedUpgradesCount: number;
  projectsStartedCount: number;
  buildingLevels: Record<BuildingTypeId, number>;
  buildingsBuiltCount: number;
  hqLevel: number;
  unbuiltBuildingTypes: BuildingTypeId[];
  bulkBuyUnlocked: boolean;
  hqTargetLevel: number | null;
  canStartProject: boolean;
};

const BUSINESS_TARGETS = [10, 25, 50, 100];
const GOAL_DURATION_MS = 5 * 60 * 1000;
const BUSINESS_PROFIT_MULT = 1.1;
const PROJECT_TIME_MULT = 0.9;

const createBusinessGoal = (businessId: BusinessId, target: number): GoalState => ({
  id: `own-${businessId}-${target}`,
  type: "own-count",
  businessId,
  target,
  reward: {
    kind: "business-profit",
    businessId,
    mult: BUSINESS_PROFIT_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createUpgradeGoal = (target: number): GoalState => ({
  id: `upgrade-${target}`,
  type: "buy-upgrade",
  target,
  reward: {
    kind: "project-time",
    mult: PROJECT_TIME_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createProjectGoal = (target: number): GoalState => ({
  id: `project-${target}`,
  type: "start-project",
  target,
  reward: {
    kind: "project-time",
    mult: PROJECT_TIME_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createManagerGoal = (businessId: BusinessId): GoalState => ({
  id: `manager-${businessId}`,
  type: "hire-manager",
  businessId,
  target: 1,
  reward: {
    kind: "business-profit",
    businessId,
    mult: BUSINESS_PROFIT_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createHqUpgradeGoal = (targetLevel: number): GoalState => ({
  id: `hq-${targetLevel}`,
  type: "upgrade-hq",
  target: targetLevel,
  reward: {
    kind: "project-time",
    mult: PROJECT_TIME_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createBuildingUpgradeGoal = (
  buildingTypeId: BuildingTypeId,
  targetLevel: number
): GoalState => {
  const businessId = BUILDING_BY_ID[buildingTypeId]?.businessId;
  return {
    id: `building-${buildingTypeId}-${targetLevel}`,
    type: "upgrade-building",
    buildingTypeId,
    target: targetLevel,
    reward: businessId
      ? {
          kind: "business-profit",
          businessId,
          mult: BUSINESS_PROFIT_MULT,
          durationMs: GOAL_DURATION_MS,
        }
      : {
          kind: "project-time",
          mult: PROJECT_TIME_MULT,
          durationMs: GOAL_DURATION_MS,
        },
  };
};

const createPlaceBuildingGoal = (target: number): GoalState => ({
  id: `place-building-${target}`,
  type: "place-building",
  target,
  reward: {
    kind: "project-time",
    mult: PROJECT_TIME_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

const createBulkBuyGoal = (target: number): GoalState => ({
  id: `bulk-buy-${target}`,
  type: "bulk-buy",
  target,
  reward: {
    kind: "project-time",
    mult: PROJECT_TIME_MULT,
    durationMs: GOAL_DURATION_MS,
  },
});

export const buildGoalPool = (
  context: GoalContext,
  unlockedBusinessIds: BusinessId[]
) => {
  const pool: GoalState[] = [];

  for (const id of unlockedBusinessIds) {
    const owned = context.counts[id] ?? 0;
    for (const target of BUSINESS_TARGETS) {
      if (owned < target) {
        pool.push(createBusinessGoal(id, target));
      }
    }
    if (owned > 0 && !context.managersOwned[id]) {
      pool.push(createManagerGoal(id));
    }
  }

  pool.push(createUpgradeGoal(context.purchasedUpgradesCount + 1));
  if (context.canStartProject) {
    pool.push(createProjectGoal(context.projectsStartedCount + 1));
  }

  if (context.hqTargetLevel && context.hqTargetLevel > context.hqLevel) {
    pool.push(createHqUpgradeGoal(context.hqTargetLevel));
  }

  const upgradeTargets = Object.entries(context.buildingLevels)
    .filter(([typeId]) => typeId !== "hq")
    .map(([typeId, level]) => ({
      typeId: typeId as BuildingTypeId,
      target: level + 1,
    }))
    .sort((a, b) => a.target - b.target);

  if (upgradeTargets.length > 0) {
    const target = upgradeTargets[0];
    pool.push(createBuildingUpgradeGoal(target.typeId, target.target));
  }

  if (context.unbuiltBuildingTypes.length > 0) {
    pool.push(createPlaceBuildingGoal(context.buildingsBuiltCount + 1));
  }

  if (context.bulkBuyUnlocked) {
    pool.push(createBulkBuyGoal(context.bulkBuys + 1));
  }

  return pool;
};

export const getGoalProgress = (goal: GoalState, context: GoalContext): GoalProgress => {
  let current = 0;
  if (goal.type === "own-count" && goal.businessId) {
    current = context.counts[goal.businessId] ?? 0;
  } else if (goal.type === "buy-upgrade") {
    current = context.purchasedUpgradesCount;
  } else if (goal.type === "start-project") {
    current = context.projectsStartedCount;
  } else if (goal.type === "hire-manager" && goal.businessId) {
    current = context.managersOwned[goal.businessId] ? 1 : 0;
  } else if (goal.type === "upgrade-hq") {
    current = context.hqLevel;
  } else if (goal.type === "upgrade-building" && goal.buildingTypeId) {
    current = context.buildingLevels[goal.buildingTypeId] ?? 0;
  } else if (goal.type === "place-building") {
    current = context.buildingsBuiltCount;
  } else if (goal.type === "bulk-buy") {
    current = context.bulkBuys;
  }

  return { current, target: goal.target, complete: current >= goal.target };
};

export const formatGoalLabel = (goal: GoalState) => {
  if (goal.type === "own-count" && goal.businessId) {
    const name = BUSINESS_BY_ID[goal.businessId]?.name ?? "Business";
    return `Hit milestone: Own ${goal.target} ${name}`;
  }
  if (goal.type === "buy-upgrade") {
    return `Buy ${goal.target} upgrade${goal.target === 1 ? "" : "s"}`;
  }
  if (goal.type === "start-project") {
    return `Start ${goal.target} operation${goal.target === 1 ? "" : "s"}`;
  }
  if (goal.type === "hire-manager" && goal.businessId) {
    const name = BUSINESS_BY_ID[goal.businessId]?.name ?? "Business";
    return `Hire ${name} handler`;
  }
  if (goal.type === "upgrade-hq") {
    return `Upgrade Head Office to level ${goal.target}`;
  }
  if (goal.type === "upgrade-building" && goal.buildingTypeId) {
    const name = BUILDING_BY_ID[goal.buildingTypeId]?.name ?? "Building";
    return `Upgrade ${name} to level ${goal.target}`;
  }
  if (goal.type === "place-building") {
    return `Place ${goal.target} building${goal.target === 1 ? "" : "s"}`;
  }
  if (goal.type === "bulk-buy") {
    return `Make ${goal.target} bulk buy${goal.target === 1 ? "" : "s"} (10+ units)`;
  }
  return "Complete a goal";
};

export const formatGoalReward = (goal: GoalState) => {
  if (goal.reward.kind === "business-profit") {
    const name = BUSINESS_BY_ID[goal.reward.businessId]?.name ?? "Business";
    return `+${Math.round((goal.reward.mult - 1) * 100)}% ${name} profit for 5m`;
  }
  return `-10% operation time for 5m`;
};

export const pickRandomGoals = (pool: GoalState[], count: number, excludeIds: string[]) => {
  const filtered = pool.filter((goal) => !excludeIds.includes(goal.id));
  if (filtered.length <= count) {
    return filtered;
  }
  const byType = new Map<GoalType, GoalState[]>();
  for (const goal of filtered) {
    const list = byType.get(goal.type) ?? [];
    list.push(goal);
    byType.set(goal.type, list);
  }
  const types = Array.from(byType.keys());
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  const result: GoalState[] = [];
  for (const type of types) {
    const list = byType.get(type);
    if (!list || list.length === 0) {
      continue;
    }
    const choice = list[Math.floor(Math.random() * list.length)];
    result.push(choice);
    if (result.length >= count) {
      return result;
    }
  }
  const remaining = filtered.filter((goal) => !result.includes(goal));
  for (let i = remaining.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return result.concat(remaining.slice(0, count - result.length));
};

import type { BusinessId } from "./economy";
import { BUSINESS_BY_ID } from "./economy";

export type GoalType = "own-count" | "buy-upgrade" | "start-project";

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
  target: number;
  reward: GoalReward;
};

export type GoalProgress = {
  current: number;
  target: number;
  complete: boolean;
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

export const buildGoalPool = (
  counts: Record<BusinessId, number>,
  purchasedUpgradesCount: number,
  projectsStartedCount: number,
  unlockedBusinessIds: BusinessId[]
) => {
  const pool: GoalState[] = [];

  for (const id of unlockedBusinessIds) {
    const owned = counts[id] ?? 0;
    for (const target of BUSINESS_TARGETS) {
      if (owned < target) {
        pool.push(createBusinessGoal(id, target));
      }
    }
  }

  pool.push(createUpgradeGoal(purchasedUpgradesCount + 1));
  pool.push(createProjectGoal(projectsStartedCount + 1));

  return pool;
};

export const getGoalProgress = (
  goal: GoalState,
  counts: Record<BusinessId, number>,
  purchasedUpgradesCount: number,
  projectsStartedCount: number
): GoalProgress => {
  let current = 0;
  if (goal.type === "own-count" && goal.businessId) {
    current = counts[goal.businessId] ?? 0;
  } else if (goal.type === "buy-upgrade") {
    current = purchasedUpgradesCount;
  } else if (goal.type === "start-project") {
    current = projectsStartedCount;
  }

  return { current, target: goal.target, complete: current >= goal.target };
};

export const formatGoalLabel = (goal: GoalState) => {
  if (goal.type === "own-count" && goal.businessId) {
    const name = BUSINESS_BY_ID[goal.businessId]?.name ?? "Business";
    return `Own ${goal.target} ${name}`;
  }
  if (goal.type === "buy-upgrade") {
    return `Buy ${goal.target} upgrade${goal.target === 1 ? "" : "s"}`;
  }
  return `Start ${goal.target} project${goal.target === 1 ? "" : "s"}`;
};

export const formatGoalReward = (goal: GoalState) => {
  if (goal.reward.kind === "business-profit") {
    const name = BUSINESS_BY_ID[goal.reward.businessId]?.name ?? "Business";
    return `+${Math.round((goal.reward.mult - 1) * 100)}% ${name} profit for 5m`;
  }
  return `-10% project time for 5m`;
};

export const pickRandomGoals = (pool: GoalState[], count: number, excludeIds: string[]) => {
  const filtered = pool.filter((goal) => !excludeIds.includes(goal.id));
  if (filtered.length <= count) {
    return filtered;
  }
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

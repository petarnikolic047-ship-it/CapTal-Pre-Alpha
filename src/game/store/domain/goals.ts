import { BUSINESS_DEFS } from "../../economy";
import type { BusinessId } from "../../economy";
import { getHqConfig, getUnlockedBuildingIdsForHq } from "../../base";
import type { BuildingTypeId } from "../../base";
import { getAvailableProjects } from "../../projects";
import { buildGoalPool, getGoalProgress, pickRandomGoals } from "../../goals";
import { GOAL_SLOTS } from "../constants";
import type { GameState } from "../types";
import { getBusinessCounts, isBusinessUnlocked } from "./business";
import { getHqLevelForState, getUnlockedBuyModesForState } from "./buildings";
import { getProjectSlotsForState } from "./projects";

export const getUnlockedBusinessIds = (state: GameState): BusinessId[] =>
  BUSINESS_DEFS.filter((def) => isBusinessUnlocked(state, def.id)).map((def) => def.id);

export const getGoalContextForState = (state: GameState) => {
  const counts = getBusinessCounts(state);
  const managersOwned = BUSINESS_DEFS.reduce((acc, def) => {
    acc[def.id] = Boolean(state.businesses[def.id]?.managerOwned);
    return acc;
  }, {} as Record<BusinessId, boolean>);
  const buildingLevels = Object.values(state.buildings).reduce((acc, building) => {
    const current = acc[building.typeId] ?? 0;
    acc[building.typeId] = Math.max(current, building.buildingLevel);
    return acc;
  }, {} as Record<BuildingTypeId, number>);
  const buildingsBuiltCount = Object.values(state.buildings).filter(
    (building) => building.typeId !== "hq"
  ).length;
  const hqLevel = getHqLevelForState(state);
  const nextHq = getHqConfig(hqLevel + 1);
  const hqTargetLevel = nextHq.level > hqLevel ? nextHq.level : null;
  const unlockedBuildingTypes = getUnlockedBuildingIdsForHq(hqLevel);
  const builtTypes = new Set(Object.values(state.buildings).map((building) => building.typeId));
  const emptyPlots = state.world.plots.filter((plot) => !plot.buildingId).length;
  const unbuiltBuildingTypes =
    emptyPlots > 0
      ? unlockedBuildingTypes.filter(
          (typeId) => typeId !== "hq" && !builtTypes.has(typeId)
        )
      : [];
  const bulkBuyUnlocked = getUnlockedBuyModesForState(state).some(
    (mode) => mode === "x10" || mode === "x100" || mode === "max"
  );
  const availableProjects = getAvailableProjects(
    state.completedProjects,
    state.runningProjects,
    state.totalEarned,
    hqLevel
  );
  const canStartProject =
    availableProjects.length > 0 && state.runningProjects.length < getProjectSlotsForState();

  return {
    counts,
    managersOwned,
    bulkBuys: state.bulkBuys,
    purchasedUpgradesCount: state.purchasedUpgrades.length,
    projectsStartedCount: state.projectsStarted,
    buildingLevels,
    buildingsBuiltCount,
    hqLevel,
    unbuiltBuildingTypes,
    bulkBuyUnlocked,
    hqTargetLevel,
    canStartProject,
  };
};

export const ensureGoals = (state: GameState) => {
  const context = getGoalContextForState(state);
  const pool = buildGoalPool(context, getUnlockedBusinessIds(state));
  const kept = state.activeGoals.filter((goal) => !getGoalProgress(goal, context).complete);
  if (kept.length >= GOAL_SLOTS) {
    return { ...state, activeGoals: kept.slice(0, GOAL_SLOTS) };
  }
  const needed = GOAL_SLOTS - kept.length;
  const newGoals = pickRandomGoals(
    pool,
    needed,
    kept.map((goal) => goal.id)
  );
  return {
    ...state,
    activeGoals: [...kept, ...newGoals],
  };
};

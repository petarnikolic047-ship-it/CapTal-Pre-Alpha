import { BUILDING_DEFS, getBuildingProfitMult, getBuildingTimeMult, getUnlockedBuyModesForHq } from "../../base";
import type { BusinessId } from "../../economy";
import type { GameState } from "../types";

export const getHqLevelForState = (state: GameState) =>
  state.buildings.hq?.buildingLevel && Number.isFinite(state.buildings.hq.buildingLevel)
    ? state.buildings.hq.buildingLevel
    : 1;

export const getUnlockedBuyModesForState = (state: GameState) =>
  getUnlockedBuyModesForHq(getHqLevelForState(state));

export const getBuildingForBusiness = (state: GameState, businessId: BusinessId) => {
  const buildingDef = BUILDING_DEFS.find((def) => def.businessId === businessId);
  if (!buildingDef) {
    return null;
  }
  return (
    Object.values(state.buildings).find((building) => building.typeId === buildingDef.id) ?? null
  );
};

export const getBuildingLevelMults = (state: GameState, businessId: BusinessId) => {
  const building = getBuildingForBusiness(state, businessId);
  const level = building ? building.buildingLevel : 1;
  return {
    profitMult: getBuildingProfitMult(level),
    timeMult: getBuildingTimeMult(level),
  };
};

export const getBuildingUpgradeCostForLevel = (
  def: (typeof BUILDING_DEFS)[number],
  level: number
) => {
  const base = def.upgradeBaseCost ?? def.buildCost;
  return base * Math.pow(1.8, Math.max(0, level - 1));
};

export const getBuildingUpgradeTimeSecForLevel = (level: number) =>
  10 * Math.pow(1.6, Math.max(0, level - 1));

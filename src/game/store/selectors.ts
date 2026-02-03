import { BUILDING_BY_ID, BUILDING_DEFS, getQueueSlotsForHq } from "../base";
import { BUSINESS_BY_ID } from "../economy";
import { getAvailableUpgradesForCounts } from "../upgrades";
import { DEFAULT_MANAGER_COST_MULT } from "./constants";
import {
  getBusinessCounts,
  getBusinessDerived,
  getBuyInfo,
  getIncomePerSecTotalForState,
  getMilestoneMult,
  getNextMilestone,
} from "./domain/business";
import {
  getBuildingUpgradeCostForLevel,
  getBuildingUpgradeTimeSecForLevel,
  getHqLevelForState,
  getUnlockedBuyModesForState,
} from "./domain/buildings";
import {
  getWarDefensePowerForState,
  getWarOffensePowerForState,
  getWarVaultProtectPctForState,
} from "./domain/war";
import { getTheftThresholdForState } from "./domain/risk";
import type { GetState } from "./actions/types";
import type { BusinessId } from "../economy";

export const createGameSelectors = (get: GetState) => ({
  getBusinessState: (id: BusinessId) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    const derived = getBusinessDerived(state, def);
    return {
      ...state.businesses[id],
      totalProfitMult: derived.totalProfitMult,
      totalTimeMult: derived.totalTimeMult,
    };
  },
  getBusinessNextCost: (id: BusinessId) => {
    const def = BUSINESS_BY_ID[id];
    const count = get().businesses[id].count;
    return def.baseCost * Math.pow(def.costGrowth, count);
  },
  getBusinessProfitPerCycle: (id: BusinessId) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).profitPerCycle;
  },
  getBusinessCycleTimeMs: (id: BusinessId) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).cycleTimeMs;
  },
  getBusinessTotalProfitMult: (id: BusinessId) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).totalProfitMult;
  },
  getBusinessTotalTimeMult: (id: BusinessId) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).totalTimeMult;
  },
  getBusinessBuyInfo: (id: BusinessId) => getBuyInfo(get(), id),
  getManagerCost: (id: BusinessId) =>
    BUSINESS_BY_ID[id].baseCost *
    (BUSINESS_BY_ID[id].managerCostMult ??
      DEFAULT_MANAGER_COST_MULT),
  getMilestoneMult: (id: BusinessId) => getMilestoneMult(get().businesses[id].count),
  getNextMilestone: (id: BusinessId) => getNextMilestone(get().businesses[id].count),
  getIncomePerSecTotal: () => getIncomePerSecTotalForState(get()),
  getWorld: () => get().world,
  getBuildingById: (id: string) => get().buildings[id] ?? null,
  getBuildingForPlot: (plotId: string) => {
    const plot = get().world.plots.find((entry) => entry.id === plotId);
    if (!plot || !plot.buildingId) {
      return null;
    }
    return get().buildings[plot.buildingId] ?? null;
  },
  getHqLevel: () => getHqLevelForState(get()),
  getAvailableBuildingDefs: () => BUILDING_DEFS,
  getBuildingUpgradeCost: (id: string) => {
    const state = get();
    const building = state.buildings[id];
    if (!building) {
      return 0;
    }
    const def = BUILDING_BY_ID[building.typeId];
    return getBuildingUpgradeCostForLevel(def, building.buildingLevel);
  },
  getBuildingUpgradeTimeSec: (id: string) => {
    const state = get();
    const building = state.buildings[id];
    if (!building) {
      return 0;
    }
    return getBuildingUpgradeTimeSecForLevel(building.buildingLevel);
  },
  getBuildQueueSlots: () => getQueueSlotsForHq(getHqLevelForState(get())),
  getUnlockedBuyModes: () => getUnlockedBuyModesForState(get()),
  getWarOffensePower: () => getWarOffensePowerForState(get()),
  getWarDefensePower: () => getWarDefensePowerForState(get()),
  getWarVaultProtectPct: () => getWarVaultProtectPctForState(get()),
  getTheftThreshold: () => getTheftThresholdForState(get()),
  getTheftRisk: () => get().cash > getTheftThresholdForState(get()),
  getAvailableUpgrades: () =>
    getAvailableUpgradesForCounts(
      getBusinessCounts(get()),
      get().totalEarned,
      get().purchasedUpgrades
    ),
  isUpgradePurchased: (id: string) => get().purchasedUpgrades.includes(id),
});

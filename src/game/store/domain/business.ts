import { BUSINESS_BY_ID, BUSINESS_DEFS } from "../../economy";
import type { BusinessDef, BusinessId } from "../../economy";
import { UPGRADE_DEFS } from "../../upgrades";
import type { BusinessCounts } from "../../upgrades";
import { MAX_BUY_ITERATIONS, MILESTONES, MIN_CYCLE_MS } from "../constants";
import type { BuyInfo, GameState } from "../types";
import { getBuildingForBusiness, getBuildingLevelMults } from "./buildings";
import { getProjectProfitMult, getProjectTimeMult } from "./projects";

export const getMilestoneMult = (count: number) =>
  MILESTONES.reduce((mult, milestone) => {
    if (count >= milestone.count) {
      return mult * milestone.mult;
    }
    return mult;
  }, 1);

export const getNextMilestone = (count: number) =>
  MILESTONES.find((milestone) => count < milestone.count) ?? null;

const getUpgradeMultipliers = (state: GameState, id: BusinessId) => {
  const purchased = new Set(state.purchasedUpgrades);
  let profitMult = 1;
  let timeMult = 1;

  for (const upgrade of UPGRADE_DEFS) {
    if (!purchased.has(upgrade.id)) {
      continue;
    }
    if (upgrade.kind === "global") {
      if (upgrade.effect.profitMult) {
        profitMult *= upgrade.effect.profitMult;
      }
      if (upgrade.effect.timeMult) {
        timeMult *= upgrade.effect.timeMult;
      }
    }
    if (upgrade.kind === "business" && upgrade.targetBusinessId === id) {
      if (upgrade.effect.profitMult) {
        profitMult *= upgrade.effect.profitMult;
      }
      if (upgrade.effect.timeMult) {
        timeMult *= upgrade.effect.timeMult;
      }
    }
  }

  return { profitMult, timeMult };
};

const getBusinessBuffMult = (state: GameState, id: BusinessId) =>
  state.activeBuffs.reduce((mult, buff) => {
    if (buff.kind === "business-profit" && buff.businessId === id) {
      return mult * buff.mult;
    }
    return mult;
  }, 1);

export const getBusinessDerived = (state: GameState, def: BusinessDef, countOverride?: number) => {
  const business = state.businesses[def.id];
  const count = typeof countOverride === "number" ? countOverride : business.count;
  const milestoneMult = getMilestoneMult(count);
  const upgradeMults = getUpgradeMultipliers(state, def.id);
  const businessBuffMult = getBusinessBuffMult(state, def.id);
  const buildingMults = getBuildingLevelMults(state, def.id);
  const projectProfitMult = getProjectProfitMult(state);
  const projectTimeMult = getProjectTimeMult(state);
  const profitGrowth = def.profitGrowth ?? 1;
  const profitGrowthMult = count > 0 ? Math.pow(profitGrowth, count - 1) : 1;
  const totalProfitMult =
    milestoneMult *
    upgradeMults.profitMult *
    businessBuffMult *
    buildingMults.profitMult *
    projectProfitMult *
    profitGrowthMult;
  const totalTimeMult = upgradeMults.timeMult * buildingMults.timeMult * projectTimeMult;
  const profitPerCycle = def.baseProfitPerCycle * count * totalProfitMult;
  const cycleTimeMs = Math.max(MIN_CYCLE_MS, def.baseCycleTimeMs * totalTimeMult);

  return {
    profitPerCycle,
    cycleTimeMs,
    totalProfitMult,
    totalTimeMult,
  };
};

const calculateBulkCost = (def: BusinessDef, startCount: number, quantity: number) => {
  let cost = 0;
  let nextCost = def.baseCost * Math.pow(def.costGrowth, startCount);
  for (let i = 0; i < quantity; i += 1) {
    cost += nextCost;
    nextCost *= def.costGrowth;
  }
  return cost;
};

const getMaxAffordable = (def: BusinessDef, startCount: number, cash: number): BuyInfo => {
  let quantity = 0;
  let cost = 0;
  let nextCost = def.baseCost * Math.pow(def.costGrowth, startCount);

  while (quantity < MAX_BUY_ITERATIONS && cost + nextCost <= cash) {
    cost += nextCost;
    quantity += 1;
    nextCost *= def.costGrowth;
  }

  return { quantity, cost };
};

export const getBuyInfo = (state: GameState, id: BusinessId): BuyInfo => {
  const def = BUSINESS_BY_ID[id];
  const business = state.businesses[id];
  if (state.buyMode === "max") {
    return getMaxAffordable(def, business.count, state.cash);
  }

  const quantity = state.buyMode === "x10" ? 10 : state.buyMode === "x100" ? 100 : 1;
  const cost = calculateBulkCost(def, business.count, quantity);

  return { quantity, cost };
};

export const getBusinessCounts = (state: GameState): BusinessCounts =>
  BUSINESS_DEFS.reduce((acc, def) => {
    acc[def.id] = state.businesses[def.id]?.count ?? 0;
    return acc;
  }, {} as BusinessCounts);

export const getIncomePerSecTotalForState = (state: GameState) =>
  BUSINESS_DEFS.reduce((sum, def) => {
    const derived = getBusinessDerived(state, def);
    const perSec =
      derived.cycleTimeMs > 0 ? derived.profitPerCycle / (derived.cycleTimeMs / 1000) : 0;
    return sum + perSec;
  }, 0);

export const isBusinessUnlocked = (state: GameState, id: BusinessId) => {
  if (getBuildingForBusiness(state, id)) {
    return true;
  }
  const business = state.businesses[id];
  return Boolean(business && business.count > 0);
};

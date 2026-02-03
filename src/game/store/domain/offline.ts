import { BUSINESS_DEFS } from "../../economy";
import type { BusinessId } from "../../economy";
import { getUnlockedBuyModesForHq } from "../../base";
import type { BuildingInstance } from "../../base";
import { PROJECT_BY_ID } from "../../projects";
import type { ProjectRun } from "../../projects";
import type { BuildQueueItem, BusinessCoreState, GameState } from "../types";
import { pruneExpiredBuffs } from "../helpers/buffs";
import { ensurePlotsForHqLevel, syncWorldBuildings } from "../helpers/world";
import { getBusinessDerived } from "./business";
import { hasAutoRunAll, getOfflineCapSeconds } from "./projects";

export const applyOfflineProgress = (state: GameState, now: number): GameState => {
  const lastSeenAt = Number.isFinite(state.lastSeenAt) ? state.lastSeenAt : now;
  if (now <= lastSeenAt) {
    return { ...state, lastSeenAt: now };
  }

  const activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
  const buffsChanged = activeBuffs.length !== state.activeBuffs.length;
  const stateForCalc = buffsChanged ? { ...state, activeBuffs } : state;
  const autoRunAll = hasAutoRunAll(stateForCalc);
  const dtMs = Math.min(now - lastSeenAt, getOfflineCapSeconds(state) * 1000);
  const effectiveNow = lastSeenAt + dtMs;
  let cash = state.cash;
  let totalEarned = state.totalEarned;
  const businesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };
  let buildings: Record<string, BuildingInstance> = { ...state.buildings };
  let world = state.world;
  let buyMode = state.buyMode;

  for (const def of BUSINESS_DEFS) {
    const current = state.businesses[def.id];
    let updated: BusinessCoreState = { ...current };

    if (updated.count <= 0) {
      updated.running = false;
      updated.endsAt = null;
      businesses[def.id] = updated;
      continue;
    }

    const derived = getBusinessDerived(stateForCalc, def);
    const cycleTimeMs = derived.cycleTimeMs;
    const profitPerCycle = derived.profitPerCycle;

    if (updated.managerOwned || autoRunAll) {
      let remainingMs =
        updated.running && updated.endsAt !== null ? updated.endsAt - lastSeenAt : cycleTimeMs;
      remainingMs = Math.max(0, remainingMs);

      if (dtMs < remainingMs) {
        updated.running = true;
        updated.endsAt = now + (remainingMs - dtMs);
      } else {
        const dtAfter = dtMs - remainingMs;
        const extraPayouts = Math.floor(dtAfter / cycleTimeMs);
        const payouts = 1 + extraPayouts;
        const remainder = dtAfter % cycleTimeMs;
        const earned = payouts * profitPerCycle;
        cash += earned;
        totalEarned += earned;
        updated.running = true;
        updated.endsAt = now + (cycleTimeMs - remainder);
      }

      businesses[def.id] = updated;
      continue;
    }

    if (updated.running && updated.endsAt !== null) {
      let remainingMs = updated.endsAt - lastSeenAt;
      remainingMs = Math.max(0, remainingMs);

      if (dtMs >= remainingMs) {
        cash += profitPerCycle;
        totalEarned += profitPerCycle;
        updated.running = false;
        updated.endsAt = null;
      } else {
        updated.endsAt = now + (remainingMs - dtMs);
      }
    } else {
      updated.running = false;
      updated.endsAt = null;
    }

    businesses[def.id] = updated;
  }

  const completedProjects = new Set(state.completedProjects);
  const runningProjects: ProjectRun[] = [];

  for (const run of state.runningProjects) {
    if (!PROJECT_BY_ID[run.id] || completedProjects.has(run.id)) {
      continue;
    }
    if (run.endsAt <= effectiveNow) {
      completedProjects.add(run.id);
      continue;
    }
    const remainingMs = run.endsAt - effectiveNow;
    runningProjects.push({
      ...run,
      endsAt: now + remainingMs,
    });
  }

  if (state.buildQueue.active.length > 0) {
    const sorted = [...state.buildQueue.active].sort((a, b) => a.finishAt - b.finishAt);
    const remaining: BuildQueueItem[] = [];
    for (const item of sorted) {
      if (item.finishAt <= effectiveNow) {
        const building = buildings[item.buildingId];
        if (!building) {
          continue;
        }
        const nextLevel = building.buildingLevel + 1;
        buildings = {
          ...buildings,
          [item.buildingId]: {
            ...building,
            buildingLevel: nextLevel,
            upgradingUntil: null,
          },
        };
        if (building.typeId === "hq") {
          world = ensurePlotsForHqLevel(world, nextLevel);
          world = syncWorldBuildings(world, buildings);
          const allowed = getUnlockedBuyModesForHq(nextLevel);
          if (!allowed.includes(buyMode)) {
            buyMode = allowed[allowed.length - 1] ?? "x1";
          }
        }
      } else {
        const remainingMs = item.finishAt - effectiveNow;
        remaining.push({
          ...item,
          finishAt: now + remainingMs,
        });
      }
    }
    return {
      ...state,
      cash,
      totalEarned,
      businesses,
      buildings,
      world,
      buyMode,
      activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
      completedProjects: Array.from(completedProjects),
      runningProjects,
      buildQueue: { active: remaining },
      lastSeenAt: now,
    };
  }

  return {
    ...state,
    cash,
    totalEarned,
    businesses,
    buildings,
    world,
    buyMode,
    activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
    completedProjects: Array.from(completedProjects),
    runningProjects,
    lastSeenAt: now,
  };
};

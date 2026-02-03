import type { GameState } from "./types";
import { loadPersistedState } from "./persistence";
import { applyOfflineProgress } from "./domain/offline";
import { ensureGoals } from "./domain/goals";
import { ensureUpgradeOffers } from "./domain/upgrades";
import { getUnlockedBuyModesForState } from "./domain/buildings";
import { generateWarTargets, scheduleNextRaidAt } from "./domain/war";
import { getLeagueConfig, getLeagueForTrophies } from "../war";

export const createInitialState = () => {
  const now = Date.now();
  const persisted = loadPersistedState();
  let baseState: GameState = {
    ...persisted,
    safeCash: persisted.safeCash,
    upgradeOffers: [],
    lastOfferRefreshAt: 0,
    lastTheftCheckAt: now,
    lastTheftLoss: 0,
    activeGoals: [],
    activeBuffs: [],
    uiEvents: [],
    lastUiEventAt: 0,
    projectsStarted: persisted.projectsStarted,
  };

  const allowedModes = getUnlockedBuyModesForState(baseState);
  if (!allowedModes.includes(baseState.buyMode)) {
    baseState = {
      ...baseState,
      buyMode: allowedModes[allowedModes.length - 1] ?? "x1",
    };
  }

  if (baseState.buildQueue.active.length > 0) {
    const filtered = baseState.buildQueue.active.filter((item) =>
      Boolean(baseState.buildings[item.buildingId])
    );
    if (filtered.length !== baseState.buildQueue.active.length) {
      baseState = {
        ...baseState,
        buildQueue: { active: filtered },
      };
    }
  }

  const currentLeague = getLeagueForTrophies(baseState.war.trophies);
  if (baseState.war.league !== currentLeague) {
    baseState = {
      ...baseState,
      war: {
        ...baseState.war,
        league: currentLeague,
      },
    };
  }

  if (!Number.isFinite(baseState.war.nextRaidAt) || baseState.war.nextRaidAt <= 0) {
    const config = getLeagueConfig(currentLeague);
    const schedule = scheduleNextRaidAt(baseState.war.rngSeed, config);
    baseState = {
      ...baseState,
      war: {
        ...baseState.war,
        rngSeed: schedule.seed,
        nextRaidAt: now + schedule.nextAtMs,
      },
    };
  }

  if (baseState.war.targets.length === 0) {
    const generated = generateWarTargets(baseState, baseState.war.rngSeed, now);
    baseState = {
      ...baseState,
      war: {
        ...baseState.war,
        targets: generated.targets,
        lastTargetsAt: now,
        rngSeed: generated.seed,
      },
    };
  }

  const withOffline = applyOfflineProgress(baseState, now);
  const withOffers = ensureUpgradeOffers(withOffline, now);
  return ensureGoals(withOffers);
};

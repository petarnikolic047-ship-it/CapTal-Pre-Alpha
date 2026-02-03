import type { GameState, PersistedState } from "./types";
import { STORAGE_KEY } from "./constants";
import {
  createDefaultBuildings,
  createDefaultBusinesses,
  createDefaultWarState,
  createDefaultWorld,
} from "./helpers/defaults";
import { clampToNumber } from "./helpers/numbers";
import {
  normalizeBuildQueue,
  normalizeBuyMode,
  normalizeBusinesses,
  normalizeBuildings,
  normalizeBulkBuys,
  normalizeCompletedProjects,
  normalizeProjectsStarted,
  normalizeRunningProjects,
  normalizeUpgrades,
  normalizeWorld,
} from "./helpers/normalize";
import { normalizeWarState } from "./helpers/normalizeWar";
import { ensurePlotsForHqLevel, syncWorldBuildings } from "./helpers/world";

export const selectPersistedState = (state: GameState): PersistedState => ({
  cash: state.cash,
  safeCash: state.safeCash,
  totalEarned: state.totalEarned,
  workTaps: state.workTaps,
  bulkBuys: state.bulkBuys,
  buyMode: state.buyMode,
  businesses: state.businesses,
  world: state.world,
  buildings: state.buildings,
  buildQueue: state.buildQueue,
  war: state.war,
  purchasedUpgrades: state.purchasedUpgrades,
  projectsStarted: state.projectsStarted,
  completedProjects: state.completedProjects,
  runningProjects: state.runningProjects,
  lastSeenAt: state.lastSeenAt,
});

export const saveState = (state: PersistedState) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

let latestPersisted: PersistedState | null = null;
let saveTimer: number | null = null;

export const schedulePersist = (state: GameState) => {
  if (typeof window === "undefined") {
    return;
  }
  latestPersisted = selectPersistedState(state);
  if (saveTimer !== null) {
    return;
  }

  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    if (latestPersisted) {
      saveState(latestPersisted);
    }
  }, 1000);
};

export const loadPersistedState = (): PersistedState => {
  if (typeof window === "undefined") {
    return {
      cash: 0,
      safeCash: 0,
      totalEarned: 0,
      workTaps: 0,
      bulkBuys: 0,
      buyMode: "x1",
      businesses: createDefaultBusinesses(),
      world: createDefaultWorld(),
      buildings: createDefaultBuildings(),
      buildQueue: { active: [] },
      war: createDefaultWarState(Date.now()),
      purchasedUpgrades: [],
      projectsStarted: 0,
      completedProjects: [],
      runningProjects: [],
      lastSeenAt: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        cash: 0,
        safeCash: 0,
        totalEarned: 0,
        workTaps: 0,
        bulkBuys: 0,
        buyMode: "x1",
        businesses: createDefaultBusinesses(),
        world: createDefaultWorld(),
        buildings: createDefaultBuildings(),
        buildQueue: { active: [] },
        war: createDefaultWarState(Date.now()),
        purchasedUpgrades: [],
        projectsStarted: 0,
        completedProjects: [],
        runningProjects: [],
        lastSeenAt: Date.now(),
      };
    }

    const data = JSON.parse(raw) as Partial<PersistedState>;
    const cash = typeof data.cash === "number" && Number.isFinite(data.cash) ? data.cash : 0;
    const safeCash = clampToNumber(data.safeCash, 0);
    const totalEarned =
      typeof data.totalEarned === "number" && Number.isFinite(data.totalEarned)
        ? data.totalEarned
        : cash;
    const workTaps =
      typeof data.workTaps === "number" && Number.isFinite(data.workTaps) ? data.workTaps : 0;
    const buildings = normalizeBuildings(data.buildings);
    const world = syncWorldBuildings(
      ensurePlotsForHqLevel(normalizeWorld(data.world), buildings.hq?.buildingLevel ?? 1),
      buildings
    );

    return {
      cash,
      safeCash,
      totalEarned,
      workTaps,
      bulkBuys: normalizeBulkBuys(data.bulkBuys),
      buyMode: normalizeBuyMode(data.buyMode),
      businesses: normalizeBusinesses(data.businesses),
      world,
      buildings,
      buildQueue: normalizeBuildQueue(data.buildQueue),
      war: normalizeWarState(data.war, Date.now()),
      purchasedUpgrades: normalizeUpgrades(data.purchasedUpgrades),
      projectsStarted: normalizeProjectsStarted(data.projectsStarted),
      completedProjects: normalizeCompletedProjects(data.completedProjects),
      runningProjects: normalizeRunningProjects(data.runningProjects),
      lastSeenAt:
        typeof data.lastSeenAt === "number" && Number.isFinite(data.lastSeenAt)
          ? data.lastSeenAt
          : Date.now(),
    };
  } catch {
    return {
      cash: 0,
      safeCash: 0,
      totalEarned: 0,
      workTaps: 0,
      bulkBuys: 0,
      buyMode: "x1",
      businesses: createDefaultBusinesses(),
      world: createDefaultWorld(),
      buildings: createDefaultBuildings(),
      buildQueue: { active: [] },
      war: createDefaultWarState(Date.now()),
      purchasedUpgrades: [],
      projectsStarted: 0,
      completedProjects: [],
      runningProjects: [],
      lastSeenAt: Date.now(),
    };
  }
};

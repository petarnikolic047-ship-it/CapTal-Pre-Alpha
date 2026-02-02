import { create } from "zustand";

import { BUSINESS_BY_ID, BUSINESS_DEFS } from "./economy";
import type { BusinessDef, BusinessId } from "./economy";
import {
  getAvailableUpgradesForCounts,
  getUpgradeCost,
  isUpgradeUnlockedForCounts,
  UPGRADE_DEFS,
  UPGRADE_BY_ID,
} from "./upgrades";
import type { BusinessCounts, UpgradeDef } from "./upgrades";
import {
  getProjectAutoRunAll,
  getProjectCost,
  getProjectGlobalProfitMult,
  getProjectGlobalTimeMult,
  getProjectOfflineCapBonusSeconds,
  getProjectSlots,
  PROJECT_BY_ID,
} from "./projects";
import type { ProjectRun } from "./projects";
import { buildGoalPool, getGoalProgress, pickRandomGoals } from "./goals";
import type { GoalState } from "./goals";

export type BuyMode = "x1" | "x10" | "x100" | "max";

type BusinessCoreState = {
  count: number;
  managerOwned: boolean;
  running: boolean;
  endsAt: number | null;
};

export type BusinessState = BusinessCoreState & {
  totalProfitMult: number;
  totalTimeMult: number;
};

export type TempBuff = {
  id: string;
  kind: "business-profit" | "project-time";
  businessId?: BusinessId;
  mult: number;
  expiresAt: number;
};

export type MilestoneInfo = {
  count: number;
  mult: number;
};

export type BuyInfo = {
  quantity: number;
  cost: number;
};

type GameState = {
  cash: number;
  safeCash: number;
  totalEarned: number;
  workTaps: number;
  buyMode: BuyMode;
  businesses: Record<BusinessId, BusinessCoreState>;
  purchasedUpgrades: string[];
  upgradeOffers: string[];
  lastOfferRefreshAt: number;
  lastTheftCheckAt: number;
  lastTheftLoss: number;
  activeGoals: GoalState[];
  activeBuffs: TempBuff[];
  projectsStarted: number;
  completedProjects: string[];
  runningProjects: ProjectRun[];
  lastSeenAt: number;
};

type GameActions = {
  tapWork: () => void;
  setBuyMode: (mode: BuyMode) => void;
  buyBusiness: (id: BusinessId) => void;
  runBusiness: (id: BusinessId) => void;
  runAllBusinesses: () => void;
  hireManager: (id: BusinessId) => void;
  depositSafe: (amount: number) => void;
  withdrawSafe: (amount: number) => void;
  buyUpgrade: (id: string) => void;
  startProject: (id: string) => void;
  processBusinessCycles: (now: number) => void;
  processProjectCompletions: (now: number) => void;
  processUpgradeOffers: (now: number) => void;
  processRiskEvents: (now: number) => void;
  processGoals: (now: number) => void;
  syncOfflineProgress: (now: number) => void;
  markSeen: (now: number) => void;
};

type GameSelectors = {
  getBusinessState: (id: BusinessId) => BusinessState;
  getBusinessNextCost: (id: BusinessId) => number;
  getBusinessProfitPerCycle: (id: BusinessId) => number;
  getBusinessCycleTimeMs: (id: BusinessId) => number;
  getBusinessTotalProfitMult: (id: BusinessId) => number;
  getBusinessTotalTimeMult: (id: BusinessId) => number;
  getBusinessBuyInfo: (id: BusinessId) => BuyInfo;
  getManagerCost: (id: BusinessId) => number;
  getMilestoneMult: (id: BusinessId) => number;
  getNextMilestone: (id: BusinessId) => MilestoneInfo | null;
  getIncomePerSecTotal: () => number;
  getTheftThreshold: () => number;
  getTheftRisk: () => boolean;
  getAvailableUpgrades: () => UpgradeDef[];
  isUpgradePurchased: (id: string) => boolean;
};

type GameStore = GameState & GameActions & GameSelectors;

type PersistedState = Pick<
  GameState,
  | "cash"
  | "safeCash"
  | "totalEarned"
  | "workTaps"
  | "buyMode"
  | "businesses"
  | "purchasedUpgrades"
  | "projectsStarted"
  | "completedProjects"
  | "runningProjects"
  | "lastSeenAt"
>;

const STORAGE_KEY = "adcap-core-state-v4";

const TAP_PAY = 0.25;
const TAP_BONUS_EVERY = 20;
const TAP_BONUS_AMOUNT = 2.0;
const DEFAULT_MANAGER_COST_MULT = 25;
const BASE_OFFLINE_CAP_SECONDS = 2 * 60 * 60;
const MAX_BUY_ITERATIONS = 500;
const MAX_CYCLE_CATCHUP = 100;
const MIN_CYCLE_MS = 250;
const UPGRADE_OFFER_REFRESH_MS = 90 * 1000;
const THEFT_CHECK_MS = 60 * 1000;
const THEFT_CHANCE = 0.25;
const THEFT_MIN_PCT = 0.05;
const THEFT_MAX_PCT = 0.12;
const THEFT_BASE_THRESHOLD = 50;
const THEFT_THRESHOLD_SECONDS = 90;
const GOAL_SLOTS = 3;

const MILESTONES: MilestoneInfo[] = [
  { count: 10, mult: 2 },
  { count: 25, mult: 2 },
  { count: 50, mult: 3 },
  { count: 100, mult: 5 },
];

const clampToInt = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
};

const clampToNumber = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
};

const createDefaultBusinessState = (): BusinessCoreState => ({
  count: 0,
  managerOwned: false,
  running: false,
  endsAt: null,
});

const createDefaultBusinesses = (): Record<BusinessId, BusinessCoreState> =>
  BUSINESS_DEFS.reduce((acc, def) => {
    acc[def.id] = createDefaultBusinessState();
    return acc;
  }, {} as Record<BusinessId, BusinessCoreState>);

const normalizeBusinessState = (value: unknown): BusinessCoreState => {
  const base = createDefaultBusinessState();

  if (typeof value === "number" && Number.isFinite(value)) {
    base.count = Math.max(0, Math.floor(value));
    return base;
  }

  if (!value || typeof value !== "object") {
    return base;
  }

  const raw = value as Record<string, unknown>;
  base.count = clampToInt(raw.count, 0);
  if (typeof raw.managerOwned === "boolean") {
    base.managerOwned = raw.managerOwned;
  }
  if (typeof raw.running === "boolean") {
    base.running = raw.running;
  }
  if (typeof raw.endsAt === "number" && Number.isFinite(raw.endsAt)) {
    base.endsAt = raw.endsAt;
  }

  if (base.count <= 0) {
    base.running = false;
    base.endsAt = null;
  }

  if (!base.running || base.endsAt === null) {
    base.running = false;
    base.endsAt = null;
  }

  return base;
};

const normalizeBusinesses = (value: unknown) => {
  const base = createDefaultBusinesses();
  if (!value || typeof value !== "object") {
    return base;
  }

  for (const def of BUSINESS_DEFS) {
    const raw = (value as Record<string, unknown>)[def.id];
    base[def.id] = normalizeBusinessState(raw);
  }

  return base;
};

const normalizeBuyMode = (value: unknown): BuyMode => {
  if (value === "x1" || value === "x10" || value === "x100" || value === "max") {
    return value;
  }
  return "x1";
};

const normalizeUpgrades = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value.filter((entry) => typeof entry === "string");
};

const normalizeProjectsStarted = (value: unknown) => clampToInt(value, 0);

const normalizeCompletedProjects = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string" && PROJECT_BY_ID[entry]) {
      unique.add(entry);
    }
  }
  return Array.from(unique);
};

const normalizeRunningProjects = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as ProjectRun[];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const raw = entry as Record<string, unknown>;
      if (typeof raw.id !== "string" || !PROJECT_BY_ID[raw.id]) {
        return null;
      }
      const startedAt =
        typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt) ? raw.startedAt : 0;
      const endsAt =
        typeof raw.endsAt === "number" && Number.isFinite(raw.endsAt) ? raw.endsAt : 0;
      const cost = typeof raw.cost === "number" && Number.isFinite(raw.cost) ? raw.cost : 0;
      return {
        id: raw.id,
        startedAt,
        endsAt,
        cost,
      } as ProjectRun;
    })
    .filter((entry): entry is ProjectRun => Boolean(entry));
};

const getMilestoneMult = (count: number) =>
  MILESTONES.reduce((mult, milestone) => {
    if (count >= milestone.count) {
      return mult * milestone.mult;
    }
    return mult;
  }, 1);

const getNextMilestone = (count: number) =>
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

const getProjectTimeBuffMult = (state: GameState) =>
  state.activeBuffs.reduce((mult, buff) => {
    if (buff.kind === "project-time") {
      return mult * buff.mult;
    }
    return mult;
  }, 1);

const getBusinessDerived = (state: GameState, def: BusinessDef, countOverride?: number) => {
  const business = state.businesses[def.id];
  const count = typeof countOverride === "number" ? countOverride : business.count;
  const milestoneMult = getMilestoneMult(count);
  const upgradeMults = getUpgradeMultipliers(state, def.id);
  const businessBuffMult = getBusinessBuffMult(state, def.id);
  const projectProfitMult = getProjectProfitMult(state);
  const projectTimeMult = getProjectTimeMult(state);
  const profitGrowth = def.profitGrowth ?? 1;
  const profitGrowthMult = count > 0 ? Math.pow(profitGrowth, count - 1) : 1;
  const totalProfitMult =
    milestoneMult * upgradeMults.profitMult * businessBuffMult * projectProfitMult * profitGrowthMult;
  const totalTimeMult = upgradeMults.timeMult * projectTimeMult;
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

const getBuyInfo = (state: GameState, id: BusinessId): BuyInfo => {
  const def = BUSINESS_BY_ID[id];
  const business = state.businesses[id];
  if (state.buyMode === "max") {
    return getMaxAffordable(def, business.count, state.cash);
  }

  const quantity = state.buyMode === "x10" ? 10 : state.buyMode === "x100" ? 100 : 1;
  const cost = calculateBulkCost(def, business.count, quantity);

  return { quantity, cost };
};

const getBusinessCounts = (state: GameState): BusinessCounts =>
  BUSINESS_DEFS.reduce((acc, def) => {
    acc[def.id] = state.businesses[def.id]?.count ?? 0;
    return acc;
  }, {} as BusinessCounts);

const isBusinessUnlocked = (state: GameState, id: BusinessId) => {
  const unlockAt = BUSINESS_BY_ID[id].unlockAtTotalEarned ?? 0;
  return state.totalEarned >= unlockAt;
};

const getProjectSlotsForState = () => getProjectSlots();

const getProjectProfitMult = (state: GameState) =>
  getProjectGlobalProfitMult(state.completedProjects);

const getProjectTimeMult = (state: GameState) =>
  getProjectGlobalTimeMult(state.completedProjects);

const hasAutoRunAll = (state: GameState) => getProjectAutoRunAll(state.completedProjects);

const getOfflineCapSeconds = (state: GameState) =>
  BASE_OFFLINE_CAP_SECONDS + getProjectOfflineCapBonusSeconds(state.completedProjects);

const getIncomePerSecTotalForState = (state: GameState) =>
  BUSINESS_DEFS.reduce((sum, def) => {
    const derived = getBusinessDerived(state, def);
    const perSec = derived.cycleTimeMs > 0 ? derived.profitPerCycle / (derived.cycleTimeMs / 1000) : 0;
    return sum + perSec;
  }, 0);

const getTheftThresholdForState = (state: GameState) => {
  const incomePerSec = getIncomePerSecTotalForState(state);
  return Math.max(THEFT_BASE_THRESHOLD, incomePerSec * THEFT_THRESHOLD_SECONDS);
};

const pruneExpiredBuffs = (buffs: TempBuff[], now: number) =>
  buffs.filter((buff) => buff.expiresAt > now);

const getProjectDurationMsForState = (state: GameState, baseDurationMs: number) => {
  const timeMult = getProjectTimeBuffMult(state);
  return Math.max(1000, baseDurationMs * timeMult);
};

const getUnlockedBusinessIds = (state: GameState): BusinessId[] =>
  BUSINESS_DEFS.filter((def) => isBusinessUnlocked(state, def.id)).map((def) => def.id);

const sampleUpgradeOffers = (available: UpgradeDef[], count: number) => {
  if (available.length <= count) {
    return available.map((upgrade) => upgrade.id);
  }
  const pool = [...available];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map((upgrade) => upgrade.id);
};

const ensureUpgradeOffers = (state: GameState, now: number) => {
  const available = getAvailableUpgradesForCounts(
    getBusinessCounts(state),
    state.totalEarned,
    state.purchasedUpgrades
  );
  const availableIds = new Set(available.map((upgrade) => upgrade.id));
  const filtered = state.upgradeOffers.filter((id) => availableIds.has(id));
  if (filtered.length === Math.min(3, available.length)) {
    return state;
  }
  return {
    ...state,
    upgradeOffers: sampleUpgradeOffers(available, 3),
    lastOfferRefreshAt: now,
  };
};

const ensureGoals = (state: GameState) => {
  const counts = getBusinessCounts(state);
  const pool = buildGoalPool(
    counts,
    state.purchasedUpgrades.length,
    state.projectsStarted,
    getUnlockedBusinessIds(state)
  );
  const kept = state.activeGoals.filter(
    (goal) =>
      !getGoalProgress(
        goal,
        counts,
        state.purchasedUpgrades.length,
        state.projectsStarted
      ).complete
  );
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

const applyOfflineProgress = (state: GameState, now: number): GameState => {
  const lastSeenAt = Number.isFinite(state.lastSeenAt) ? state.lastSeenAt : now;
  if (now <= lastSeenAt) {
    return { ...state, lastSeenAt: now };
  }

  const activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
  const buffsChanged = activeBuffs.length !== state.activeBuffs.length;
  const stateForCalc = buffsChanged ? { ...state, activeBuffs } : state;
  const autoRunAll = hasAutoRunAll(stateForCalc);
  const dtMs = Math.min(now - lastSeenAt, getOfflineCapSeconds(state) * 1000);
  let cash = state.cash;
  let totalEarned = state.totalEarned;
  const businesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

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
      let remainingMs = updated.running && updated.endsAt !== null ? updated.endsAt - lastSeenAt : cycleTimeMs;
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
    if (run.endsAt <= now) {
      completedProjects.add(run.id);
      continue;
    }
    runningProjects.push(run);
  }

  return {
    ...state,
    cash,
    totalEarned,
    businesses,
    activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
    completedProjects: Array.from(completedProjects),
    runningProjects,
    lastSeenAt: now,
  };
};

const loadPersistedState = (): PersistedState => {
  if (typeof window === "undefined") {
    return {
      cash: 0,
      safeCash: 0,
      totalEarned: 0,
      workTaps: 0,
      buyMode: "x1",
      businesses: createDefaultBusinesses(),
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
        buyMode: "x1",
        businesses: createDefaultBusinesses(),
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

    return {
      cash,
      safeCash,
      totalEarned,
      workTaps,
      buyMode: normalizeBuyMode(data.buyMode),
      businesses: normalizeBusinesses(data.businesses),
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
      buyMode: "x1",
      businesses: createDefaultBusinesses(),
      purchasedUpgrades: [],
      projectsStarted: 0,
      completedProjects: [],
      runningProjects: [],
      lastSeenAt: Date.now(),
    };
  }
};

const createInitialState = () => {
  const now = Date.now();
  const persisted = loadPersistedState();
  const baseState: GameState = {
    ...persisted,
    safeCash: persisted.safeCash,
    upgradeOffers: [],
    lastOfferRefreshAt: 0,
    lastTheftCheckAt: now,
    lastTheftLoss: 0,
    activeGoals: [],
    activeBuffs: [],
    projectsStarted: persisted.projectsStarted,
  };

  const withOffline = applyOfflineProgress(baseState, now);
  const withOffers = ensureUpgradeOffers(withOffline, now);
  return ensureGoals(withOffers);
};

const initialState = createInitialState();

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,
  tapWork: () =>
    set((state) => {
      const nextTaps = state.workTaps + 1;
      const bonus = nextTaps % TAP_BONUS_EVERY === 0 ? TAP_BONUS_AMOUNT : 0;
      const earned = TAP_PAY + bonus;
      return {
        workTaps: nextTaps,
        cash: state.cash + earned,
        totalEarned: state.totalEarned + earned,
      };
    }),
  setBuyMode: (mode) => set({ buyMode: mode }),
  buyBusiness: (id) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const def = BUSINESS_BY_ID[id];
    const business = state.businesses[id];
    const buyInfo = getBuyInfo(state, id);

    if (buyInfo.quantity <= 0 || state.cash < buyInfo.cost) {
      return;
    }

    const nextCount = business.count + buyInfo.quantity;
    const nextBusinesses = {
      ...state.businesses,
      [id]: {
        ...business,
        count: nextCount,
      },
    } as Record<BusinessId, BusinessCoreState>;

    const derived = getBusinessDerived({ ...state, businesses: nextBusinesses }, def, nextCount);
    const shouldAutoStart =
      (business.managerOwned || hasAutoRunAll(state)) && !business.running && nextCount > 0;

    if (shouldAutoStart) {
      nextBusinesses[id] = {
        ...nextBusinesses[id],
        running: true,
        endsAt: Date.now() + derived.cycleTimeMs,
      };
    }

    set({
      cash: state.cash - buyInfo.cost,
      businesses: nextBusinesses,
    });
  },
  runBusiness: (id) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const business = state.businesses[id];
    if (business.count <= 0 || business.running) {
      return;
    }

    const def = BUSINESS_BY_ID[id];
    const derived = getBusinessDerived(state, def);
    const now = Date.now();

    set({
      businesses: {
        ...state.businesses,
        [id]: {
          ...business,
          running: true,
          endsAt: now + derived.cycleTimeMs,
        },
      },
    });
  },
  runAllBusinesses: () => {
    const state = get();
    const now = Date.now();
    let changed = false;
    const nextBusinesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

    for (const def of BUSINESS_DEFS) {
      if (!isBusinessUnlocked(state, def.id)) {
        continue;
      }
      const business = state.businesses[def.id];
      if (business.running || business.count <= 0) {
        continue;
      }
      const derived = getBusinessDerived(state, def);
      nextBusinesses[def.id] = {
        ...business,
        running: true,
        endsAt: now + derived.cycleTimeMs,
      };
      changed = true;
    }

    if (changed) {
      set({ businesses: nextBusinesses });
    }
  },
  hireManager: (id) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const def = BUSINESS_BY_ID[id];
    const business = state.businesses[id];
    if (business.managerOwned) {
      return;
    }

    const cost = def.baseCost * (def.managerCostMult ?? DEFAULT_MANAGER_COST_MULT);
    if (state.cash < cost) {
      return;
    }

    const derived = getBusinessDerived(state, def);
    const now = Date.now();
    const shouldAutoStart = business.count > 0 && !business.running;

    set({
      cash: state.cash - cost,
      businesses: {
        ...state.businesses,
        [id]: {
          ...business,
          managerOwned: true,
          running: shouldAutoStart ? true : business.running,
          endsAt: shouldAutoStart ? now + derived.cycleTimeMs : business.endsAt,
        },
      },
    });
  },
  depositSafe: (amount) =>
    set((state) => {
      const value = Math.min(amount, state.cash);
      if (value <= 0) {
        return state;
      }
      return {
        cash: state.cash - value,
        safeCash: state.safeCash + value,
      };
    }),
  withdrawSafe: (amount) =>
    set((state) => {
      const value = Math.min(amount, state.safeCash);
      if (value <= 0) {
        return state;
      }
      return {
        cash: state.cash + value,
        safeCash: state.safeCash - value,
      };
    }),
  buyUpgrade: (id) => {
    const state = get();
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade || state.purchasedUpgrades.includes(id)) {
      return;
    }
    if (!isUpgradeUnlockedForCounts(upgrade, getBusinessCounts(state), state.totalEarned)) {
      return;
    }
    const incomePerSec = getIncomePerSecTotalForState(state);
    const cost = getUpgradeCost(incomePerSec, upgrade);
    if (cost <= 0 || state.cash < cost) {
      return;
    }

    const nextState = {
      ...state,
      cash: state.cash - cost,
      purchasedUpgrades: [...state.purchasedUpgrades, id],
    };
    const refreshed = ensureUpgradeOffers(nextState, Date.now());
    set(refreshed);
  },
  startProject: (id) => {
    const state = get();
    const project = PROJECT_BY_ID[id];
    if (!project) {
      return;
    }
    if (state.completedProjects.includes(id)) {
      return;
    }
    if (!project.unlock || state.totalEarned >= (project.unlock.totalEarnedAtLeast ?? 0)) {
      // ok
    } else {
      return;
    }
    if (state.runningProjects.some((run) => run.id === id)) {
      return;
    }
    if (state.runningProjects.length >= getProjectSlotsForState()) {
      return;
    }
    const incomePerSec = getIncomePerSecTotalForState(state);
    const cost = getProjectCost(incomePerSec, project);
    if (cost <= 0 || state.cash < cost) {
      return;
    }
    const now = Date.now();
    const durationMs = getProjectDurationMsForState(state, project.durationMs);
    set({
      cash: state.cash - cost,
      projectsStarted: state.projectsStarted + 1,
      runningProjects: [
        ...state.runningProjects,
        {
          id: project.id,
          startedAt: now,
          endsAt: now + durationMs,
          cost,
        },
      ],
    });
  },
  processBusinessCycles: (now) => {
    const state = get();
    const activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    const buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    const stateForCalc = buffsChanged ? { ...state, activeBuffs } : state;
    const autoRunAll = hasAutoRunAll(stateForCalc);
    let cash = state.cash;
    let totalEarned = state.totalEarned;
    let changed = buffsChanged;
    const nextBusinesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

    for (const def of BUSINESS_DEFS) {
      const business = state.businesses[def.id];
      let running = business.running;
      let endsAt = business.endsAt;

      if (business.count <= 0) {
        if (business.running || business.endsAt !== null) {
          nextBusinesses[def.id] = {
            ...business,
            running: false,
            endsAt: null,
          };
          changed = true;
        }
        continue;
      }

      const derived = getBusinessDerived(stateForCalc, def);
      const cycleTimeMs = derived.cycleTimeMs;
      const profitPerCycle = derived.profitPerCycle;
      const shouldAutoRun = business.managerOwned || autoRunAll;

      if (shouldAutoRun && !running) {
        running = true;
        endsAt = now + cycleTimeMs;
      }

      if (running && endsAt !== null && endsAt <= now) {
        if (shouldAutoRun) {
          let loops = 0;
          while (endsAt !== null && endsAt <= now && loops < MAX_CYCLE_CATCHUP) {
            cash += profitPerCycle;
            totalEarned += profitPerCycle;
            endsAt += cycleTimeMs;
            loops += 1;
          }
          if (endsAt !== null && endsAt <= now) {
            endsAt = now + cycleTimeMs;
          }
          running = true;
        } else {
          cash += profitPerCycle;
          totalEarned += profitPerCycle;
          running = false;
          endsAt = null;
        }
      }

      if (running !== business.running || endsAt !== business.endsAt) {
        nextBusinesses[def.id] = {
          ...business,
          running,
          endsAt,
        };
        changed = true;
      }
    }

    if (changed || cash !== state.cash || totalEarned !== state.totalEarned) {
      set({
        cash,
        totalEarned,
        businesses: nextBusinesses,
        activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
      });
    }
  },
  processProjectCompletions: (now) => {
    const state = get();
    if (state.runningProjects.length === 0) {
      return;
    }
    const completed = new Set(state.completedProjects);
    let changed = false;
    const running: ProjectRun[] = [];

    for (const run of state.runningProjects) {
      if (!PROJECT_BY_ID[run.id] || completed.has(run.id)) {
        changed = true;
        continue;
      }
      if (run.endsAt <= now) {
        completed.add(run.id);
        changed = true;
      } else {
        running.push(run);
      }
    }

    if (changed) {
      set({
        completedProjects: Array.from(completed),
        runningProjects: running,
      });
    }
  },
  processUpgradeOffers: (now) => {
    const state = get();
    const available = getAvailableUpgradesForCounts(
      getBusinessCounts(state),
      state.totalEarned,
      state.purchasedUpgrades
    );
    const availableIds = new Set(available.map((upgrade) => upgrade.id));
    const filtered = state.upgradeOffers.filter((id) => availableIds.has(id));
    const targetCount = Math.min(3, available.length);
    const offersChanged = filtered.length !== state.upgradeOffers.length;
    const needsRefresh =
      now - state.lastOfferRefreshAt >= UPGRADE_OFFER_REFRESH_MS ||
      filtered.length < targetCount;

    if (!offersChanged && !needsRefresh) {
      return;
    }

    const nextOffers = needsRefresh ? sampleUpgradeOffers(available, 3) : filtered;
    set({
      upgradeOffers: nextOffers,
      lastOfferRefreshAt: needsRefresh ? now : state.lastOfferRefreshAt,
    });
  },
  processRiskEvents: (now) => {
    const state = get();
    if (now - state.lastTheftCheckAt < THEFT_CHECK_MS) {
      return;
    }
    const threshold = getTheftThresholdForState(state);
    let cash = state.cash;
    let lastLoss = state.lastTheftLoss;

    if (cash > threshold && Math.random() < THEFT_CHANCE) {
      const pct = THEFT_MIN_PCT + Math.random() * (THEFT_MAX_PCT - THEFT_MIN_PCT);
      const loss = cash * pct;
      cash = Math.max(0, cash - loss);
      lastLoss = loss;
    }

    if (cash !== state.cash || lastLoss !== state.lastTheftLoss) {
      set({
        cash,
        lastTheftLoss: lastLoss,
        lastTheftCheckAt: now,
      });
    } else if (state.lastTheftCheckAt !== now) {
      set({ lastTheftCheckAt: now });
    }
  },
  processGoals: (now) => {
    const state = get();
    const counts = getBusinessCounts(state);
    const purchasedCount = state.purchasedUpgrades.length;
    const projectsStarted = state.projectsStarted;
    let activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    let buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    let runningProjects = state.runningProjects;
    let activeGoals: GoalState[] = [];
    let goalsChanged = false;

    for (const goal of state.activeGoals) {
      const progress = getGoalProgress(goal, counts, purchasedCount, projectsStarted);
      if (!progress.complete) {
        activeGoals.push(goal);
        continue;
      }

      const reward = goal.reward;
      const buffId = `goal-${goal.id}-${now}`;
      if (reward.kind === "business-profit") {
        activeBuffs = [
          ...activeBuffs,
          {
            id: buffId,
            kind: "business-profit",
            businessId: reward.businessId,
            mult: reward.mult,
            expiresAt: now + reward.durationMs,
          },
        ];
        buffsChanged = true;
      } else if (reward.kind === "project-time") {
        activeBuffs = [
          ...activeBuffs,
          {
            id: buffId,
            kind: "project-time",
            mult: reward.mult,
            expiresAt: now + reward.durationMs,
          },
        ];
        if (runningProjects.length > 0) {
          runningProjects = runningProjects.map((run) => {
            const remaining = run.endsAt - now;
            if (remaining <= 0) {
              return run;
            }
            return {
              ...run,
              endsAt: now + remaining * reward.mult,
            };
          });
        }
        buffsChanged = true;
      }

      goalsChanged = true;
    }

    if (activeGoals.length < GOAL_SLOTS) {
      const pool = buildGoalPool(
        counts,
        purchasedCount,
        projectsStarted,
        getUnlockedBusinessIds(state)
      );
      const newGoals = pickRandomGoals(
        pool,
        GOAL_SLOTS - activeGoals.length,
        activeGoals.map((goal) => goal.id)
      );
      if (newGoals.length > 0) {
        activeGoals = [...activeGoals, ...newGoals];
        goalsChanged = true;
      }
    }

    if (goalsChanged || buffsChanged) {
      set({
        activeGoals,
        activeBuffs,
        runningProjects,
      });
    } else if (runningProjects !== state.runningProjects) {
      set({ runningProjects });
    }
  },
  syncOfflineProgress: (now) => {
    const state = get();
    const nextState = applyOfflineProgress(state, now);
    const withOffers = ensureUpgradeOffers(nextState, now);
    set(ensureGoals(withOffers));
  },
  markSeen: (now) => {
    const state = get();
    if (state.lastSeenAt !== now) {
      set({ lastSeenAt: now });
    }
  },
  getBusinessState: (id) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    const derived = getBusinessDerived(state, def);
    return {
      ...state.businesses[id],
      totalProfitMult: derived.totalProfitMult,
      totalTimeMult: derived.totalTimeMult,
    };
  },
  getBusinessNextCost: (id) => {
    const def = BUSINESS_BY_ID[id];
    const count = get().businesses[id].count;
    return def.baseCost * Math.pow(def.costGrowth, count);
  },
  getBusinessProfitPerCycle: (id) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).profitPerCycle;
  },
  getBusinessCycleTimeMs: (id) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).cycleTimeMs;
  },
  getBusinessTotalProfitMult: (id) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).totalProfitMult;
  },
  getBusinessTotalTimeMult: (id) => {
    const state = get();
    const def = BUSINESS_BY_ID[id];
    return getBusinessDerived(state, def).totalTimeMult;
  },
  getBusinessBuyInfo: (id) => getBuyInfo(get(), id),
  getManagerCost: (id) =>
    BUSINESS_BY_ID[id].baseCost *
    (BUSINESS_BY_ID[id].managerCostMult ?? DEFAULT_MANAGER_COST_MULT),
  getMilestoneMult: (id) => getMilestoneMult(get().businesses[id].count),
  getNextMilestone: (id) => getNextMilestone(get().businesses[id].count),
  getIncomePerSecTotal: () => getIncomePerSecTotalForState(get()),
  getTheftThreshold: () => getTheftThresholdForState(get()),
  getTheftRisk: () => get().cash > getTheftThresholdForState(get()),
  getAvailableUpgrades: () =>
    getAvailableUpgradesForCounts(
      getBusinessCounts(get()),
      get().totalEarned,
      get().purchasedUpgrades
    ),
  isUpgradePurchased: (id) => get().purchasedUpgrades.includes(id),
}));

const selectPersistedState = (state: GameState): PersistedState => ({
  cash: state.cash,
  safeCash: state.safeCash,
  totalEarned: state.totalEarned,
  workTaps: state.workTaps,
  buyMode: state.buyMode,
  businesses: state.businesses,
  purchasedUpgrades: state.purchasedUpgrades,
  projectsStarted: state.projectsStarted,
  completedProjects: state.completedProjects,
  runningProjects: state.runningProjects,
  lastSeenAt: state.lastSeenAt,
});

const saveState = (state: PersistedState) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

let latestPersisted: PersistedState | null = null;
let saveTimer: number | null = null;

const schedulePersist = (state: GameState) => {
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

useGameStore.subscribe((state) => {
  schedulePersist(state);
});

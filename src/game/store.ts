import { create } from "zustand";

import { BUSINESS_BY_ID, BUSINESS_DEFS } from "./economy";
import type { BusinessDef, BusinessId } from "./economy";
import {
  BUILDING_BY_ID,
  BUILDING_DEFS,
  createPlots,
  getBuildingProfitMult,
  getBuildingTimeMult,
  getHqConfig,
  getPlotCountForHqLevel,
  getQueueSlotsForHq,
  getUnlockedBuildingIdsForHq,
  getUnlockedBuyModesForHq,
} from "./base";
import type { BuildingInstance, BuildingTypeId, Plot } from "./base";
import {
  getAvailableUpgradesForCounts,
  getUpgradeCost,
  isUpgradeUnlockedForCounts,
  UPGRADE_DEFS,
  UPGRADE_BY_ID,
} from "./upgrades";
import type { BusinessCounts, UpgradeDef } from "./upgrades";
import {
  getAvailableProjects,
  getProjectAutoRunAll,
  getProjectCost,
  getProjectGlobalProfitMult,
  getProjectGlobalTimeMult,
  getProjectOfflineCapBonusSeconds,
  getProjectSlots,
  isProjectUnlocked,
  PROJECT_BY_ID,
} from "./projects";
import type { ProjectRun } from "./projects";
import { buildGoalPool, getGoalProgress, pickRandomGoals } from "./goals";
import type { GoalContext, GoalState } from "./goals";
import {
  clampNumber,
  createSeed,
  getLeagueConfig,
  getLeagueForTrophies,
  randomFloat,
  sigmoid,
  WAR_TARGET_NAMES,
  WAR_TARGET_REFRESH_MS,
} from "./war";
import type {
  BattleReport,
  IncomingRaid,
  RaidEvent,
  RaidReport,
  WarState,
  WarTarget,
} from "./war";
import { getWarUpgradeCost, WAR_UPGRADE_BY_ID } from "./upgrades_war";
import {
  defaultCooldowns,
  generateTargets,
  resolveRaid,
  type PlayerWarState,
  type WarTargetCard,
} from "./warEngine";

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

type BuildQueueItem = {
  buildingId: string;
  finishAt: number;
};

type BuildQueueState = {
  active: BuildQueueItem[];
};

type WorldState = {
  plots: Plot[];
  selectedPlotId: string | null;
};

export type TempBuff = {
  id: string;
  kind: "business-profit" | "project-time";
  businessId?: BusinessId;
  mult: number;
  expiresAt: number;
};

export type UiEventKind = "cash" | "buy" | "upgrade" | "raid" | "defense" | "manager" | "build";

export type UiEvent = {
  id: string;
  kind: UiEventKind;
  title: string;
  detail?: string;
  amount?: number;
  at: number;
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
  bulkBuys: number;
  buyMode: BuyMode;
  businesses: Record<BusinessId, BusinessCoreState>;
  world: WorldState;
  buildings: Record<string, BuildingInstance>;
  buildQueue: BuildQueueState;
  war: WarState;
  purchasedUpgrades: string[];
  upgradeOffers: string[];
  lastOfferRefreshAt: number;
  lastTheftCheckAt: number;
  lastTheftLoss: number;
  activeGoals: GoalState[];
  activeBuffs: TempBuff[];
  uiEvents: UiEvent[];
  lastUiEventAt: number;
  projectsStarted: number;
  completedProjects: string[];
  runningProjects: ProjectRun[];
  lastSeenAt: number;
};

type GameActions = {
  tapWork: () => void;
  setBuyMode: (mode: BuyMode) => void;
  selectPlot: (id: string | null) => void;
  placeBuilding: (plotId: string, typeId: BuildingTypeId) => void;
  startBuildingUpgrade: (buildingId: string) => void;
  buyBusiness: (id: BusinessId) => void;
  runBusiness: (id: BusinessId) => void;
  runAllBusinesses: () => void;
  hireManager: (id: BusinessId) => void;
  depositSafe: (amount: number) => void;
  withdrawSafe: (amount: number) => void;
  buyUpgrade: (id: string) => void;
  startProject: (id: string) => void;
  buyWarUpgrade: (id: string) => void;
  refreshWarTargets: (force?: boolean) => void;
  attackWarTarget: (id: string) => void;
  processBusinessCycles: (now: number) => void;
  processBuildQueue: (now: number) => void;
  processProjectCompletions: (now: number) => void;
  processUpgradeOffers: (now: number) => void;
  processRiskEvents: (now: number) => void;
  processGoals: (now: number) => void;
  processWarTick: (now: number) => void;
  syncOfflineProgress: (now: number) => void;
  markSeen: (now: number) => void;
  dismissUiEvent: (id: string) => void;
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
  getWorld: () => WorldState;
  getBuildingById: (id: string) => BuildingInstance | null;
  getBuildingForPlot: (plotId: string) => BuildingInstance | null;
  getHqLevel: () => number;
  getAvailableBuildingDefs: () => typeof BUILDING_DEFS;
  getBuildingUpgradeCost: (id: string) => number;
  getBuildingUpgradeTimeSec: (id: string) => number;
  getBuildQueueSlots: () => number;
  getUnlockedBuyModes: () => BuyMode[];
  getWarOffensePower: () => number;
  getWarDefensePower: () => number;
  getWarVaultProtectPct: () => number;
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
  | "bulkBuys"
  | "buyMode"
  | "businesses"
  | "world"
  | "buildings"
  | "buildQueue"
  | "war"
  | "purchasedUpgrades"
  | "projectsStarted"
  | "completedProjects"
  | "runningProjects"
  | "lastSeenAt"
>;

const STORAGE_KEY = "adcap-core-state-v5";

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
const WAR_ATTACK_COOLDOWN_MS = 2 * 60 * 1000;
const WAR_SHIELD_MS = 15 * 60 * 1000;
const WAR_RAID_TROPHY_THRESHOLD = 20;
const WAR_MAX_LOOT_MINUTES = 10;
const WAR_MAX_LOSS_MINUTES = 6;
const WAR_PWIN_SCALE = 20;
const UI_EVENT_MIN_GAP_MS = 800;

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

const createUiEvent = (
  kind: UiEventKind,
  title: string,
  detail: string | undefined,
  amount: number | undefined,
  now: number
): UiEvent => ({
  id: `${kind}-${now}-${Math.floor(Math.random() * 100000)}`,
  kind,
  title,
  detail,
  amount,
  at: now,
});

const appendUiEvent = (state: GameState, event: UiEvent) => ({
  uiEvents: [event, ...state.uiEvents].slice(0, 6),
  lastUiEventAt: event.at,
});

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

const createDefaultWorld = (): WorldState => {
  const plots = createPlots(getPlotCountForHqLevel(1));
  if (plots[0]) {
    plots[0].buildingId = "hq";
  }
  return {
    plots,
    selectedPlotId: null,
  };
};

const createDefaultBuildings = (): Record<string, BuildingInstance> => ({
  hq: {
    id: "hq",
    typeId: "hq",
    plotId: "plot-1",
    buildingLevel: 1,
    upgradingUntil: null,
  },
});

const createDefaultWarState = (now: number): WarState => {
  const seed = createSeed();
  const league = getLeagueForTrophies(0);
  const config = getLeagueConfig(league);
  const raidDelayMs =
    (config.raidMinMinutes +
      (config.raidMaxMinutes - config.raidMinMinutes) * 0.5) *
    60 *
    1000;
  return {
    trophies: 0,
    league,
    shieldUntil: null,
    attackCooldownUntil: null,
    heatUntil: null,
    targets: [],
    lastTargetsAt: 0,
    raidLog: [],
    rngSeed: seed,
    nextRaidAt: now + raidDelayMs,
    warUpgradeLevels: {},
    incomingRaid: null,
    raidReport: null,
    unreadRaidReport: false,
  };
};

const normalizeWorld = (value: unknown): WorldState => {
  if (!value || typeof value !== "object") {
    return createDefaultWorld();
  }
  const raw = value as Record<string, unknown>;
  const plots = Array.isArray(raw.plots)
    ? raw.plots
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const plot = entry as Record<string, unknown>;
          if (typeof plot.id !== "string") {
            return null;
          }
          const x = typeof plot.x === "number" && Number.isFinite(plot.x) ? plot.x : 0;
          const y = typeof plot.y === "number" && Number.isFinite(plot.y) ? plot.y : 0;
          const buildingId =
            typeof plot.buildingId === "string" ? plot.buildingId : undefined;
          return { id: plot.id, x, y, buildingId } as Plot;
        })
        .filter((plot): plot is Plot => Boolean(plot))
    : createDefaultWorld().plots;
  return {
    plots,
    selectedPlotId:
      typeof raw.selectedPlotId === "string" ? raw.selectedPlotId : null,
  };
};

const normalizeBuildings = (value: unknown): Record<string, BuildingInstance> => {
  if (!value || typeof value !== "object") {
    return createDefaultBuildings();
  }
  const result: Record<string, BuildingInstance> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const raw = entry as Record<string, unknown>;
    if (typeof raw.typeId !== "string" || !BUILDING_BY_ID[raw.typeId as BuildingTypeId]) {
      continue;
    }
    const plotId = typeof raw.plotId === "string" ? raw.plotId : "";
    const level =
      typeof raw.buildingLevel === "number" && Number.isFinite(raw.buildingLevel)
        ? Math.max(1, Math.floor(raw.buildingLevel))
        : 1;
    const upgradingUntil =
      typeof raw.upgradingUntil === "number" && Number.isFinite(raw.upgradingUntil)
        ? raw.upgradingUntil
        : null;
    result[key] = {
      id: key,
      typeId: raw.typeId as BuildingTypeId,
      plotId,
      buildingLevel: level,
      upgradingUntil,
    };
  }
  if (!result.hq) {
    result.hq = {
      id: "hq",
      typeId: "hq",
      plotId: "plot-1",
      buildingLevel: 1,
      upgradingUntil: null,
    };
  }
  return result;
};

const normalizeBuildQueue = (value: unknown): BuildQueueState => {
  if (!value || typeof value !== "object") {
    return { active: [] };
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.active)) {
    return { active: [] };
  }
  const active = raw.active
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.buildingId !== "string") {
        return null;
      }
      const finishAt =
        typeof item.finishAt === "number" && Number.isFinite(item.finishAt)
          ? item.finishAt
          : 0;
      return { buildingId: item.buildingId, finishAt } as BuildQueueItem;
    })
    .filter((entry): entry is BuildQueueItem => Boolean(entry));
  return { active };
};

const normalizeWarState = (value: unknown, now: number): WarState => {
  const fallback = createDefaultWarState(now);
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const raw = value as Record<string, unknown>;
  const trophies =
    typeof raw.trophies === "number" && Number.isFinite(raw.trophies)
      ? Math.max(0, Math.floor(raw.trophies))
      : 0;
  const league = getLeagueForTrophies(trophies);
  const shieldUntil =
    typeof raw.shieldUntil === "number" && Number.isFinite(raw.shieldUntil)
      ? raw.shieldUntil
      : null;
  const attackCooldownUntil =
    typeof raw.attackCooldownUntil === "number" && Number.isFinite(raw.attackCooldownUntil)
      ? raw.attackCooldownUntil
      : null;
  const heatUntil =
    typeof raw.heatUntil === "number" && Number.isFinite(raw.heatUntil)
      ? raw.heatUntil
      : null;
  const targets = Array.isArray(raw.targets)
    ? raw.targets
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const target = entry as Record<string, unknown>;
          if (typeof target.id !== "string" || typeof target.name !== "string") {
            return null;
          }
          const defense =
            typeof target.defense === "number" && Number.isFinite(target.defense)
              ? target.defense
              : 0;
          const lootCap =
            typeof target.lootCap === "number" && Number.isFinite(target.lootCap)
              ? target.lootCap
              : typeof target.loot === "number" && Number.isFinite(target.loot)
              ? target.loot
              : 0;
          const trophyWin =
            typeof target.trophyWin === "number" && Number.isFinite(target.trophyWin)
              ? target.trophyWin
              : 0;
          const trophyLoss =
            typeof target.trophyLoss === "number" && Number.isFinite(target.trophyLoss)
              ? target.trophyLoss
              : 0;
          const difficulty =
            target.difficulty === "easy" ||
            target.difficulty === "medium" ||
            target.difficulty === "hard"
              ? target.difficulty
              : "easy";
          const refreshAt =
            typeof target.refreshAt === "number" && Number.isFinite(target.refreshAt)
              ? target.refreshAt
              : now;
          return {
            id: target.id,
            name: target.name,
            defense,
            lootCap,
            trophyWin,
            trophyLoss,
            difficulty,
            refreshAt,
          } as WarTarget;
        })
        .filter((entry): entry is WarTarget => Boolean(entry))
    : [];
  const lastTargetsAt =
    typeof raw.lastTargetsAt === "number" && Number.isFinite(raw.lastTargetsAt)
      ? raw.lastTargetsAt
      : 0;
  const raidLog = Array.isArray(raw.raidLog)
    ? raw.raidLog
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const item = entry as Record<string, unknown>;
          if (
            typeof item.id !== "string" ||
            (item.kind !== "attack" && item.kind !== "defense") ||
            (item.result !== "win" && item.result !== "loss")
          ) {
            return null;
          }
          const loot =
            typeof item.loot === "number" && Number.isFinite(item.loot) ? item.loot : 0;
          const trophiesDelta =
            typeof item.trophiesDelta === "number" && Number.isFinite(item.trophiesDelta)
              ? item.trophiesDelta
              : 0;
          const at =
            typeof item.at === "number" && Number.isFinite(item.at) ? item.at : now;
          const targetName = typeof item.targetName === "string" ? item.targetName : undefined;
          const reportRaw =
            item.report && typeof item.report === "object"
              ? (item.report as Record<string, unknown>)
              : null;
          const report: BattleReport = {
            kind: item.kind,
            offense:
              reportRaw && typeof reportRaw.offense === "number" && Number.isFinite(reportRaw.offense)
                ? reportRaw.offense
                : 0,
            defense:
              reportRaw && typeof reportRaw.defense === "number" && Number.isFinite(reportRaw.defense)
                ? reportRaw.defense
                : 0,
            pWin:
              reportRaw && typeof reportRaw.pWin === "number" && Number.isFinite(reportRaw.pWin)
                ? reportRaw.pWin
                : 0.5,
            roll:
              reportRaw && typeof reportRaw.roll === "number" && Number.isFinite(reportRaw.roll)
                ? reportRaw.roll
                : 0.5,
            incomePerSec:
              reportRaw &&
              typeof reportRaw.incomePerSec === "number" &&
              Number.isFinite(reportRaw.incomePerSec)
                ? reportRaw.incomePerSec
                : 0,
            loot:
              reportRaw && typeof reportRaw.loot === "number" && Number.isFinite(reportRaw.loot)
                ? reportRaw.loot
                : loot,
            lootCap:
              reportRaw && typeof reportRaw.lootCap === "number" && Number.isFinite(reportRaw.lootCap)
                ? reportRaw.lootCap
                : 0,
            targetLoot:
              reportRaw &&
              typeof reportRaw.targetLoot === "number" &&
              Number.isFinite(reportRaw.targetLoot)
                ? reportRaw.targetLoot
                : undefined,
            lootMult:
              reportRaw &&
              typeof reportRaw.lootMult === "number" &&
              Number.isFinite(reportRaw.lootMult)
                ? reportRaw.lootMult
                : undefined,
            vaultProtectPct:
              reportRaw &&
              typeof reportRaw.vaultProtectPct === "number" &&
              Number.isFinite(reportRaw.vaultProtectPct)
                ? reportRaw.vaultProtectPct
                : undefined,
            lootableCash:
              reportRaw &&
              typeof reportRaw.lootableCash === "number" &&
              Number.isFinite(reportRaw.lootableCash)
                ? reportRaw.lootableCash
                : undefined,
            stealPct:
              reportRaw && typeof reportRaw.stealPct === "number" && Number.isFinite(reportRaw.stealPct)
                ? reportRaw.stealPct
                : undefined,
            lossMult:
              reportRaw && typeof reportRaw.lossMult === "number" && Number.isFinite(reportRaw.lossMult)
                ? reportRaw.lossMult
                : undefined,
          };
          return {
            id: item.id,
            kind: item.kind,
            result: item.result,
            loot,
            trophiesDelta,
            at,
            targetName,
            report,
          } as RaidEvent;
        })
        .filter((entry): entry is RaidEvent => Boolean(entry))
    : [];
  const rngSeed =
    typeof raw.rngSeed === "number" && Number.isFinite(raw.rngSeed)
      ? Math.floor(raw.rngSeed)
      : createSeed();
  const nextRaidAt =
    typeof raw.nextRaidAt === "number" && Number.isFinite(raw.nextRaidAt)
      ? raw.nextRaidAt
      : now + getLeagueConfig(league).raidMinMinutes * 60 * 1000;
  const warUpgradeLevels: Record<string, number> = {};
  if (raw.warUpgradeLevels && typeof raw.warUpgradeLevels === "object") {
    for (const [id, value] of Object.entries(raw.warUpgradeLevels)) {
      if (!WAR_UPGRADE_BY_ID[id]) {
        continue;
      }
      const level =
        typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      if (level > 0) {
        warUpgradeLevels[id] = level;
      }
    }
  } else if (Array.isArray(raw.warUpgrades)) {
    for (const id of raw.warUpgrades) {
      if (typeof id === "string" && WAR_UPGRADE_BY_ID[id]) {
        warUpgradeLevels[id] = (warUpgradeLevels[id] ?? 0) + 1;
      }
    }
  }

  const incomingRaid =
    raw.incomingRaid && typeof raw.incomingRaid === "object"
      ? ({
          endsAt:
            typeof (raw.incomingRaid as IncomingRaid).endsAt === "number"
              ? (raw.incomingRaid as IncomingRaid).endsAt
              : now,
          attackerOffense:
            typeof (raw.incomingRaid as IncomingRaid).attackerOffense === "number"
              ? (raw.incomingRaid as IncomingRaid).attackerOffense
              : 0,
          chance:
            typeof (raw.incomingRaid as IncomingRaid).chance === "number"
              ? (raw.incomingRaid as IncomingRaid).chance
              : 0,
          roll:
            typeof (raw.incomingRaid as IncomingRaid).roll === "number"
              ? (raw.incomingRaid as IncomingRaid).roll
              : 0,
          vaultProtectPct:
            typeof (raw.incomingRaid as IncomingRaid).vaultProtectPct === "number"
              ? (raw.incomingRaid as IncomingRaid).vaultProtectPct
              : 0,
          lootCap:
            typeof (raw.incomingRaid as IncomingRaid).lootCap === "number"
              ? (raw.incomingRaid as IncomingRaid).lootCap
              : 0,
          stealPct:
            typeof (raw.incomingRaid as IncomingRaid).stealPct === "number"
              ? (raw.incomingRaid as IncomingRaid).stealPct
              : 0,
        } as IncomingRaid)
      : null;

  const raidReport =
    raw.raidReport && typeof raw.raidReport === "object"
      ? ({
          result: (raw.raidReport as RaidReport).result === "win" ? "win" : "loss",
          lootLost:
            typeof (raw.raidReport as RaidReport).lootLost === "number"
              ? (raw.raidReport as RaidReport).lootLost
              : 0,
          protectedAmount:
            typeof (raw.raidReport as RaidReport).protectedAmount === "number"
              ? (raw.raidReport as RaidReport).protectedAmount
              : 0,
          trophiesDelta:
            typeof (raw.raidReport as RaidReport).trophiesDelta === "number"
              ? (raw.raidReport as RaidReport).trophiesDelta
              : 0,
          at:
            typeof (raw.raidReport as RaidReport).at === "number"
              ? (raw.raidReport as RaidReport).at
              : now,
        } as RaidReport)
      : null;
  const unreadRaidReport =
    typeof raw.unreadRaidReport === "boolean" ? raw.unreadRaidReport : Boolean(raidReport);

  return {
    trophies,
    league,
    shieldUntil,
    attackCooldownUntil,
    heatUntil,
    targets,
    lastTargetsAt,
    raidLog,
    rngSeed,
    nextRaidAt,
    warUpgradeLevels,
    incomingRaid,
    raidReport,
    unreadRaidReport,
  };
};

const ensurePlotsForHqLevel = (world: WorldState, hqLevel: number): WorldState => {
  const required = getPlotCountForHqLevel(hqLevel);
  if (world.plots.length >= required) {
    return world;
  }
  const nextPlots = createPlots(required);
  const existingById = new Map(world.plots.map((plot) => [plot.id, plot]));
  for (const plot of nextPlots) {
    const existing = existingById.get(plot.id);
    if (existing) {
      plot.buildingId = existing.buildingId;
    }
  }
  return {
    ...world,
    plots: nextPlots,
  };
};

const syncWorldBuildings = (
  world: WorldState,
  buildings: Record<string, BuildingInstance>
) => {
  const plots: Plot[] = world.plots.map((plot) => ({ ...plot, buildingId: undefined }));
  const plotMap = new Map(plots.map((plot) => [plot.id, plot]));

  for (const building of Object.values(buildings)) {
    const plot = plotMap.get(building.plotId);
    if (plot) {
      plot.buildingId = building.id;
    }
  }

  if (plots[0] && !plots[0].buildingId) {
    plots[0].buildingId = "hq";
  }

  return {
    ...world,
    plots,
  };
};
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

const normalizeBulkBuys = (value: unknown) => clampToInt(value, 0);

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

const getHqLevelForState = (state: GameState) =>
  state.buildings.hq?.buildingLevel && Number.isFinite(state.buildings.hq.buildingLevel)
    ? state.buildings.hq.buildingLevel
    : 1;

const getUnlockedBuyModesForState = (state: GameState) =>
  getUnlockedBuyModesForHq(getHqLevelForState(state));

const getBuildingForBusiness = (state: GameState, businessId: BusinessId) => {
  const buildingDef = BUILDING_DEFS.find((def) => def.businessId === businessId);
  if (!buildingDef) {
    return null;
  }
  return (
    Object.values(state.buildings).find((building) => building.typeId === buildingDef.id) ?? null
  );
};

const getBuildingLevelMults = (state: GameState, businessId: BusinessId) => {
  const building = getBuildingForBusiness(state, businessId);
  const level = building ? building.buildingLevel : 1;
  return {
    profitMult: getBuildingProfitMult(level),
    timeMult: getBuildingTimeMult(level),
  };
};

const isBusinessUnlocked = (state: GameState, id: BusinessId) => {
  if (getBuildingForBusiness(state, id)) {
    return true;
  }
  const business = state.businesses[id];
  return Boolean(business && business.count > 0);
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

const getBuildingUpgradeCostForLevel = (def: (typeof BUILDING_DEFS)[number], level: number) => {
  const base = def.upgradeBaseCost ?? def.buildCost;
  return base * Math.pow(1.8, Math.max(0, level - 1));
};

const getBuildingUpgradeTimeSecForLevel = (level: number) =>
  10 * Math.pow(1.6, Math.max(0, level - 1));

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

const getGoalContextForState = (state: GameState): GoalContext => {
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

const getWarUpgradeBonuses = (state: GameState) => {
  let offenseBonus = 0;
  let defenseBonus = 0;
  let vaultProtectPct = 0;
  let lossMult = 1;
  let lootMult = 1;
  let attackCooldownMult = 1;
  let shieldDurationBonusSec = 0;

  for (const [id, level] of Object.entries(state.war.warUpgradeLevels)) {
    const upgrade = WAR_UPGRADE_BY_ID[id];
    if (!upgrade || level <= 0) {
      continue;
    }
    const effect = upgrade.effectPerLevel;
    if (effect.offenseBonus) {
      offenseBonus += effect.offenseBonus * level;
    }
    if (effect.defenseBonus) {
      defenseBonus += effect.defenseBonus * level;
    }
    if (effect.vaultProtectPct) {
      vaultProtectPct += effect.vaultProtectPct * level;
    }
    if (effect.lossMult) {
      lossMult *= Math.pow(effect.lossMult, level);
    }
    if (effect.lootMult) {
      lootMult *= Math.pow(effect.lootMult, level);
    }
    if (effect.attackCooldownMult) {
      attackCooldownMult *= Math.pow(effect.attackCooldownMult, level);
    }
    if (effect.shieldDurationBonusSec) {
      shieldDurationBonusSec += effect.shieldDurationBonusSec * level;
    }
  }

  return {
    offenseBonus,
    defenseBonus,
    vaultProtectPct: clampNumber(vaultProtectPct, 0, 0.9),
    lossMult,
    lootMult,
    attackCooldownMult,
    shieldDurationBonusSec,
  };
};

const getWarOffensePowerForState = (state: GameState) => {
  const hqLevel = getHqLevelForState(state);
  const sumBuildingLevels = Object.values(state.buildings).reduce(
    (sum, building) => sum + building.buildingLevel,
    0
  );
  const managersOwned = BUSINESS_DEFS.reduce(
    (sum, def) => sum + (state.businesses[def.id]?.managerOwned ? 1 : 0),
    0
  );
  const bonuses = getWarUpgradeBonuses(state);
  return hqLevel * 10 + sumBuildingLevels * 2 + managersOwned * 5 + bonuses.offenseBonus;
};

const getWarDefensePowerForState = (state: GameState) => {
  const hqLevel = getHqLevelForState(state);
  const projectsCompleted = state.completedProjects.length;
  const safeBonus = state.safeCash > 0 ? 20 : 0;
  const bonuses = getWarUpgradeBonuses(state);
  return hqLevel * 12 + safeBonus + projectsCompleted * 8 + bonuses.defenseBonus;
};

const getWarVaultProtectPctForState = (state: GameState) =>
  getWarUpgradeBonuses(state).vaultProtectPct;

const getWarAttackCooldownMsForState = (state: GameState) => {
  const bonuses = getWarUpgradeBonuses(state);
  return Math.max(30_000, WAR_ATTACK_COOLDOWN_MS * bonuses.attackCooldownMult);
};

const getWarLootMultForState = (state: GameState) => getWarUpgradeBonuses(state).lootMult;

const getWarLossMultForState = (state: GameState) => getWarUpgradeBonuses(state).lossMult;

const getWarShieldDurationMsForState = (state: GameState) => {
  const bonuses = getWarUpgradeBonuses(state);
  return WAR_SHIELD_MS + bonuses.shieldDurationBonusSec * 1000;
};

const getPlayerWarStateForEngine = (state: GameState): PlayerWarState => ({
  trophies: state.war.trophies,
  league: state.war.league,
  offense: getWarOffensePowerForState(state),
  defense: getWarDefensePowerForState(state),
  vaultProtectionPct: getWarVaultProtectPctForState(state),
  shieldUntil: state.war.shieldUntil,
  lastTargetRefreshAt: state.war.lastTargetsAt,
  lastRaidAt: state.war.attackCooldownUntil ?? 0,
  incomePerSec: getIncomePerSecTotalForState(state),
  heatUntil: state.war.heatUntil ?? undefined,
});

const scheduleNextRaidAt = (seed: number, leagueConfig: ReturnType<typeof getLeagueConfig>) => {
  const { value, next } = randomFloat(seed);
  const minutes =
    leagueConfig.raidMinMinutes +
    (leagueConfig.raidMaxMinutes - leagueConfig.raidMinMinutes) * value;
  return { nextAtMs: minutes * 60 * 1000, seed: next };
};

const generateWarTargets = (state: GameState, seed: number, now: number) => {
  const player = getPlayerWarStateForEngine(state);
  const generated = generateTargets(player, seed, now, defaultCooldowns, WAR_TARGET_NAMES);
  const targets: WarTarget[] = generated.value.map((target, index) => ({
    id: target.id,
    name: target.name,
    defense: target.defense,
    lootCap: target.lootCap,
    trophyWin: target.trophyDeltaWin,
    trophyLoss: Math.abs(target.trophyDeltaLose),
    difficulty: index === 0 ? "easy" : index === 1 ? "medium" : "hard",
    refreshAt: target.refreshAt,
  }));
  return { targets, seed: generated.seed };
};

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
  const context = getGoalContextForState(state);
  const pool = buildGoalPool(context, getUnlockedBusinessIds(state));
  const kept = state.activeGoals.filter(
    (goal) =>
      !getGoalProgress(goal, context).complete
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

const loadPersistedState = (): PersistedState => {
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

const createInitialState = () => {
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
    const filtered = baseState.buildQueue.active.filter(
      (item) => Boolean(baseState.buildings[item.buildingId])
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
  setBuyMode: (mode) =>
    set((state) => {
      const allowed = getUnlockedBuyModesForState(state);
      if (!allowed.includes(mode)) {
        return state;
      }
      return { buyMode: mode };
    }),
  selectPlot: (id) =>
    set((state) => ({
      world: {
        ...state.world,
        selectedPlotId: id,
      },
    })),
  placeBuilding: (plotId, typeId) => {
    const state = get();
    const plot = state.world.plots.find((entry) => entry.id === plotId);
    if (!plot || plot.buildingId) {
      return;
    }
    const def = BUILDING_BY_ID[typeId];
    if (!def || typeId === "hq") {
      return;
    }
    const hqLevel = getHqLevelForState(state);
    if (def.hqLevelRequired > hqLevel) {
      return;
    }
    if (Object.values(state.buildings).some((building) => building.typeId === typeId)) {
      return;
    }
    if (state.cash < def.buildCost) {
      return;
    }
    const buildingId = `${typeId}-${plotId}`;
    const now = Date.now();
    const event = createUiEvent(
      "build",
      "Asset placed",
      def.name,
      undefined,
      now
    );
    const nextBuildings = {
      ...state.buildings,
      [buildingId]: {
        id: buildingId,
        typeId,
        plotId,
        buildingLevel: 1,
        upgradingUntil: null,
      },
    };
    const nextPlots = state.world.plots.map((entry) =>
      entry.id === plotId ? { ...entry, buildingId } : entry
    );
    set({
      cash: state.cash - def.buildCost,
      buildings: nextBuildings,
      world: {
        ...state.world,
        plots: nextPlots,
        selectedPlotId: plotId,
      },
      ...appendUiEvent(state, event),
    });
  },
  startBuildingUpgrade: (buildingId) => {
    const state = get();
    const building = state.buildings[buildingId];
    if (!building) {
      return;
    }
    if (building.upgradingUntil) {
      return;
    }
    const hqLevel = getHqLevelForState(state);
    const queueSlots = getQueueSlotsForHq(hqLevel);
    if (state.buildQueue.active.length >= queueSlots) {
      return;
    }
    const def = BUILDING_BY_ID[building.typeId];
    const cost = getBuildingUpgradeCostForLevel(def, building.buildingLevel);
    if (state.cash < cost) {
      return;
    }
    const durationSec = getBuildingUpgradeTimeSecForLevel(building.buildingLevel);
    const finishAt = Date.now() + durationSec * 1000;
    const nextBuildings = {
      ...state.buildings,
      [buildingId]: {
        ...building,
        upgradingUntil: finishAt,
      },
    };
    const event = createUiEvent(
      "upgrade",
      "Upgrade started",
      BUILDING_BY_ID[building.typeId]?.name ?? "Building",
      undefined,
      Date.now()
    );
    set({
      cash: state.cash - cost,
      buildings: nextBuildings,
      buildQueue: {
        active: [...state.buildQueue.active, { buildingId, finishAt }],
      },
      ...appendUiEvent(state, event),
    });
  },
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

    const event = createUiEvent(
      "buy",
      "Units acquired",
      `${buyInfo.quantity} x ${def.name}`,
      undefined,
      Date.now()
    );

    set({
      cash: state.cash - buyInfo.cost,
      businesses: nextBusinesses,
      bulkBuys: state.bulkBuys + (buyInfo.quantity >= 10 ? 1 : 0),
      ...appendUiEvent(state, event),
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
    const event = createUiEvent(
      "manager",
      "Handler assigned",
      def.name,
      undefined,
      now
    );

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
      ...appendUiEvent(state, event),
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
    if (!isProjectUnlocked(project, state.totalEarned, getHqLevelForState(state))) {
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
  buyWarUpgrade: (id) => {
    const state = get();
    const upgrade = WAR_UPGRADE_BY_ID[id];
    if (!upgrade) {
      return;
    }
    const incomePerSec = getIncomePerSecTotalForState(state);
    const currentLevel = state.war.warUpgradeLevels[id] ?? 0;
    const cost = getWarUpgradeCost(incomePerSec, upgrade, currentLevel);
    if (cost <= 0 || state.cash < cost) {
      return;
    }
    set({
      cash: state.cash - cost,
      war: {
        ...state.war,
        warUpgradeLevels: {
          ...state.war.warUpgradeLevels,
          [id]: currentLevel + 1,
        },
      },
    });
  },
  refreshWarTargets: (force = false) => {
    const state = get();
    const now = Date.now();
    if (
      !force &&
      state.war.targets.length > 0 &&
      now - state.war.lastTargetsAt < WAR_TARGET_REFRESH_MS
    ) {
      return;
    }
    const generated = generateWarTargets(state, state.war.rngSeed, now);
    set({
      war: {
        ...state.war,
        targets: generated.targets,
        lastTargetsAt: now,
        rngSeed: generated.seed,
      },
    });
  },
  attackWarTarget: (id) => {
    const state = get();
    const now = Date.now();
    if (state.war.attackCooldownUntil && now < state.war.attackCooldownUntil) {
      return;
    }
    const target = state.war.targets.find((entry) => entry.id === id);
    if (!target) {
      return;
    }
    const leagueConfig = getLeagueConfig(state.war.league);
    const incomePerSec = getIncomePerSecTotalForState(state);
    let seed = state.war.rngSeed;
    const player = getPlayerWarStateForEngine(state);
    const targetCard: WarTargetCard = {
      id: target.id,
      name: target.name,
      defense: target.defense,
      lootCap: target.lootCap,
      trophyDeltaWin: target.trophyWin,
      trophyDeltaLose: -target.trophyLoss,
      refreshAt: target.refreshAt,
    };
    const resolved = resolveRaid(player, targetCard, seed, now, WAR_PWIN_SCALE);
    seed = resolved.seed;
    const win = resolved.value.log.result === "win";
    let cash = state.cash;
    let totalEarned = state.totalEarned;
    const lootMult = getWarLootMultForState(state);
    const lootCap =
      incomePerSec *
      Math.min(WAR_MAX_LOOT_MINUTES, leagueConfig.attackLootCapMinutes) *
      60;
    let loot = resolved.value.log.loot * lootMult;
    loot = Math.min(loot, lootCap);
    if (win) {
      cash += loot;
      totalEarned += loot;
    }
    const trophiesDelta = win ? target.trophyWin : -target.trophyLoss;

    const nextTrophies = Math.max(0, state.war.trophies + trophiesDelta);
    const nextLeague = getLeagueForTrophies(nextTrophies);
    const cooldownMs = getWarAttackCooldownMsForState(state);
    const report: BattleReport = {
      kind: "attack",
      offense: player.offense,
      defense: target.defense,
      pWin: resolved.value.log.chance,
      roll: resolved.value.log.roll,
      incomePerSec,
      loot,
      lootCap,
      targetLoot: target.lootCap,
      lootMult,
    };
    const raidLog: RaidEvent = {
      id: `attack-${now}-${target.id}`,
      kind: "attack",
      result: win ? "win" : "loss",
      loot,
      trophiesDelta,
      at: now,
      targetName: target.name,
      report,
    };
    const event = createUiEvent(
      "raid",
      win ? "Raid success" : "Raid failed",
      target.name,
      win ? loot : undefined,
      now
    );

    let heatUntil = state.war.heatUntil;
    let nextRaidAt = state.war.nextRaidAt;
    if (!win) {
      const heatRoll = randomFloat(seed);
      seed = heatRoll.next;
      heatUntil = now + (120_000 + heatRoll.value * 180_000);
      nextRaidAt = Math.min(nextRaidAt, now + 120_000);
    }

    const updatedTargets = state.war.targets.map((entry) =>
      entry.id === target.id
        ? {
            ...entry,
            lootCap: win
              ? Math.max(entry.lootCap - loot, entry.lootCap * 0.45)
              : entry.lootCap,
          }
        : entry
    );
    set({
      cash,
      totalEarned,
      war: {
        ...state.war,
        trophies: nextTrophies,
        league: nextLeague,
        attackCooldownUntil: now + cooldownMs,
        raidLog: [raidLog, ...state.war.raidLog].slice(0, 10),
        rngSeed: seed,
        targets: updatedTargets,
        heatUntil,
        nextRaidAt,
      },
      ...appendUiEvent(state, event),
    });
  },
  processWarTick: (now) => {
    const state = get();
    let war = state.war;
    let cash = state.cash;
    let changed = false;
    let seed = war.rngSeed;
    let pendingEvent: UiEvent | null = null;

    const shouldRefreshTargets =
      war.targets.length === 0 ||
      war.targets.some((target) => target.refreshAt <= now) ||
      now - war.lastTargetsAt >= WAR_TARGET_REFRESH_MS;
    if (shouldRefreshTargets) {
      const generated = generateWarTargets(state, seed, now);
      seed = generated.seed;
      war = {
        ...war,
        targets: generated.targets,
        lastTargetsAt: now,
      };
      changed = true;
    }

    if (war.shieldUntil && war.shieldUntil <= now) {
      war = { ...war, shieldUntil: null };
      changed = true;
    }

    const leagueConfig = getLeagueConfig(war.league);
    const defensePower = getWarDefensePowerForState(state);
    const incomePerSec = getIncomePerSecTotalForState(state);
    const vaultProtectPct = getWarVaultProtectPctForState(state);
    const lossMult = getWarLossMultForState(state);
    const raidEligible = war.trophies >= WAR_RAID_TROPHY_THRESHOLD;

    if (war.incomingRaid) {
      if (now >= war.incomingRaid.endsAt) {
        const attackerWins = war.incomingRaid.roll < war.incomingRaid.chance;
        let loss = 0;
        let protectedAmount = 0;
        if (attackerWins) {
          const stealBase = cash * war.incomingRaid.stealPct;
          protectedAmount = stealBase * war.incomingRaid.vaultProtectPct;
          loss = Math.min(
            Math.max(0, stealBase - protectedAmount),
            war.incomingRaid.lootCap * lossMult
          );
          cash = Math.max(0, cash - loss);
        }

        const trophiesDelta = attackerWins ? -4 : 1;
        const nextTrophies = Math.max(0, war.trophies + trophiesDelta);
        const nextLeague = getLeagueForTrophies(nextTrophies);
        const shieldDuration = getWarShieldDurationMsForState(state);
        const schedule = scheduleNextRaidAt(seed, leagueConfig);
        seed = schedule.seed;

        const report: RaidReport = {
          result: attackerWins ? "loss" : "win",
          lootLost: loss,
          protectedAmount,
          trophiesDelta,
          at: now,
        };

        const reportDetail: BattleReport = {
          kind: "defense",
          offense: war.incomingRaid.attackerOffense,
          defense: defensePower,
          pWin: 1 - war.incomingRaid.chance,
          roll: war.incomingRaid.roll,
          incomePerSec,
          loot: loss,
          lootCap: war.incomingRaid.lootCap,
          vaultProtectPct,
          lootableCash: cash,
          stealPct: war.incomingRaid.stealPct,
          lossMult,
        };

        const raidLog: RaidEvent = {
          id: `defense-${now}`,
          kind: "defense",
          result: attackerWins ? "loss" : "win",
          loot: loss,
          trophiesDelta,
          at: now,
          report: reportDetail,
        };

        const event = createUiEvent(
          "defense",
          attackerWins ? "Hostile action succeeded" : "Countermeasures triggered",
          attackerWins ? "Asset extraction complete" : "No losses recorded",
          attackerWins ? -loss : undefined,
          now
        );

        war = {
          ...war,
          trophies: nextTrophies,
          league: nextLeague,
          incomingRaid: null,
          raidReport: report,
          unreadRaidReport: true,
          shieldUntil: now + shieldDuration,
          nextRaidAt: now + shieldDuration + schedule.nextAtMs,
          raidLog: [raidLog, ...war.raidLog].slice(0, 10),
        };
        changed = true;

        if (now - state.lastUiEventAt > UI_EVENT_MIN_GAP_MS) {
          pendingEvent = event;
        }
      }
    } else {
      const cashThreshold = 50;
      const heatActive = war.heatUntil && war.heatUntil > now;
      const triggerAt = heatActive ? war.nextRaidAt - 120_000 : war.nextRaidAt;
      if (raidEligible && now >= triggerAt && !war.shieldUntil && cash > cashThreshold) {
        const rollWindow = randomFloat(seed);
        seed = rollWindow.next;
        const durationMs = (60 + rollWindow.value * 60) * 1000;

        const rollOffense = randomFloat(seed);
        seed = rollOffense.next;
        const leagueBonus = war.league === "silver" ? 5 : war.league === "gold" ? 10 : war.league === "diamond" ? 15 : 0;
        const attackerOffense = defensePower + (-15 + rollOffense.value * 50) + leagueBonus;
        const chance = clampNumber(sigmoid((attackerOffense - defensePower) / WAR_PWIN_SCALE), 0.05, 0.95);

        const rollOutcome = randomFloat(seed);
        seed = rollOutcome.next;

        const rollSteal = randomFloat(seed);
        seed = rollSteal.next;
        const stealPct = 0.06 + rollSteal.value * 0.12;

        const capMinutes = Math.min(
          WAR_MAX_LOSS_MINUTES,
          leagueConfig.defenseLossCapMinutes
        );
        const lootCap = incomePerSec * capMinutes * 60;

        const schedule = scheduleNextRaidAt(seed, leagueConfig);
        seed = schedule.seed;

        war = {
          ...war,
          incomingRaid: {
            endsAt: now + durationMs,
            attackerOffense,
            chance,
            roll: rollOutcome.value,
            vaultProtectPct,
            lootCap,
            stealPct,
          },
          nextRaidAt: now + schedule.nextAtMs,
        };
        changed = true;
      } else if (
        now >= war.nextRaidAt &&
        (!raidEligible || cash <= cashThreshold)
      ) {
        const schedule = scheduleNextRaidAt(seed, leagueConfig);
        seed = schedule.seed;
        war = {
          ...war,
          nextRaidAt: now + schedule.nextAtMs,
        };
        changed = true;
      }
    }

    if (seed !== war.rngSeed) {
      war = { ...war, rngSeed: seed };
      changed = true;
    }

    if (changed || cash !== state.cash || pendingEvent) {
      set({
        cash,
        war,
        ...(pendingEvent ? appendUiEvent(state, pendingEvent) : {}),
      });
    }
  },
  processBusinessCycles: (now) => {
    const state = get();
    const activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    const buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    const stateForCalc = buffsChanged ? { ...state, activeBuffs } : state;
    const autoRunAll = hasAutoRunAll(stateForCalc);
    let cash = Number.isFinite(state.cash) ? state.cash : 0;
    let totalEarned = Number.isFinite(state.totalEarned) ? state.totalEarned : cash;
    let earnedThisTick = 0;
    let changed = buffsChanged;
    const nextBusinesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

    for (const def of BUSINESS_DEFS) {
      const rawBusiness = state.businesses[def.id];
      const business = rawBusiness ?? createDefaultBusinessState();
      const count =
        typeof business.count === "number" && Number.isFinite(business.count)
          ? Math.max(0, Math.floor(business.count))
          : 0;
      let running = Boolean(business.running);
      let endsAt = business.endsAt;

      if (count <= 0) {
        if (business.running || business.endsAt !== null || !rawBusiness) {
          nextBusinesses[def.id] = {
            ...business,
            count,
            running: false,
            endsAt: null,
          };
          changed = true;
        }
        continue;
      }

      const derived = getBusinessDerived(stateForCalc, def);
      const cycleTimeMs = Number.isFinite(derived.cycleTimeMs) ? derived.cycleTimeMs : MIN_CYCLE_MS;
      const profitPerCycle = Number.isFinite(derived.profitPerCycle) ? derived.profitPerCycle : 0;
      const shouldAutoRun = business.managerOwned || autoRunAll;

      if (!Number.isFinite(endsAt ?? NaN)) {
        endsAt = null;
      }

      if (shouldAutoRun && (!running || endsAt === null)) {
        running = true;
        endsAt = now + cycleTimeMs;
      } else if (!shouldAutoRun && !running) {
        endsAt = null;
      }

      if (running && endsAt !== null && endsAt <= now) {
        if (shouldAutoRun) {
          let loops = 0;
          while (endsAt !== null && endsAt <= now && loops < MAX_CYCLE_CATCHUP) {
            cash += profitPerCycle;
            totalEarned += profitPerCycle;
            earnedThisTick += profitPerCycle;
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
          earnedThisTick += profitPerCycle;
          running = false;
          endsAt = null;
        }
      }

      if (
        running !== business.running ||
        endsAt !== business.endsAt ||
        count !== business.count ||
        !rawBusiness
      ) {
        nextBusinesses[def.id] = {
          ...business,
          count,
          running,
          endsAt,
        };
        changed = true;
      }
    }

    const shouldToast =
      earnedThisTick > 0 && now - state.lastUiEventAt > UI_EVENT_MIN_GAP_MS;
    const event = shouldToast
      ? createUiEvent("cash", "Cycle payout", "Liquidity captured", earnedThisTick, now)
      : null;

    if (changed || cash !== state.cash || totalEarned !== state.totalEarned || event) {
      set({
        cash,
        totalEarned,
        businesses: nextBusinesses,
        activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
        ...(event ? appendUiEvent(state, event) : {}),
      });
    }
  },
  processBuildQueue: (now) => {
    const state = get();
    if (state.buildQueue.active.length === 0) {
      return;
    }
    const sorted = [...state.buildQueue.active].sort((a, b) => a.finishAt - b.finishAt);
    const completed: BuildQueueItem[] = [];
    const remaining: BuildQueueItem[] = [];

    for (const item of sorted) {
      if (item.finishAt <= now) {
        completed.push(item);
      } else {
        remaining.push(item);
      }
    }

    if (completed.length === 0) {
      return;
    }

    let buildings = { ...state.buildings };
    let world = state.world;
    let buyMode = state.buyMode;

    for (const item of completed) {
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
    }

    set({
      buildings,
      world,
      buyMode,
      buildQueue: {
        active: remaining,
      },
    });
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
    const context = getGoalContextForState(state);
    let activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    let buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    let runningProjects = state.runningProjects;
    let activeGoals: GoalState[] = [];
    let goalsChanged = false;

    for (const goal of state.activeGoals) {
      const progress = getGoalProgress(goal, context);
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
      const pool = buildGoalPool(context, getUnlockedBusinessIds(state));
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
  dismissUiEvent: (id) =>
    set((state) => ({
      uiEvents: state.uiEvents.filter((event) => event.id !== id),
    })),
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
  getWorld: () => get().world,
  getBuildingById: (id) => get().buildings[id] ?? null,
  getBuildingForPlot: (plotId) => {
    const plot = get().world.plots.find((entry) => entry.id === plotId);
    if (!plot || !plot.buildingId) {
      return null;
    }
    return get().buildings[plot.buildingId] ?? null;
  },
  getHqLevel: () => getHqLevelForState(get()),
  getAvailableBuildingDefs: () => BUILDING_DEFS,
  getBuildingUpgradeCost: (id) => {
    const state = get();
    const building = state.buildings[id];
    if (!building) {
      return 0;
    }
    const def = BUILDING_BY_ID[building.typeId];
    return getBuildingUpgradeCostForLevel(def, building.buildingLevel);
  },
  getBuildingUpgradeTimeSec: (id) => {
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
  isUpgradePurchased: (id) => get().purchasedUpgrades.includes(id),
}));

const selectPersistedState = (state: GameState): PersistedState => ({
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

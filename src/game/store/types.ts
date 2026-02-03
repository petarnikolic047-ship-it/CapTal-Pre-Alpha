import type { BusinessId } from "../economy";
import type { BuildingInstance, BuildingTypeId, Plot } from "../base";
import type { UpgradeDef } from "../upgrades";
import type { ProjectRun } from "../projects";
import type { GoalState } from "../goals";
import type { WarState } from "../war";

export type BuyMode = "x1" | "x10" | "x100" | "max";

export type BusinessCoreState = {
  count: number;
  managerOwned: boolean;
  running: boolean;
  endsAt: number | null;
};

export type BusinessState = BusinessCoreState & {
  totalProfitMult: number;
  totalTimeMult: number;
};

export type BuildQueueItem = {
  buildingId: string;
  finishAt: number;
};

export type BuildQueueState = {
  active: BuildQueueItem[];
};

export type WorldState = {
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

export type UiEventKind =
  | "cash"
  | "buy"
  | "upgrade"
  | "raid"
  | "defense"
  | "manager"
  | "build";

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

export type GameState = {
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

export type GameActions = {
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

export type GameSelectors = {
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
  getAvailableBuildingDefs: () => typeof import("../base").BUILDING_DEFS;
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

export type GameStore = GameState & GameActions & GameSelectors;

export type PersistedState = Pick<
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

import type { MilestoneInfo } from "./types";

export const STORAGE_KEY = "adcap-core-state-v5";

export const TAP_PAY = 0.25;
export const TAP_BONUS_EVERY = 20;
export const TAP_BONUS_AMOUNT = 2.0;
export const DEFAULT_MANAGER_COST_MULT = 25;
export const BASE_OFFLINE_CAP_SECONDS = 2 * 60 * 60;
export const MAX_BUY_ITERATIONS = 500;
export const MAX_CYCLE_CATCHUP = 100;
export const MIN_CYCLE_MS = 250;
export const UPGRADE_OFFER_REFRESH_MS = 90 * 1000;
export const THEFT_CHECK_MS = 60 * 1000;
export const THEFT_CHANCE = 0.25;
export const THEFT_MIN_PCT = 0.05;
export const THEFT_MAX_PCT = 0.12;
export const THEFT_BASE_THRESHOLD = 50;
export const THEFT_THRESHOLD_SECONDS = 90;
export const GOAL_SLOTS = 3;
export const WAR_ATTACK_COOLDOWN_MS = 2 * 60 * 1000;
export const WAR_SHIELD_MS = 15 * 60 * 1000;
export const WAR_RAID_TROPHY_THRESHOLD = 20;
export const WAR_MAX_LOOT_MINUTES = 10;
export const WAR_MAX_LOSS_MINUTES = 6;
export const WAR_PWIN_SCALE = 20;
export const UI_EVENT_MIN_GAP_MS = 800;

export const MILESTONES: MilestoneInfo[] = [
  { count: 10, mult: 2 },
  { count: 25, mult: 2 },
  { count: 50, mult: 3 },
  { count: 100, mult: 5 },
];

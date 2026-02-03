import { BUSINESS_DEFS } from "../../economy";
import {
  clampNumber,
  getLeagueConfig,
  randomFloat,
  WAR_TARGET_NAMES,
} from "../../war";
import type { WarTarget } from "../../war";
import { WAR_UPGRADE_BY_ID } from "../../upgrades_war";
import { defaultCooldowns, generateTargets } from "../../warEngine";
import type { PlayerWarState } from "../../warEngine";
import { WAR_ATTACK_COOLDOWN_MS, WAR_SHIELD_MS } from "../constants";
import type { GameState } from "../types";
import { getIncomePerSecTotalForState } from "./business";
import { getHqLevelForState } from "./buildings";

export const getWarUpgradeBonuses = (state: GameState) => {
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

export const getWarOffensePowerForState = (state: GameState) => {
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

export const getWarDefensePowerForState = (state: GameState) => {
  const hqLevel = getHqLevelForState(state);
  const projectsCompleted = state.completedProjects.length;
  const safeBonus = state.safeCash > 0 ? 20 : 0;
  const bonuses = getWarUpgradeBonuses(state);
  return hqLevel * 12 + safeBonus + projectsCompleted * 8 + bonuses.defenseBonus;
};

export const getWarVaultProtectPctForState = (state: GameState) =>
  getWarUpgradeBonuses(state).vaultProtectPct;

export const getWarAttackCooldownMsForState = (state: GameState) => {
  const bonuses = getWarUpgradeBonuses(state);
  return Math.max(30_000, WAR_ATTACK_COOLDOWN_MS * bonuses.attackCooldownMult);
};

export const getWarLootMultForState = (state: GameState) => getWarUpgradeBonuses(state).lootMult;

export const getWarLossMultForState = (state: GameState) => getWarUpgradeBonuses(state).lossMult;

export const getWarShieldDurationMsForState = (state: GameState) => {
  const bonuses = getWarUpgradeBonuses(state);
  return WAR_SHIELD_MS + bonuses.shieldDurationBonusSec * 1000;
};

export const getPlayerWarStateForEngine = (state: GameState): PlayerWarState => ({
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

export const scheduleNextRaidAt = (
  seed: number,
  leagueConfig: ReturnType<typeof getLeagueConfig>
) => {
  const { value, next } = randomFloat(seed);
  const minutes =
    leagueConfig.raidMinMinutes +
    (leagueConfig.raidMaxMinutes - leagueConfig.raidMinMinutes) * value;
  return { nextAtMs: minutes * 60 * 1000, seed: next };
};

export const generateWarTargets = (state: GameState, seed: number, now: number) => {
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

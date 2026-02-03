import { createSeed, getLeagueConfig, getLeagueForTrophies } from "../../war";
import type {
  BattleReport,
  IncomingRaid,
  RaidEvent,
  RaidReport,
  WarState,
  WarTarget,
} from "../../war";
import { WAR_UPGRADE_BY_ID } from "../../upgrades_war";
import { createDefaultWarState } from "./defaults";

export const normalizeWarState = (value: unknown, now: number): WarState => {
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
    typeof raw.attackCooldownUntil === "number" &&
    Number.isFinite(raw.attackCooldownUntil)
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
            typeof target.trophyLoss === "number" &&
            Number.isFinite(target.trophyLoss)
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
          const targetName =
            typeof item.targetName === "string" ? item.targetName : undefined;
          const reportRaw =
            item.report && typeof item.report === "object"
              ? (item.report as Record<string, unknown>)
              : null;
          const report: BattleReport = {
            kind: item.kind,
            offense:
              reportRaw &&
              typeof reportRaw.offense === "number" &&
              Number.isFinite(reportRaw.offense)
                ? reportRaw.offense
                : 0,
            defense:
              reportRaw &&
              typeof reportRaw.defense === "number" &&
              Number.isFinite(reportRaw.defense)
                ? reportRaw.defense
                : 0,
            pWin:
              reportRaw &&
              typeof reportRaw.pWin === "number" &&
              Number.isFinite(reportRaw.pWin)
                ? reportRaw.pWin
                : 0.5,
            roll:
              reportRaw &&
              typeof reportRaw.roll === "number" &&
              Number.isFinite(reportRaw.roll)
                ? reportRaw.roll
                : 0.5,
            incomePerSec:
              reportRaw &&
              typeof reportRaw.incomePerSec === "number" &&
              Number.isFinite(reportRaw.incomePerSec)
                ? reportRaw.incomePerSec
                : 0,
            loot:
              reportRaw &&
              typeof reportRaw.loot === "number" &&
              Number.isFinite(reportRaw.loot)
                ? reportRaw.loot
                : loot,
            lootCap:
              reportRaw &&
              typeof reportRaw.lootCap === "number" &&
              Number.isFinite(reportRaw.lootCap)
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
              reportRaw &&
              typeof reportRaw.stealPct === "number" &&
              Number.isFinite(reportRaw.stealPct)
                ? reportRaw.stealPct
                : undefined,
            lossMult:
              reportRaw &&
              typeof reportRaw.lossMult === "number" &&
              Number.isFinite(reportRaw.lossMult)
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
        typeof value === "number" && Number.isFinite(value)
          ? Math.max(0, Math.floor(value))
          : 0;
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

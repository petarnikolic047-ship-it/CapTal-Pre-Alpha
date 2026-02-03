import {
  clampNumber,
  getLeagueConfig,
  getLeagueForTrophies,
  randomFloat,
  sigmoid,
  WAR_TARGET_REFRESH_MS,
} from "../../war";
import type { BattleReport, RaidEvent, RaidReport } from "../../war";
import { getWarUpgradeCost, WAR_UPGRADE_BY_ID } from "../../upgrades_war";
import { resolveRaid } from "../../warEngine";
import type { WarTargetCard } from "../../warEngine";
import {
  UI_EVENT_MIN_GAP_MS,
  WAR_MAX_LOOT_MINUTES,
  WAR_MAX_LOSS_MINUTES,
  WAR_PWIN_SCALE,
  WAR_RAID_TROPHY_THRESHOLD,
} from "../constants";
import { appendUiEvent, createUiEvent } from "../helpers/uiEvents";
import { getIncomePerSecTotalForState } from "../domain/business";
import {
  generateWarTargets,
  getPlayerWarStateForEngine,
  getWarAttackCooldownMsForState,
  getWarDefensePowerForState,
  getWarLootMultForState,
  getWarLossMultForState,
  getWarShieldDurationMsForState,
  getWarVaultProtectPctForState,
  scheduleNextRaidAt,
} from "../domain/war";
import type { UiEvent } from "../types";
import type { GetState, SetState } from "./types";

export const createWarActions = (set: SetState, get: GetState) => ({
  buyWarUpgrade: (id: string) => {
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
  attackWarTarget: (id: string) => {
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
  processWarTick: (now: number) => {
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
        const leagueBonus =
          war.league === "silver"
            ? 5
            : war.league === "gold"
            ? 10
            : war.league === "diamond"
            ? 15
            : 0;
        const attackerOffense = defensePower + (-15 + rollOffense.value * 50) + leagueBonus;
        const chance = clampNumber(
          sigmoid((attackerOffense - defensePower) / WAR_PWIN_SCALE),
          0.05,
          0.95
        );

        const rollOutcome = randomFloat(seed);
        seed = rollOutcome.next;

        const rollSteal = randomFloat(seed);
        seed = rollSteal.next;
        const stealPct = 0.06 + rollSteal.value * 0.12;

        const capMinutes = Math.min(WAR_MAX_LOSS_MINUTES, leagueConfig.defenseLossCapMinutes);
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
      } else if (now >= war.nextRaidAt && (!raidEligible || cash <= cashThreshold)) {
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
});

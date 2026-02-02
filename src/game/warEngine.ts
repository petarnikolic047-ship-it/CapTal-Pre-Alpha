export type WarLeague = "bronze" | "silver" | "gold" | "diamond";

export type PlayerWarState = {
  trophies: number;
  league: WarLeague;
  offense: number;
  defense: number;
  vaultProtectionPct: number;
  shieldUntil: number | null;
  lastTargetRefreshAt: number;
  lastRaidAt: number;
  incomePerSec: number;
  heatUntil?: number;
};

export type WarTargetCard = {
  id: string;
  name: string;
  defense: number;
  lootCap: number;
  trophyDeltaWin: number;
  trophyDeltaLose: number;
  refreshAt: number;
};

export type RaidLogEntry = {
  ts: number;
  targetId: string;
  roll: number;
  chance: number;
  result: "win" | "loss";
  loot: number;
  trophiesDelta: number;
  cashStolenFromYou?: number;
};

export type WarCooldowns = {
  raidCooldownSec: number;
  targetRefreshSec: number;
};

export type WarSeedResult<T> = {
  seed: number;
  value: T;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

const nextSeed = (seed: number) => (seed * 1664525 + 1013904223) >>> 0;

const rand = (seed: number): WarSeedResult<number> => {
  const next = nextSeed(seed);
  return { seed: next, value: next / 0xffffffff };
};

const randRange = (seed: number, min: number, max: number): WarSeedResult<number> => {
  const { seed: next, value } = rand(seed);
  return { seed: next, value: min + (max - min) * value };
};

export const defaultCooldowns: WarCooldowns = {
  raidCooldownSec: 120,
  targetRefreshSec: 120,
};

export const generateTargets = (
  player: PlayerWarState,
  seed: number,
  now: number,
  cooldowns: WarCooldowns,
  names: string[] = []
): WarSeedResult<WarTargetCard[]> => {
  const difficulties = [
    { id: "easy", defenseMult: 0.8, lootSeconds: 60, win: 8, lose: -4 },
    { id: "medium", defenseMult: 1.0, lootSeconds: 180, win: 15, lose: -8 },
    { id: "hard", defenseMult: 1.2, lootSeconds: 480, win: 25, lose: -12 },
  ];

  let nextSeedValue = seed;
  const availableNames = [...names];
  const targets = difficulties.map((entry, index) => {
    let name = "Rival Corp";
    if (availableNames.length > 0) {
      const pick = randRange(nextSeedValue, 0, availableNames.length - 0.0001);
      nextSeedValue = pick.seed;
      name = availableNames.splice(Math.floor(pick.value), 1)[0] ?? name;
    }
    const noise = randRange(nextSeedValue, 0, 6);
    nextSeedValue = noise.seed;
    const defense = player.defense * entry.defenseMult + noise.value;
    const lootCap = player.incomePerSec * entry.lootSeconds;
    return {
      id: `target-${now}-${index}`,
      name,
      defense,
      lootCap,
      trophyDeltaWin: entry.win,
      trophyDeltaLose: entry.lose,
      refreshAt: now + cooldowns.targetRefreshSec * 1000,
    };
  });

  return { seed: nextSeedValue, value: targets };
};

export const resolveRaid = (
  player: PlayerWarState,
  target: WarTargetCard,
  seed: number,
  now: number,
  scale = 25
): WarSeedResult<{ target: WarTargetCard; log: RaidLogEntry; updated: PlayerWarState }> => {
  let nextSeedValue = seed;
  const chance = clamp(sigmoid((player.offense - target.defense) / scale), 0.05, 0.95);
  const roll = rand(nextSeedValue);
  nextSeedValue = roll.seed;
  const win = roll.value < chance;

  let loot = 0;
  if (win) {
    const range = randRange(nextSeedValue, 0.25, 0.6);
    nextSeedValue = range.seed;
    loot = Math.min(target.lootCap, range.value * target.lootCap);
  }

  const trophiesDelta = win ? target.trophyDeltaWin : target.trophyDeltaLose;
  const nextTarget = {
    ...target,
    lootCap: win ? Math.max(target.lootCap - loot, target.lootCap * 0.45) : target.lootCap,
  };
  const log: RaidLogEntry = {
    ts: now,
    targetId: target.id,
    roll: roll.value,
    chance,
    result: win ? "win" : "loss",
    loot,
    trophiesDelta,
  };
  const updated: PlayerWarState = {
    ...player,
    trophies: Math.max(0, player.trophies + trophiesDelta),
    lastRaidAt: now,
  };

  return { seed: nextSeedValue, value: { target: nextTarget, log, updated } };
};

export const resolveIncomingRaid = (
  player: PlayerWarState,
  seed: number,
  now: number,
  scale = 25
): WarSeedResult<RaidLogEntry> => {
  const rollOffense = randRange(seed, -15, 35);
  let nextSeedValue = rollOffense.seed;
  const attackerOffense = player.defense + rollOffense.value;
  const chance = clamp(sigmoid((attackerOffense - player.defense) / scale), 0.05, 0.95);
  const roll = rand(nextSeedValue);
  nextSeedValue = roll.seed;
  const attackerWins = roll.value < chance;
  let stolen = 0;

  if (attackerWins) {
    const stealPct = randRange(nextSeedValue, 0.06, 0.18);
    nextSeedValue = stealPct.seed;
    const base = player.incomePerSec * 300;
    const lootable = base;
    const protectedAmt = lootable * player.vaultProtectionPct;
    stolen = Math.max(0, lootable - protectedAmt) * stealPct.value;
  }

  const log: RaidLogEntry = {
    ts: now,
    targetId: "incoming",
    roll: roll.value,
    chance,
    result: attackerWins ? "loss" : "win",
    loot: 0,
    trophiesDelta: attackerWins ? -3 : 1,
    cashStolenFromYou: stolen,
  };

  return { seed: nextSeedValue, value: log };
};

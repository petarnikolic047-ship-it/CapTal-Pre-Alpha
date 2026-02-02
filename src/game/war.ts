export type WarLeague = "bronze" | "silver" | "gold" | "plat";

export type WarTarget = {
  id: string;
  name: string;
  defense: number;
  loot: number;
  trophyWin: number;
  trophyLoss: number;
  difficulty: "easy" | "medium" | "hard";
};

export type RaidEvent = {
  id: string;
  kind: "attack" | "defense";
  result: "win" | "loss";
  loot: number;
  trophiesDelta: number;
  at: number;
  targetName?: string;
};

export type WarState = {
  trophies: number;
  league: WarLeague;
  shieldUntil: number | null;
  attackCooldownUntil: number | null;
  targets: WarTarget[];
  lastTargetsAt: number;
  raidLog: RaidEvent[];
  rngSeed: number;
  nextRaidAt: number;
  warUpgrades: string[];
};

export type WarLeagueConfig = {
  id: WarLeague;
  minTrophies: number;
  attackLootCapMinutes: number;
  defenseLossCapMinutes: number;
  raidMinMinutes: number;
  raidMaxMinutes: number;
};

export const WAR_LEAGUES: WarLeagueConfig[] = [
  {
    id: "bronze",
    minTrophies: 0,
    attackLootCapMinutes: 8,
    defenseLossCapMinutes: 4,
    raidMinMinutes: 12,
    raidMaxMinutes: 20,
  },
  {
    id: "silver",
    minTrophies: 200,
    attackLootCapMinutes: 10,
    defenseLossCapMinutes: 5,
    raidMinMinutes: 12,
    raidMaxMinutes: 18,
  },
  {
    id: "gold",
    minTrophies: 500,
    attackLootCapMinutes: 12,
    defenseLossCapMinutes: 6,
    raidMinMinutes: 10,
    raidMaxMinutes: 18,
  },
  {
    id: "plat",
    minTrophies: 1000,
    attackLootCapMinutes: 14,
    defenseLossCapMinutes: 6,
    raidMinMinutes: 10,
    raidMaxMinutes: 16,
  },
];

export const WAR_TARGET_REFRESH_MS = 2 * 60 * 1000;

export const getLeagueForTrophies = (trophies: number): WarLeague => {
  const sorted = [...WAR_LEAGUES].sort((a, b) => a.minTrophies - b.minTrophies);
  return sorted.reduce<WarLeague>((acc, entry) => {
    if (trophies >= entry.minTrophies) {
      return entry.id;
    }
    return acc;
  }, "bronze");
};

export const getLeagueConfig = (league: WarLeague) =>
  WAR_LEAGUES.find((entry) => entry.id === league) ?? WAR_LEAGUES[0];

export const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createSeed = () => Math.floor(Math.random() * 0xffffffff);

export const nextSeed = (seed: number) => (seed * 1664525 + 1013904223) >>> 0;

export const randomFloat = (seed: number) => {
  const next = nextSeed(seed);
  return { value: next / 0xffffffff, next };
};

export const pickFrom = <T,>(items: T[], seed: number) => {
  if (items.length === 0) {
    return { item: null as T | null, next: seed };
  }
  const { value, next } = randomFloat(seed);
  const index = Math.floor(value * items.length);
  return { item: items[index], next };
};

export const WAR_TARGET_NAMES = [
  "Rival Holdings",
  "Neon Syndicate",
  "Copper Bay Group",
  "Skyline Partners",
  "Vertex Capital",
  "Midnight Works",
  "Atlas Exchange",
  "Briarstone Inc",
  "Northshore Labs",
  "Driftline Co",
];

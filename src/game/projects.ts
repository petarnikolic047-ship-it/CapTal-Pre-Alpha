export type ProjectEffect = {
  offlineCapSecondsAdd?: number;
  globalProfitMult?: number;
  globalTimeMult?: number;
  autoRunAll?: boolean;
};

export type ProjectUnlock = {
  totalEarnedAtLeast?: number;
  hqLevelAtLeast?: number;
};

export type ProjectDef = {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  targetSeconds: number;
  effect: ProjectEffect;
  unlock?: ProjectUnlock;
};

export type ProjectRun = {
  id: string;
  startedAt: number;
  endsAt: number;
  cost: number;
};

export const PROJECT_DEFS: ProjectDef[] = [
  {
    id: "offline-cap-2h",
    name: "Continuity Plan",
    description: "Extend offline cap by +2 hours.",
    durationMs: 10 * 60 * 1000,
    targetSeconds: 10 * 60,
    effect: { offlineCapSecondsAdd: 2 * 60 * 60 },
    unlock: { totalEarnedAtLeast: 200 },
  },
  {
    id: "profit-boost-25",
    name: "Narrative Control",
    description: "Increase all profits by +25%.",
    durationMs: 15 * 60 * 1000,
    targetSeconds: 15 * 60,
    effect: { globalProfitMult: 1.25 },
    unlock: { totalEarnedAtLeast: 1000 },
  },
  {
    id: "cycle-optimization",
    name: "Process Discipline",
    description: "Speed up all cycles by 10%.",
    durationMs: 20 * 60 * 1000,
    targetSeconds: 20 * 60,
    effect: { globalTimeMult: 0.9 },
    unlock: { totalEarnedAtLeast: 5000 },
  },
  {
    id: "auto-dispatch",
    name: "Delegation Doctrine",
    description: "Auto-run all idle operations.",
    durationMs: 25 * 60 * 1000,
    targetSeconds: 25 * 60,
    effect: { autoRunAll: true },
    unlock: { totalEarnedAtLeast: 15000, hqLevelAtLeast: 3 },
  },
  {
    id: "profit-boost-50",
    name: "Marketing Blitz",
    description: "Increase all profits by +50%.",
    durationMs: 30 * 60 * 1000,
    targetSeconds: 30 * 60,
    effect: { globalProfitMult: 1.5 },
    unlock: { totalEarnedAtLeast: 10000, hqLevelAtLeast: 3 },
  },
  {
    id: "offline-cap-4h",
    name: "Vault Expansion",
    description: "Extend offline cap by +4 hours.",
    durationMs: 35 * 60 * 1000,
    targetSeconds: 40 * 60,
    effect: { offlineCapSecondsAdd: 4 * 60 * 60 },
    unlock: { totalEarnedAtLeast: 20000, hqLevelAtLeast: 3 },
  },
  {
    id: "cycle-overclock",
    name: "Distribution Pressure",
    description: "Speed up all cycles by 15%.",
    durationMs: 45 * 60 * 1000,
    targetSeconds: 45 * 60,
    effect: { globalTimeMult: 0.85 },
    unlock: { totalEarnedAtLeast: 50000, hqLevelAtLeast: 3 },
  },
  {
    id: "offline-cap-8h",
    name: "Deep Storage",
    description: "Extend offline cap by +8 hours.",
    durationMs: 60 * 60 * 1000,
    targetSeconds: 60 * 60,
    effect: { offlineCapSecondsAdd: 8 * 60 * 60 },
    unlock: { totalEarnedAtLeast: 250000, hqLevelAtLeast: 3 },
  },
  {
    id: "profit-boost-100",
    name: "Board Alignment",
    description: "Increase all profits by +100%.",
    durationMs: 90 * 60 * 1000,
    targetSeconds: 90 * 60,
    effect: { globalProfitMult: 2.0 },
    unlock: { totalEarnedAtLeast: 1000000, hqLevelAtLeast: 3 },
  },
  {
    id: "cycle-mastery",
    name: "Executive Efficiency",
    description: "Speed up all cycles by 25%.",
    durationMs: 120 * 60 * 1000,
    targetSeconds: 120 * 60,
    effect: { globalTimeMult: 0.75 },
    unlock: { totalEarnedAtLeast: 5000000, hqLevelAtLeast: 3 },
  },
];

export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(
  PROJECT_DEFS.map((def) => [def.id, def])
) as Record<string, ProjectDef>;

export const getProjectCost = (incomePerSec: number, project: ProjectDef) =>
  Math.max(0, incomePerSec * project.targetSeconds);

export const getProjectSlots = () => 1;

export const getProjectOfflineCapBonusSeconds = (completedProjects: string[]) =>
  completedProjects.reduce((sum, id) => {
    const def = PROJECT_BY_ID[id];
    if (!def) {
      return sum;
    }
    return sum + (def.effect.offlineCapSecondsAdd ?? 0);
  }, 0);

export const getProjectGlobalProfitMult = (completedProjects: string[]) =>
  completedProjects.reduce((mult, id) => {
    const def = PROJECT_BY_ID[id];
    if (!def || !def.effect.globalProfitMult) {
      return mult;
    }
    return mult * def.effect.globalProfitMult;
  }, 1);

export const getProjectGlobalTimeMult = (completedProjects: string[]) =>
  completedProjects.reduce((mult, id) => {
    const def = PROJECT_BY_ID[id];
    if (!def || !def.effect.globalTimeMult) {
      return mult;
    }
    return mult * def.effect.globalTimeMult;
  }, 1);

export const getProjectAutoRunAll = (completedProjects: string[]) =>
  completedProjects.some((id) => PROJECT_BY_ID[id]?.effect.autoRunAll);

export const isProjectUnlocked = (
  project: ProjectDef,
  totalEarned: number,
  hqLevel: number
) => {
  const required = project.unlock?.totalEarnedAtLeast ?? 0;
  const hqRequired = project.unlock?.hqLevelAtLeast ?? 1;
  return totalEarned >= required && hqLevel >= hqRequired;
};

export const getAvailableProjects = (
  completedProjects: string[],
  runningProjects: ProjectRun[],
  totalEarned: number,
  hqLevel: number
) => {
  const runningIds = new Set(runningProjects.map((run) => run.id));
  return PROJECT_DEFS.filter(
    (project) =>
      !completedProjects.includes(project.id) &&
      !runningIds.has(project.id) &&
      isProjectUnlocked(project, totalEarned, hqLevel)
  );
};

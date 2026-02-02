export type ProjectEffect = {
  projectSlotsAdd?: number;
  offlineCapSecondsAdd?: number;
  globalProfitMult?: number;
};

export type ProjectUnlock = {
  totalEarnedAtLeast?: number;
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PROJECT_DEFS: ProjectDef[] = [
  {
    id: "slot-2",
    name: "Second Project Slot",
    description: "Add a second concurrent project slot.",
    durationMs: 10 * 60 * 1000,
    targetSeconds: 15 * 60,
    effect: { projectSlotsAdd: 1 },
    unlock: { totalEarnedAtLeast: 500 },
  },
  {
    id: "offline-cap-2h",
    name: "Offline Battery",
    description: "Increase offline cap by +2 hours.",
    durationMs: 5 * 60 * 1000,
    targetSeconds: 7 * 60,
    effect: { offlineCapSecondsAdd: 2 * 60 * 60 },
    unlock: { totalEarnedAtLeast: 200 },
  },
  {
    id: "profit-boost-50",
    name: "Global Profit Protocol",
    description: "Increase all profits by +50%.",
    durationMs: 30 * 60 * 1000,
    targetSeconds: 30 * 60,
    effect: { globalProfitMult: 1.5 },
    unlock: { totalEarnedAtLeast: 2000 },
  },
  {
    id: "slot-3",
    name: "Third Project Slot",
    description: "Add a third concurrent project slot.",
    durationMs: 20 * 60 * 1000,
    targetSeconds: 60 * 60,
    effect: { projectSlotsAdd: 1 },
    unlock: { totalEarnedAtLeast: 5000000 },
  },
];

export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(
  PROJECT_DEFS.map((def) => [def.id, def])
) as Record<string, ProjectDef>;

export const getProjectCost = (incomePerSec: number, project: ProjectDef) =>
  Math.max(0, incomePerSec * project.targetSeconds);

export const getProjectSlots = (completedProjects: string[]) => {
  const base = 1;
  const bonus = completedProjects.reduce((sum, id) => {
    const def = PROJECT_BY_ID[id];
    if (!def) {
      return sum;
    }
    return sum + (def.effect.projectSlotsAdd ?? 0);
  }, 0);

  return clamp(base + bonus, 1, 3);
};

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

export const isProjectUnlocked = (project: ProjectDef, totalEarned: number) => {
  const required = project.unlock?.totalEarnedAtLeast ?? 0;
  return totalEarned >= required;
};

export const getAvailableProjects = (
  completedProjects: string[],
  runningProjects: ProjectRun[],
  totalEarned: number
) => {
  const runningIds = new Set(runningProjects.map((run) => run.id));
  return PROJECT_DEFS.filter(
    (project) =>
      !completedProjects.includes(project.id) &&
      !runningIds.has(project.id) &&
      isProjectUnlocked(project, totalEarned)
  );
};

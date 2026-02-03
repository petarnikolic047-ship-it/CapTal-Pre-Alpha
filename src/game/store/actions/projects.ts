import { PROJECT_BY_ID, getProjectCost, isProjectUnlocked } from "../../projects";
import type { ProjectRun } from "../../projects";
import { getIncomePerSecTotalForState } from "../domain/business";
import { getHqLevelForState } from "../domain/buildings";
import { getProjectDurationMsForState, getProjectSlotsForState } from "../domain/projects";
import type { GetState, SetState } from "./types";

export const createProjectActions = (set: SetState, get: GetState) => ({
  startProject: (id: string) => {
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
  processProjectCompletions: (now: number) => {
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
});

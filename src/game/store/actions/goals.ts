import { buildGoalPool, getGoalProgress, pickRandomGoals } from "../../goals";
import type { GoalState } from "../../goals";
import { GOAL_SLOTS } from "../constants";
import { pruneExpiredBuffs } from "../helpers/buffs";
import { getGoalContextForState, getUnlockedBusinessIds } from "../domain/goals";
import type { GetState, SetState } from "./types";

export const createGoalActions = (set: SetState, get: GetState) => ({
  processGoals: (now: number) => {
    const state = get();
    const context = getGoalContextForState(state);
    let activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    let buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    let runningProjects = state.runningProjects;
    let activeGoals: GoalState[] = [];
    let goalsChanged = false;

    for (const goal of state.activeGoals) {
      const progress = getGoalProgress(goal, context);
      if (!progress.complete) {
        activeGoals.push(goal);
        continue;
      }

      const reward = goal.reward;
      const buffId = `goal-${goal.id}-${now}`;
      if (reward.kind === "business-profit") {
        activeBuffs = [
          ...activeBuffs,
          {
            id: buffId,
            kind: "business-profit",
            businessId: reward.businessId,
            mult: reward.mult,
            expiresAt: now + reward.durationMs,
          },
        ];
        buffsChanged = true;
      } else if (reward.kind === "project-time") {
        activeBuffs = [
          ...activeBuffs,
          {
            id: buffId,
            kind: "project-time",
            mult: reward.mult,
            expiresAt: now + reward.durationMs,
          },
        ];
        if (runningProjects.length > 0) {
          runningProjects = runningProjects.map((run) => {
            const remaining = run.endsAt - now;
            if (remaining <= 0) {
              return run;
            }
            return {
              ...run,
              endsAt: now + remaining * reward.mult,
            };
          });
        }
        buffsChanged = true;
      }

      goalsChanged = true;
    }

    if (activeGoals.length < GOAL_SLOTS) {
      const pool = buildGoalPool(context, getUnlockedBusinessIds(state));
      const newGoals = pickRandomGoals(
        pool,
        GOAL_SLOTS - activeGoals.length,
        activeGoals.map((goal) => goal.id)
      );
      if (newGoals.length > 0) {
        activeGoals = [...activeGoals, ...newGoals];
        goalsChanged = true;
      }
    }

    if (goalsChanged || buffsChanged) {
      set({
        activeGoals,
        activeBuffs,
        runningProjects,
      });
    } else if (runningProjects !== state.runningProjects) {
      set({ runningProjects });
    }
  },
});

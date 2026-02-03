import {
  THEFT_CHANCE,
  THEFT_CHECK_MS,
  THEFT_MAX_PCT,
  THEFT_MIN_PCT,
} from "../constants";
import { getTheftThresholdForState } from "../domain/risk";
import type { GetState, SetState } from "./types";

export const createRiskActions = (set: SetState, get: GetState) => ({
  processRiskEvents: (now: number) => {
    const state = get();
    if (now - state.lastTheftCheckAt < THEFT_CHECK_MS) {
      return;
    }
    const threshold = getTheftThresholdForState(state);
    let cash = state.cash;
    let lastLoss = state.lastTheftLoss;

    if (cash > threshold && Math.random() < THEFT_CHANCE) {
      const pct = THEFT_MIN_PCT + Math.random() * (THEFT_MAX_PCT - THEFT_MIN_PCT);
      const loss = cash * pct;
      cash = Math.max(0, cash - loss);
      lastLoss = loss;
    }

    if (cash !== state.cash || lastLoss !== state.lastTheftLoss) {
      set({
        cash,
        lastTheftLoss: lastLoss,
        lastTheftCheckAt: now,
      });
    } else if (state.lastTheftCheckAt !== now) {
      set({ lastTheftCheckAt: now });
    }
  },
});

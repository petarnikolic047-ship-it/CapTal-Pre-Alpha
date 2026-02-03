import { applyOfflineProgress } from "../domain/offline";
import { ensureGoals } from "../domain/goals";
import { ensureUpgradeOffers } from "../domain/upgrades";
import type { GetState, SetState } from "./types";

export const createOfflineActions = (set: SetState, get: GetState) => ({
  syncOfflineProgress: (now: number) => {
    const state = get();
    const nextState = applyOfflineProgress(state, now);
    const withOffers = ensureUpgradeOffers(nextState, now);
    set(ensureGoals(withOffers));
  },
  markSeen: (now: number) => {
    const state = get();
    if (state.lastSeenAt !== now) {
      set({ lastSeenAt: now });
    }
  },
});

import {
  getAvailableUpgradesForCounts,
  getUpgradeCost,
  isUpgradeUnlockedForCounts,
  UPGRADE_BY_ID,
} from "../../upgrades";
import { UPGRADE_OFFER_REFRESH_MS } from "../constants";
import { ensureUpgradeOffers, sampleUpgradeOffers } from "../domain/upgrades";
import { getBusinessCounts, getIncomePerSecTotalForState } from "../domain/business";
import type { GetState, SetState } from "./types";

export const createUpgradeActions = (set: SetState, get: GetState) => ({
  buyUpgrade: (id: string) => {
    const state = get();
    const upgrade = UPGRADE_BY_ID[id];
    if (!upgrade || state.purchasedUpgrades.includes(id)) {
      return;
    }
    if (!isUpgradeUnlockedForCounts(upgrade, getBusinessCounts(state), state.totalEarned)) {
      return;
    }
    const incomePerSec = getIncomePerSecTotalForState(state);
    const cost = getUpgradeCost(incomePerSec, upgrade);
    if (cost <= 0 || state.cash < cost) {
      return;
    }

    const nextState = {
      ...state,
      cash: state.cash - cost,
      purchasedUpgrades: [...state.purchasedUpgrades, id],
    };
    const refreshed = ensureUpgradeOffers(nextState, Date.now());
    set(refreshed);
  },
  processUpgradeOffers: (now: number) => {
    const state = get();
    const available = getAvailableUpgradesForCounts(
      getBusinessCounts(state),
      state.totalEarned,
      state.purchasedUpgrades
    );
    const availableIds = new Set(available.map((upgrade) => upgrade.id));
    const filtered = state.upgradeOffers.filter((id) => availableIds.has(id));
    const targetCount = Math.min(3, available.length);
    const offersChanged = filtered.length !== state.upgradeOffers.length;
    const needsRefresh =
      now - state.lastOfferRefreshAt >= UPGRADE_OFFER_REFRESH_MS ||
      filtered.length < targetCount;

    if (!offersChanged && !needsRefresh) {
      return;
    }

    const nextOffers = needsRefresh ? sampleUpgradeOffers(available, 3) : filtered;
    set({
      upgradeOffers: nextOffers,
      lastOfferRefreshAt: needsRefresh ? now : state.lastOfferRefreshAt,
    });
  },
});

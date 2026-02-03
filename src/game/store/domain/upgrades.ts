import { getAvailableUpgradesForCounts } from "../../upgrades";
import type { UpgradeDef } from "../../upgrades";
import type { GameState } from "../types";
import { getBusinessCounts } from "./business";

export const sampleUpgradeOffers = (available: UpgradeDef[], count: number) => {
  if (available.length <= count) {
    return available.map((upgrade) => upgrade.id);
  }
  const pool = [...available];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map((upgrade) => upgrade.id);
};

export const ensureUpgradeOffers = (state: GameState, now: number) => {
  const available = getAvailableUpgradesForCounts(
    getBusinessCounts(state),
    state.totalEarned,
    state.purchasedUpgrades
  );
  const availableIds = new Set(available.map((upgrade) => upgrade.id));
  const filtered = state.upgradeOffers.filter((id) => availableIds.has(id));
  if (filtered.length === Math.min(3, available.length)) {
    return state;
  }
  return {
    ...state,
    upgradeOffers: sampleUpgradeOffers(available, 3),
    lastOfferRefreshAt: now,
  };
};

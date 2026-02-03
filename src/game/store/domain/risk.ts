import { THEFT_BASE_THRESHOLD, THEFT_THRESHOLD_SECONDS } from "../constants";
import type { GameState } from "../types";
import { getIncomePerSecTotalForState } from "./business";

export const getTheftThresholdForState = (state: GameState) => {
  const incomePerSec = getIncomePerSecTotalForState(state);
  return Math.max(THEFT_BASE_THRESHOLD, incomePerSec * THEFT_THRESHOLD_SECONDS);
};

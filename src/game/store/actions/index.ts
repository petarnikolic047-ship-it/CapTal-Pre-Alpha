import type { GetState, SetState } from "./types";
import { createBusinessActions } from "./business";
import { createBuildingActions } from "./buildings";
import { createProjectActions } from "./projects";
import { createUpgradeActions } from "./upgrades";
import { createWarActions } from "./war";
import { createGoalActions } from "./goals";
import { createRiskActions } from "./risk";
import { createOfflineActions } from "./offline";
import { createUiActions } from "./ui";

export const createGameActions = (set: SetState, get: GetState) => ({
  ...createBusinessActions(set, get),
  ...createBuildingActions(set, get),
  ...createProjectActions(set, get),
  ...createUpgradeActions(set, get),
  ...createWarActions(set, get),
  ...createGoalActions(set, get),
  ...createRiskActions(set, get),
  ...createOfflineActions(set, get),
  ...createUiActions(set),
});

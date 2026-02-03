import {
  getProjectAutoRunAll,
  getProjectGlobalProfitMult,
  getProjectGlobalTimeMult,
  getProjectOfflineCapBonusSeconds,
  getProjectSlots,
} from "../../projects";
import { BASE_OFFLINE_CAP_SECONDS } from "../constants";
import type { GameState } from "../types";

export const getProjectSlotsForState = () => getProjectSlots();

export const getProjectProfitMult = (state: GameState) =>
  getProjectGlobalProfitMult(state.completedProjects);

export const getProjectTimeMult = (state: GameState) =>
  getProjectGlobalTimeMult(state.completedProjects);

export const hasAutoRunAll = (state: GameState) => getProjectAutoRunAll(state.completedProjects);

export const getProjectTimeBuffMult = (state: GameState) =>
  state.activeBuffs.reduce((mult, buff) => {
    if (buff.kind === "project-time") {
      return mult * buff.mult;
    }
    return mult;
  }, 1);

export const getOfflineCapSeconds = (state: GameState) =>
  BASE_OFFLINE_CAP_SECONDS + getProjectOfflineCapBonusSeconds(state.completedProjects);

export const getProjectDurationMsForState = (state: GameState, baseDurationMs: number) => {
  const timeMult = getProjectTimeBuffMult(state);
  return Math.max(1000, baseDurationMs * timeMult);
};

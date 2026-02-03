import { BUSINESS_DEFS } from "../../economy";
import { createPlots, getPlotCountForHqLevel } from "../../base";
import type { BuildingInstance } from "../../base";
import { createSeed, getLeagueConfig, getLeagueForTrophies } from "../../war";
import type { WarState } from "../../war";
import type { BusinessId } from "../../economy";
import type { BusinessCoreState, WorldState } from "../types";

export const createDefaultBusinessState = (): BusinessCoreState => ({
  count: 0,
  managerOwned: false,
  running: false,
  endsAt: null,
});

export const createDefaultBusinesses = (): Record<BusinessId, BusinessCoreState> =>
  BUSINESS_DEFS.reduce((acc, def) => {
    acc[def.id] = createDefaultBusinessState();
    return acc;
  }, {} as Record<BusinessId, BusinessCoreState>);

export const createDefaultWorld = (): WorldState => {
  const plots = createPlots(getPlotCountForHqLevel(1));
  if (plots[0]) {
    plots[0].buildingId = "hq";
  }
  return {
    plots,
    selectedPlotId: null,
  };
};

export const createDefaultBuildings = (): Record<string, BuildingInstance> => ({
  hq: {
    id: "hq",
    typeId: "hq",
    plotId: "plot-1",
    buildingLevel: 1,
    upgradingUntil: null,
  },
});

export const createDefaultWarState = (now: number): WarState => {
  const seed = createSeed();
  const league = getLeagueForTrophies(0);
  const config = getLeagueConfig(league);
  const raidDelayMs =
    (config.raidMinMinutes +
      (config.raidMaxMinutes - config.raidMinMinutes) * 0.5) *
    60 *
    1000;
  return {
    trophies: 0,
    league,
    shieldUntil: null,
    attackCooldownUntil: null,
    heatUntil: null,
    targets: [],
    lastTargetsAt: 0,
    raidLog: [],
    rngSeed: seed,
    nextRaidAt: now + raidDelayMs,
    warUpgradeLevels: {},
    incomingRaid: null,
    raidReport: null,
    unreadRaidReport: false,
  };
};

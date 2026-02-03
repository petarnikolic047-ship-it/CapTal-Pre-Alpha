import { createPlots, getPlotCountForHqLevel } from "../../base";
import type { BuildingInstance, Plot } from "../../base";
import type { WorldState } from "../types";

export const ensurePlotsForHqLevel = (world: WorldState, hqLevel: number): WorldState => {
  const required = getPlotCountForHqLevel(hqLevel);
  if (world.plots.length >= required) {
    return world;
  }
  const nextPlots = createPlots(required);
  const existingById = new Map(world.plots.map((plot) => [plot.id, plot]));
  for (const plot of nextPlots) {
    const existing = existingById.get(plot.id);
    if (existing) {
      plot.buildingId = existing.buildingId;
    }
  }
  return {
    ...world,
    plots: nextPlots,
  };
};

export const syncWorldBuildings = (
  world: WorldState,
  buildings: Record<string, BuildingInstance>
) => {
  const plots: Plot[] = world.plots.map((plot) => ({ ...plot, buildingId: undefined }));
  const plotMap = new Map(plots.map((plot) => [plot.id, plot]));

  for (const building of Object.values(buildings)) {
    const plot = plotMap.get(building.plotId);
    if (plot) {
      plot.buildingId = building.id;
    }
  }

  if (plots[0] && !plots[0].buildingId) {
    plots[0].buildingId = "hq";
  }

  return {
    ...world,
    plots,
  };
};

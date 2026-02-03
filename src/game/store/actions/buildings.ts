import { BUILDING_BY_ID, getQueueSlotsForHq, getUnlockedBuyModesForHq } from "../../base";
import type { BuildingTypeId } from "../../base";
import type { BuildQueueItem } from "../types";
import { appendUiEvent, createUiEvent } from "../helpers/uiEvents";
import { ensurePlotsForHqLevel, syncWorldBuildings } from "../helpers/world";
import {
  getBuildingUpgradeCostForLevel,
  getBuildingUpgradeTimeSecForLevel,
  getHqLevelForState,
} from "../domain/buildings";
import type { GetState, SetState } from "./types";

export const createBuildingActions = (set: SetState, get: GetState) => ({
  selectPlot: (id: string | null) =>
    set((state) => ({
      world: {
        ...state.world,
        selectedPlotId: id,
      },
    })),
  placeBuilding: (plotId: string, typeId: BuildingTypeId) => {
    const state = get();
    const plot = state.world.plots.find((entry) => entry.id === plotId);
    if (!plot || plot.buildingId) {
      return;
    }
    const def = BUILDING_BY_ID[typeId];
    if (!def || typeId === "hq") {
      return;
    }
    const hqLevel = getHqLevelForState(state);
    if (def.hqLevelRequired > hqLevel) {
      return;
    }
    if (Object.values(state.buildings).some((building) => building.typeId === typeId)) {
      return;
    }
    if (state.cash < def.buildCost) {
      return;
    }
    const buildingId = `${typeId}-${plotId}`;
    const now = Date.now();
    const event = createUiEvent("build", "Asset placed", def.name, undefined, now);
    const nextBuildings = {
      ...state.buildings,
      [buildingId]: {
        id: buildingId,
        typeId,
        plotId,
        buildingLevel: 1,
        upgradingUntil: null,
      },
    };
    const nextPlots = state.world.plots.map((entry) =>
      entry.id === plotId ? { ...entry, buildingId } : entry
    );
    set({
      cash: state.cash - def.buildCost,
      buildings: nextBuildings,
      world: {
        ...state.world,
        plots: nextPlots,
        selectedPlotId: plotId,
      },
      ...appendUiEvent(state, event),
    });
  },
  startBuildingUpgrade: (buildingId: string) => {
    const state = get();
    const building = state.buildings[buildingId];
    if (!building) {
      return;
    }
    if (building.upgradingUntil) {
      return;
    }
    const hqLevel = getHqLevelForState(state);
    const queueSlots = getQueueSlotsForHq(hqLevel);
    if (state.buildQueue.active.length >= queueSlots) {
      return;
    }
    const def = BUILDING_BY_ID[building.typeId];
    const cost = getBuildingUpgradeCostForLevel(def, building.buildingLevel);
    if (state.cash < cost) {
      return;
    }
    const durationSec = getBuildingUpgradeTimeSecForLevel(building.buildingLevel);
    const finishAt = Date.now() + durationSec * 1000;
    const nextBuildings = {
      ...state.buildings,
      [buildingId]: {
        ...building,
        upgradingUntil: finishAt,
      },
    };
    const event = createUiEvent(
      "upgrade",
      "Upgrade started",
      BUILDING_BY_ID[building.typeId]?.name ?? "Building",
      undefined,
      Date.now()
    );
    set({
      cash: state.cash - cost,
      buildings: nextBuildings,
      buildQueue: {
        active: [...state.buildQueue.active, { buildingId, finishAt }],
      },
      ...appendUiEvent(state, event),
    });
  },
  processBuildQueue: (now: number) => {
    const state = get();
    if (state.buildQueue.active.length === 0) {
      return;
    }
    const sorted = [...state.buildQueue.active].sort((a, b) => a.finishAt - b.finishAt);
    const completed: BuildQueueItem[] = [];
    const remaining: BuildQueueItem[] = [];

    for (const item of sorted) {
      if (item.finishAt <= now) {
        completed.push(item);
      } else {
        remaining.push(item);
      }
    }

    if (completed.length === 0) {
      return;
    }

    let buildings = { ...state.buildings };
    let world = state.world;
    let buyMode = state.buyMode;

    for (const item of completed) {
      const building = buildings[item.buildingId];
      if (!building) {
        continue;
      }
      const nextLevel = building.buildingLevel + 1;
      buildings = {
        ...buildings,
        [item.buildingId]: {
          ...building,
          buildingLevel: nextLevel,
          upgradingUntil: null,
        },
      };

      if (building.typeId === "hq") {
        world = ensurePlotsForHqLevel(world, nextLevel);
        world = syncWorldBuildings(world, buildings);
        const allowed = getUnlockedBuyModesForHq(nextLevel);
        if (!allowed.includes(buyMode)) {
          buyMode = allowed[allowed.length - 1] ?? "x1";
        }
      }
    }

    set({
      buildings,
      world,
      buyMode,
      buildQueue: {
        active: remaining,
      },
    });
  },
});

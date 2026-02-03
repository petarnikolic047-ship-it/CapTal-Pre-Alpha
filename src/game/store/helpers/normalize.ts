import { BUSINESS_DEFS } from "../../economy";
import { BUILDING_BY_ID } from "../../base";
import type { BuildingInstance, BuildingTypeId, Plot } from "../../base";
import { PROJECT_BY_ID } from "../../projects";
import type { ProjectRun } from "../../projects";
import type { BuyMode, BusinessCoreState, BuildQueueState, WorldState } from "../types";
import { clampToInt } from "./numbers";
import {
  createDefaultBusinessState,
  createDefaultBuildings,
  createDefaultBusinesses,
  createDefaultWorld,
} from "./defaults";

export const normalizeWorld = (value: unknown): WorldState => {
  if (!value || typeof value !== "object") {
    return createDefaultWorld();
  }
  const raw = value as Record<string, unknown>;
  const plots = Array.isArray(raw.plots)
    ? raw.plots
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const plot = entry as Record<string, unknown>;
          if (typeof plot.id !== "string") {
            return null;
          }
          const x = typeof plot.x === "number" && Number.isFinite(plot.x) ? plot.x : 0;
          const y = typeof plot.y === "number" && Number.isFinite(plot.y) ? plot.y : 0;
          const buildingId =
            typeof plot.buildingId === "string" ? plot.buildingId : undefined;
          return { id: plot.id, x, y, buildingId } as Plot;
        })
        .filter((plot): plot is Plot => Boolean(plot))
    : createDefaultWorld().plots;
  return {
    plots,
    selectedPlotId:
      typeof raw.selectedPlotId === "string" ? raw.selectedPlotId : null,
  };
};

export const normalizeBuildings = (value: unknown): Record<string, BuildingInstance> => {
  if (!value || typeof value !== "object") {
    return createDefaultBuildings();
  }
  const result: Record<string, BuildingInstance> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const raw = entry as Record<string, unknown>;
    if (typeof raw.typeId !== "string" || !BUILDING_BY_ID[raw.typeId as BuildingTypeId]) {
      continue;
    }
    const plotId = typeof raw.plotId === "string" ? raw.plotId : "";
    const level =
      typeof raw.buildingLevel === "number" && Number.isFinite(raw.buildingLevel)
        ? Math.max(1, Math.floor(raw.buildingLevel))
        : 1;
    const upgradingUntil =
      typeof raw.upgradingUntil === "number" && Number.isFinite(raw.upgradingUntil)
        ? raw.upgradingUntil
        : null;
    result[key] = {
      id: key,
      typeId: raw.typeId as BuildingTypeId,
      plotId,
      buildingLevel: level,
      upgradingUntil,
    };
  }
  if (!result.hq) {
    result.hq = {
      id: "hq",
      typeId: "hq",
      plotId: "plot-1",
      buildingLevel: 1,
      upgradingUntil: null,
    };
  }
  return result;
};

export const normalizeBuildQueue = (value: unknown): BuildQueueState => {
  if (!value || typeof value !== "object") {
    return { active: [] };
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.active)) {
    return { active: [] };
  }
  const active = raw.active
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.buildingId !== "string") {
        return null;
      }
      const finishAt =
        typeof item.finishAt === "number" && Number.isFinite(item.finishAt)
          ? item.finishAt
          : 0;
      return { buildingId: item.buildingId, finishAt };
    })
    .filter((entry): entry is { buildingId: string; finishAt: number } => Boolean(entry));
  return { active };
};

export const normalizeBusinessState = (value: unknown): BusinessCoreState => {
  const base = createDefaultBusinessState();

  if (typeof value === "number" && Number.isFinite(value)) {
    base.count = Math.max(0, Math.floor(value));
    return base;
  }

  if (!value || typeof value !== "object") {
    return base;
  }

  const raw = value as Record<string, unknown>;
  base.count = clampToInt(raw.count, 0);
  if (typeof raw.managerOwned === "boolean") {
    base.managerOwned = raw.managerOwned;
  }
  if (typeof raw.running === "boolean") {
    base.running = raw.running;
  }
  if (typeof raw.endsAt === "number" && Number.isFinite(raw.endsAt)) {
    base.endsAt = raw.endsAt;
  }

  if (base.count <= 0) {
    base.running = false;
    base.endsAt = null;
  }

  if (!base.running || base.endsAt === null) {
    base.running = false;
    base.endsAt = null;
  }

  return base;
};

export const normalizeBusinesses = (value: unknown) => {
  const base = createDefaultBusinesses();
  if (!value || typeof value !== "object") {
    return base;
  }

  for (const def of BUSINESS_DEFS) {
    const raw = (value as Record<string, unknown>)[def.id];
    base[def.id] = normalizeBusinessState(raw);
  }

  return base;
};

export const normalizeBuyMode = (value: unknown): BuyMode => {
  if (value === "x1" || value === "x10" || value === "x100" || value === "max") {
    return value;
  }
  return "x1";
};

export const normalizeUpgrades = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value.filter((entry) => typeof entry === "string");
};

export const normalizeBulkBuys = (value: unknown) => clampToInt(value, 0);

export const normalizeProjectsStarted = (value: unknown) => clampToInt(value, 0);

export const normalizeCompletedProjects = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string" && PROJECT_BY_ID[entry]) {
      unique.add(entry);
    }
  }
  return Array.from(unique);
};

export const normalizeRunningProjects = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as ProjectRun[];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const raw = entry as Record<string, unknown>;
      if (typeof raw.id !== "string" || !PROJECT_BY_ID[raw.id]) {
        return null;
      }
      const startedAt =
        typeof raw.startedAt === "number" && Number.isFinite(raw.startedAt)
          ? raw.startedAt
          : 0;
      const endsAt =
        typeof raw.endsAt === "number" && Number.isFinite(raw.endsAt) ? raw.endsAt : 0;
      const cost = typeof raw.cost === "number" && Number.isFinite(raw.cost) ? raw.cost : 0;
      return {
        id: raw.id,
        startedAt,
        endsAt,
        cost,
      } as ProjectRun;
    })
    .filter((entry): entry is ProjectRun => Boolean(entry));
};

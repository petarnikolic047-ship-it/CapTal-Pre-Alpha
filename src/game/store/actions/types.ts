import type { StoreApi } from "zustand";
import type { GameStore } from "../types";

export type SetState = StoreApi<GameStore>["setState"];
export type GetState = StoreApi<GameStore>["getState"];

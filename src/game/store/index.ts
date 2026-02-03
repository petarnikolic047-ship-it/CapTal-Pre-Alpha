import { create } from "zustand";
import type { GameStore } from "./types";
import { createGameActions } from "./actions";
import { createInitialState } from "./initialState";
import { createGameSelectors } from "./selectors";
import { schedulePersist } from "./persistence";

const initialState = createInitialState();

export const useGameStore = create<GameStore>()((set, get) => ({
  ...initialState,
  ...createGameActions(set, get),
  ...createGameSelectors(get),
}));

useGameStore.subscribe((state) => {
  schedulePersist(state);
});

export type {
  BuyMode,
  BusinessState,
  TempBuff,
  UiEventKind,
  UiEvent,
  MilestoneInfo,
  BuyInfo,
} from "./types";

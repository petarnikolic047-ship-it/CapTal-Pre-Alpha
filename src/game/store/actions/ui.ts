import type { SetState } from "./types";

export const createUiActions = (set: SetState) => ({
  dismissUiEvent: (id: string) =>
    set((state) => ({
      uiEvents: state.uiEvents.filter((event) => event.id !== id),
    })),
});

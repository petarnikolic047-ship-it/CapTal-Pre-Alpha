import type { GameState, UiEvent, UiEventKind } from "../types";

export const createUiEvent = (
  kind: UiEventKind,
  title: string,
  detail: string | undefined,
  amount: number | undefined,
  now: number
): UiEvent => ({
  id: `${kind}-${now}-${Math.floor(Math.random() * 100000)}`,
  kind,
  title,
  detail,
  amount,
  at: now,
});

export const appendUiEvent = (state: GameState, event: UiEvent) => ({
  uiEvents: [event, ...state.uiEvents].slice(0, 6),
  lastUiEventAt: event.at,
});

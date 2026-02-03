import { BUSINESS_BY_ID, BUSINESS_DEFS } from "../../economy";
import type { BusinessId } from "../../economy";
import {
  DEFAULT_MANAGER_COST_MULT,
  MAX_CYCLE_CATCHUP,
  MIN_CYCLE_MS,
  TAP_BONUS_AMOUNT,
  TAP_BONUS_EVERY,
  TAP_PAY,
  UI_EVENT_MIN_GAP_MS,
} from "../constants";
import type { BusinessCoreState, GameState } from "../types";
import { createDefaultBusinessState } from "../helpers/defaults";
import { pruneExpiredBuffs } from "../helpers/buffs";
import { appendUiEvent, createUiEvent } from "../helpers/uiEvents";
import { getBuyInfo, getBusinessDerived, isBusinessUnlocked } from "../domain/business";
import { getUnlockedBuyModesForState } from "../domain/buildings";
import { hasAutoRunAll } from "../domain/projects";
import type { GetState, SetState } from "./types";

export const createBusinessActions = (set: SetState, get: GetState) => ({
  tapWork: () =>
    set((state) => {
      const nextTaps = state.workTaps + 1;
      const bonus = nextTaps % TAP_BONUS_EVERY === 0 ? TAP_BONUS_AMOUNT : 0;
      const earned = TAP_PAY + bonus;
      return {
        workTaps: nextTaps,
        cash: state.cash + earned,
        totalEarned: state.totalEarned + earned,
      };
    }),
  setBuyMode: (mode: GameState["buyMode"]) =>
    set((state) => {
      const allowed = getUnlockedBuyModesForState(state);
      if (!allowed.includes(mode)) {
        return state;
      }
      return { buyMode: mode };
    }),
  buyBusiness: (id: BusinessId) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const def = BUSINESS_BY_ID[id];
    const business = state.businesses[id];
    const buyInfo = getBuyInfo(state, id);

    if (buyInfo.quantity <= 0 || state.cash < buyInfo.cost) {
      return;
    }

    const nextCount = business.count + buyInfo.quantity;
    const nextBusinesses = {
      ...state.businesses,
      [id]: {
        ...business,
        count: nextCount,
      },
    } as Record<BusinessId, BusinessCoreState>;

    const derived = getBusinessDerived({ ...state, businesses: nextBusinesses }, def, nextCount);
    const shouldAutoStart =
      (business.managerOwned || hasAutoRunAll(state)) && !business.running && nextCount > 0;

    if (shouldAutoStart) {
      nextBusinesses[id] = {
        ...nextBusinesses[id],
        running: true,
        endsAt: Date.now() + derived.cycleTimeMs,
      };
    }

    const event = createUiEvent(
      "buy",
      "Units acquired",
      `${buyInfo.quantity} x ${def.name}`,
      undefined,
      Date.now()
    );

    set({
      cash: state.cash - buyInfo.cost,
      businesses: nextBusinesses,
      bulkBuys: state.bulkBuys + (buyInfo.quantity >= 10 ? 1 : 0),
      ...appendUiEvent(state, event),
    });
  },
  runBusiness: (id: BusinessId) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const business = state.businesses[id];
    if (business.count <= 0 || business.running) {
      return;
    }

    const def = BUSINESS_BY_ID[id];
    const derived = getBusinessDerived(state, def);
    const now = Date.now();

    set({
      businesses: {
        ...state.businesses,
        [id]: {
          ...business,
          running: true,
          endsAt: now + derived.cycleTimeMs,
        },
      },
    });
  },
  runAllBusinesses: () => {
    const state = get();
    const now = Date.now();
    let changed = false;
    const nextBusinesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

    for (const def of BUSINESS_DEFS) {
      if (!isBusinessUnlocked(state, def.id)) {
        continue;
      }
      const business = state.businesses[def.id];
      if (business.running || business.count <= 0) {
        continue;
      }
      const derived = getBusinessDerived(state, def);
      nextBusinesses[def.id] = {
        ...business,
        running: true,
        endsAt: now + derived.cycleTimeMs,
      };
      changed = true;
    }

    if (changed) {
      set({ businesses: nextBusinesses });
    }
  },
  hireManager: (id: BusinessId) => {
    const state = get();
    if (!isBusinessUnlocked(state, id)) {
      return;
    }
    const def = BUSINESS_BY_ID[id];
    const business = state.businesses[id];
    if (business.managerOwned) {
      return;
    }

    const cost = def.baseCost * (def.managerCostMult ?? DEFAULT_MANAGER_COST_MULT);
    if (state.cash < cost) {
      return;
    }

    const derived = getBusinessDerived(state, def);
    const now = Date.now();
    const shouldAutoStart = business.count > 0 && !business.running;
    const event = createUiEvent("manager", "Handler assigned", def.name, undefined, now);

    set({
      cash: state.cash - cost,
      businesses: {
        ...state.businesses,
        [id]: {
          ...business,
          managerOwned: true,
          running: shouldAutoStart ? true : business.running,
          endsAt: shouldAutoStart ? now + derived.cycleTimeMs : business.endsAt,
        },
      },
      ...appendUiEvent(state, event),
    });
  },
  depositSafe: (amount: number) =>
    set((state) => {
      const value = Math.min(amount, state.cash);
      if (value <= 0) {
        return state;
      }
      return {
        cash: state.cash - value,
        safeCash: state.safeCash + value,
      };
    }),
  withdrawSafe: (amount: number) =>
    set((state) => {
      const value = Math.min(amount, state.safeCash);
      if (value <= 0) {
        return state;
      }
      return {
        cash: state.cash + value,
        safeCash: state.safeCash - value,
      };
    }),
  processBusinessCycles: (now: number) => {
    const state = get();
    const activeBuffs = pruneExpiredBuffs(state.activeBuffs, now);
    const buffsChanged = activeBuffs.length !== state.activeBuffs.length;
    const stateForCalc = buffsChanged ? { ...state, activeBuffs } : state;
    const autoRunAll = hasAutoRunAll(stateForCalc);
    let cash = Number.isFinite(state.cash) ? state.cash : 0;
    let totalEarned = Number.isFinite(state.totalEarned) ? state.totalEarned : cash;
    let earnedThisTick = 0;
    let changed = buffsChanged;
    const nextBusinesses: Record<BusinessId, BusinessCoreState> = { ...state.businesses };

    for (const def of BUSINESS_DEFS) {
      const rawBusiness = state.businesses[def.id];
      const business = rawBusiness ?? createDefaultBusinessState();
      const count =
        typeof business.count === "number" && Number.isFinite(business.count)
          ? Math.max(0, Math.floor(business.count))
          : 0;
      let running = Boolean(business.running);
      let endsAt = business.endsAt;

      if (count <= 0) {
        if (business.running || business.endsAt !== null || !rawBusiness) {
          nextBusinesses[def.id] = {
            ...business,
            count,
            running: false,
            endsAt: null,
          };
          changed = true;
        }
        continue;
      }

      const derived = getBusinessDerived(stateForCalc, def);
      const cycleTimeMs = Number.isFinite(derived.cycleTimeMs)
        ? derived.cycleTimeMs
        : MIN_CYCLE_MS;
      const profitPerCycle = Number.isFinite(derived.profitPerCycle) ? derived.profitPerCycle : 0;
      const shouldAutoRun = business.managerOwned || autoRunAll;

      if (!Number.isFinite(endsAt ?? NaN)) {
        endsAt = null;
      }

      if (shouldAutoRun && (!running || endsAt === null)) {
        running = true;
        endsAt = now + cycleTimeMs;
      } else if (!shouldAutoRun && !running) {
        endsAt = null;
      }

      if (running && endsAt !== null && endsAt <= now) {
        if (shouldAutoRun) {
          let loops = 0;
          while (endsAt !== null && endsAt <= now && loops < MAX_CYCLE_CATCHUP) {
            cash += profitPerCycle;
            totalEarned += profitPerCycle;
            earnedThisTick += profitPerCycle;
            endsAt += cycleTimeMs;
            loops += 1;
          }
          if (endsAt !== null && endsAt <= now) {
            endsAt = now + cycleTimeMs;
          }
          running = true;
        } else {
          cash += profitPerCycle;
          totalEarned += profitPerCycle;
          earnedThisTick += profitPerCycle;
          running = false;
          endsAt = null;
        }
      }

      if (
        running !== business.running ||
        endsAt !== business.endsAt ||
        count !== business.count ||
        !rawBusiness
      ) {
        nextBusinesses[def.id] = {
          ...business,
          count,
          running,
          endsAt,
        };
        changed = true;
      }
    }

    const shouldToast = earnedThisTick > 0 && now - state.lastUiEventAt > UI_EVENT_MIN_GAP_MS;
    const event = shouldToast
      ? createUiEvent("cash", "Cycle payout", "Liquidity captured", earnedThisTick, now)
      : null;

    if (changed || cash !== state.cash || totalEarned !== state.totalEarned || event) {
      set({
        cash,
        totalEarned,
        businesses: nextBusinesses,
        activeBuffs: buffsChanged ? activeBuffs : state.activeBuffs,
        ...(event ? appendUiEvent(state, event) : {}),
      });
    }
  },
});

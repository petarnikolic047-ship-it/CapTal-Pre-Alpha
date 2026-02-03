import { useGameStore } from "../src/game/store";

const store = useGameStore;
const now = Date.now();
const later = now + 60_000;

store.getState().syncOfflineProgress(later);
store.getState().processBusinessCycles(later);
store.getState().processWarTick(later);

const state = store.getState();

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const isNonNegFinite = (value: number) => Number.isFinite(value) && value >= 0;

assert(isNonNegFinite(state.cash), "cash must be finite and non-negative");
assert(isNonNegFinite(state.safeCash), "safeCash must be finite and non-negative");
assert(isNonNegFinite(state.totalEarned), "totalEarned must be finite and non-negative");

for (const [id, business] of Object.entries(state.businesses)) {
  assert(
    Number.isInteger(business.count) && business.count >= 0,
    `business count invalid for ${id}`
  );
}

for (const [id, building] of Object.entries(state.buildings)) {
  assert(
    Number.isInteger(building.buildingLevel) && building.buildingLevel >= 0,
    `building level invalid for ${id}`
  );
}

assert(Number.isInteger(state.workTaps) && state.workTaps >= 0, "workTaps invalid");
assert(Number.isInteger(state.bulkBuys) && state.bulkBuys >= 0, "bulkBuys invalid");
assert(
  Number.isInteger(state.projectsStarted) && state.projectsStarted >= 0,
  "projectsStarted invalid"
);

console.log("smoke-store: ok");

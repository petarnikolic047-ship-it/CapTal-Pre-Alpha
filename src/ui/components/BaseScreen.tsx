import { useMemo } from "react";

import type { BuyMode, BusinessState } from "../../game/store";
import type { BusinessId } from "../../game/economy";
import { BUSINESS_DEFS } from "../../game/economy";
import { useGameStore } from "../../game/store";
import {
  BUILDING_BY_ID,
  BUILDING_DEFS,
  getHqConfig,
  getUnlockedBuildingIdsForHq,
  getUnlockedBuyModesForHq,
} from "../../game/base";
import type { BuildingInstance } from "../../game/base";
import { formatDuration, formatMoney, formatMultiplier } from "../../game/format";
import BuyModeToggle from "./BuyModeToggle";
type BaseScreenProps = {
  now: number;
  buyMode: BuyMode;
  cash: number;
};

const BaseScreen = ({ now, buyMode, cash }: BaseScreenProps) => {
  const world = useGameStore((state) => state.world);
  const buildings = useGameStore((state) => state.buildings);
  const buildQueue = useGameStore((state) => state.buildQueue);
  const setBuyMode = useGameStore((state) => state.setBuyMode);
    const selectPlot = useGameStore((state) => state.selectPlot);
  const placeBuilding = useGameStore((state) => state.placeBuilding);
  const startBuildingUpgrade = useGameStore((state) => state.startBuildingUpgrade);
  const buyBusiness = useGameStore((state) => state.buyBusiness);
  const runBusiness = useGameStore((state) => state.runBusiness);
  const hireManager = useGameStore((state) => state.hireManager);
  const getBusinessState = useGameStore((state) => state.getBusinessState);
  const getBusinessProfitPerCycle = useGameStore((state) => state.getBusinessProfitPerCycle);
  const getBusinessCycleTimeMs = useGameStore((state) => state.getBusinessCycleTimeMs);
  const getBusinessNextCost = useGameStore((state) => state.getBusinessNextCost);
  const getBusinessBuyInfo = useGameStore((state) => state.getBusinessBuyInfo);
  const getManagerCost = useGameStore((state) => state.getManagerCost);
  const getNextMilestone = useGameStore((state) => state.getNextMilestone);
  const queueSlots = useGameStore((state) => state.getBuildQueueSlots());
  const getBuildingUpgradeCost = useGameStore((state) => state.getBuildingUpgradeCost);
  const getBuildingUpgradeTimeSec = useGameStore((state) => state.getBuildingUpgradeTimeSec);

  const hqLevel = buildings.hq?.buildingLevel ?? 1;
  const allowedBuyModes = useMemo(() => getUnlockedBuyModesForHq(hqLevel), [hqLevel]);
  const unlockedBuildingIds = useMemo(
    () => getUnlockedBuildingIdsForHq(hqLevel),
    [hqLevel]
  );
  const availableBuildings = useMemo(
    () =>
      BUILDING_DEFS.filter(
        (def) => def.id !== "hq" && unlockedBuildingIds.includes(def.id)
      ),
    [unlockedBuildingIds]
  );
  const builtTypeIds = useMemo(
    () => new Set(Object.values(buildings).map((building) => building.typeId)),
    [buildings]
  );

  const selectedPlot = world.plots.find((plot) => plot.id === world.selectedPlotId) ?? null;
  const selectedBuilding =
    selectedPlot && selectedPlot.buildingId ? buildings[selectedPlot.buildingId] : null;

  const queueCount = buildQueue.active.length;
  const hqConfig = getHqConfig(hqLevel);
  const nextHqConfig = getHqConfig(hqLevel + 1);

  return (
    <section className="base-screen">
      <div className="base-hud">
        <div className="base-hud-title">Buy Mode</div>
        <div className="base-hud-actions">
          <BuyModeToggle value={buyMode} onChange={setBuyMode} allowedModes={allowedBuyModes} />
        </div>
      </div>

      <div className="base-grid">
        {world.plots.map((plot) => {
          const building = plot.buildingId ? buildings[plot.buildingId] : null;
          const def = building ? BUILDING_BY_ID[building.typeId] : null;
          const selected = plot.id === world.selectedPlotId;
          const upgradeRemaining =
            building && building.upgradingUntil ? Math.max(0, building.upgradingUntil - now) : 0;
          const businessId = def?.businessId;
          const business = businessId ? getBusinessState(businessId) : null;
          const cycleTimeMs = businessId ? getBusinessCycleTimeMs(businessId) : 0;
          const runningProgress = (() => {
            if (!business || !business.running || !business.endsAt || cycleTimeMs <= 0) {
              return 0;
            }
            const remainingRaw = business.endsAt - now;
            let remaining = remainingRaw;
            if (remaining < 0) {
              const overshoot = Math.abs(remaining) % cycleTimeMs;
              remaining = cycleTimeMs - overshoot;
            }
            const clampedRemaining = Math.min(Math.max(remaining, 0), cycleTimeMs);
            return 1 - clampedRemaining / cycleTimeMs;
          })();
          const status = upgradeRemaining > 0
            ? "upgrading"
            : business && business.count > 0 && business.running
            ? "running"
            : business && business.count > 0
            ? "ready"
            : "idle";
          return (
            <button
              key={plot.id}
              type="button"
              className={`plot-tile ${selected ? "selected" : ""} ${
                building ? "occupied" : "empty"
              } ${status}`}
              onClick={() => selectPlot(selected ? null : plot.id)}
            >
              {building && def ? (
                <>
                  <div className="plot-label">{def.name}</div>
                  <div className="plot-level">Lv {building.buildingLevel}</div>
                  <div className="tile-status">
                    {status === "running" && (
                      <div
                        className="tile-ring"
                        style={{
                          ["--progress" as string]: `${Math.round(
                            Math.min(Math.max(runningProgress, 0), 1) * 100
                          )}%`,
                        }}
                      />
                    )}
                    {status === "ready" && <div className="tile-badge ready">$</div>}
                    {status === "upgrading" && (
                      <div className="tile-badge upgrading">
                        UPG {formatDuration(upgradeRemaining)}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="plot-label">Empty</div>
              )}
            </button>
          );
        })}
      </div>

      {selectedPlot && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() => selectPlot(null)}
        >
          <div
            className="base-panel bottom-sheet"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="base-panel-header">
            <div>
              <h2>
                {selectedBuilding
                  ? BUILDING_BY_ID[selectedBuilding.typeId].name
                  : "Build"}
              </h2>
              {selectedBuilding && (
                <div className="base-panel-subtitle">
                  Level {selectedBuilding.buildingLevel}
                </div>
              )}
            </div>
            <button
              className="panel-close"
              type="button"
              onClick={() => selectPlot(null)}
            >
              Close
            </button>
          </div>

          {!selectedBuilding ? (
            <div className="build-menu">
              {availableBuildings.map((def) => {
                const alreadyBuilt = builtTypeIds.has(def.id);
                const canAfford = cash >= def.buildCost;
                const disabled = alreadyBuilt || !canAfford;
                return (
                  <div className="build-card" key={def.id}>
                    <div>
                      <div className="build-name">{def.name}</div>
                      <div className="build-meta">
                        Cost: {formatMoney(def.buildCost)}
                      </div>
                    </div>
                    <button
                      className="build-button"
                      type="button"
                      disabled={disabled}
                      onClick={() => placeBuilding(selectedPlot.id, def.id)}
                    >
                      {alreadyBuilt ? "Built" : "Build"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : selectedBuilding.typeId === "hq" ? (
            <div className="building-panel">
              <div className="building-info">
                <div className="building-row">
                  <span>Plots unlocked</span>
                  <span>{hqConfig.plots}</span>
                </div>
                <div className="building-row">
                  <span>Queue slots</span>
                  <span>{hqConfig.queueSlots}</span>
                </div>
              </div>
              <div className="building-upgrade">
                <div className="upgrade-meta">
                  Next level unlocks {nextHqConfig.plots} plots
                </div>
                <div className="upgrade-meta">
                  Upgrade time: {formatDuration(getBuildingUpgradeTimeSec(selectedBuilding.id) * 1000)}
                </div>
                <button
                  className="upgrade-button"
                  type="button"
                  disabled={
                    selectedBuilding.upgradingUntil !== null ||
                    queueCount >= queueSlots ||
                    cash < getBuildingUpgradeCost(selectedBuilding.id)
                  }
                  onClick={() => startBuildingUpgrade(selectedBuilding.id)}
                >
                  Upgrade Head Office ({formatMoney(getBuildingUpgradeCost(selectedBuilding.id))})
                </button>
                {selectedBuilding.upgradingUntil && (
                  <div className="upgrade-progress">
                    Finishes in {formatDuration(selectedBuilding.upgradingUntil - now)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <BusinessPanel
              building={selectedBuilding}
              buyMode={buyMode}
              cash={cash}
              now={now}
              queueSlots={queueSlots}
              queueCount={queueCount}
              getBusinessState={getBusinessState}
              getBusinessProfitPerCycle={getBusinessProfitPerCycle}
              getBusinessCycleTimeMs={getBusinessCycleTimeMs}
              getBusinessNextCost={getBusinessNextCost}
              getBusinessBuyInfo={getBusinessBuyInfo}
              getManagerCost={getManagerCost}
              getNextMilestone={getNextMilestone}
              getBuildingUpgradeCost={getBuildingUpgradeCost}
              getBuildingUpgradeTimeSec={getBuildingUpgradeTimeSec}
              onBuy={buyBusiness}
              onRun={runBusiness}
              onHireManager={hireManager}
              onUpgrade={startBuildingUpgrade}
            />
          )}
        </div>
        </div>
      )}
    </section>
  );
};

type BusinessPanelProps = {
  building: BuildingInstance;
  buyMode: BuyMode;
  cash: number;
  now: number;
  queueSlots: number;
  queueCount: number;
  getBusinessState: (id: BusinessId) => BusinessState;
  getBusinessProfitPerCycle: (id: BusinessId) => number;
  getBusinessCycleTimeMs: (id: BusinessId) => number;
  getBusinessNextCost: (id: BusinessId) => number;
  getBusinessBuyInfo: (id: BusinessId) => { quantity: number; cost: number };
  getManagerCost: (id: BusinessId) => number;
  getNextMilestone: (id: BusinessId) => { count: number; mult: number } | null;
  getBuildingUpgradeCost: (id: string) => number;
  getBuildingUpgradeTimeSec: (id: string) => number;
  onBuy: (id: BusinessId) => void;
  onRun: (id: BusinessId) => void;
  onHireManager: (id: BusinessId) => void;
  onUpgrade: (id: string) => void;
};

const BusinessPanel = ({
  building,
  buyMode,
  cash,
  now,
  queueSlots,
  queueCount,
  getBusinessState,
  getBusinessProfitPerCycle,
  getBusinessCycleTimeMs,
  getBusinessNextCost,
  getBusinessBuyInfo,
  getManagerCost,
  getNextMilestone,
  getBuildingUpgradeCost,
  getBuildingUpgradeTimeSec,
  onBuy,
  onRun,
  onHireManager,
  onUpgrade,
}: BusinessPanelProps) => {
  const def = BUILDING_BY_ID[building.typeId];
  const businessId = def.businessId;
  if (!businessId) {
    return null;
  }
  const businessDef = BUSINESS_DEFS.find((entry) => entry.id === businessId);

  const business = getBusinessState(businessId);
  const profitPerCycle = getBusinessProfitPerCycle(businessId);
  const cycleTimeMs = getBusinessCycleTimeMs(businessId);
  const nextCost = getBusinessNextCost(businessId);
  const buyInfo = getBusinessBuyInfo(businessId);
  const managerCost = getManagerCost(businessId);
  const nextMilestone = getNextMilestone(businessId);

  const progress = (() => {
    if (!business.running || !business.endsAt || cycleTimeMs <= 0) {
      return 0;
    }
    const remainingRaw = business.endsAt - now;
    let remaining = remainingRaw;
    if (remaining < 0) {
      const overshoot = Math.abs(remaining) % cycleTimeMs;
      remaining = cycleTimeMs - overshoot;
    }
    const clampedRemaining = Math.min(Math.max(remaining, 0), cycleTimeMs);
    return 1 - clampedRemaining / cycleTimeMs;
  })();

  const upgradeCost = getBuildingUpgradeCost(building.id);
  const upgradeTimeSec = getBuildingUpgradeTimeSec(building.id);
  const queueFull = queueCount >= queueSlots;
  const canUpgrade = !building.upgradingUntil && !queueFull && cash >= upgradeCost;
  const canBuy = buyInfo.quantity > 0 && cash >= buyInfo.cost;
  const canRun = !business.running && business.count > 0 && !business.managerOwned;

  const buyLabel = buyMode === "max"
    ? `BUY MAX (${formatMoney(buyInfo.cost)})`
    : buyMode === "x1"
    ? `BUY (${formatMoney(buyInfo.cost)})`
    : `BUY ${buyMode.toUpperCase()} (${formatMoney(buyInfo.cost)})`;

  const primaryAction = canRun
    ? {
        label: "RUN",
        onClick: () => onRun(businessId),
        disabled: false,
      }
    : building.upgradingUntil
    ? {
        label: "UPGRADING",
        onClick: () => {},
        disabled: true,
      }
    : canUpgrade
    ? {
        label: `UPGRADE (${formatMoney(upgradeCost)})`,
        onClick: () => onUpgrade(building.id),
        disabled: false,
      }
    : {
        label: buyLabel,
        onClick: () => onBuy(businessId),
        disabled: !canBuy,
      };

  const secondaryActions = [
    {
      key: "buy",
      label: buyLabel,
      onClick: () => onBuy(businessId),
      disabled: !canBuy,
      show: primaryAction.label !== buyLabel,
    },
    {
      key: "upgrade",
      label: `Upgrade (${formatMoney(upgradeCost)})`,
      onClick: () => onUpgrade(building.id),
      disabled: !canUpgrade,
      show: primaryAction.label.indexOf("UPGRADE") === -1,
    },
    {
      key: "manager",
      label: business.managerOwned ? "Handler Assigned" : `Handler (${formatMoney(managerCost)})`,
      onClick: () => onHireManager(businessId),
      disabled: cash < managerCost || business.managerOwned,
      show: true,
    },
  ].filter((action) => action.show);

  return (
    <div className="building-panel">
      <div className="building-info">
        {businessDef && <div className="building-blurb">{businessDef.description}</div>}
        <div className="building-power">
          Earns {formatMoney(profitPerCycle)} / cycle
        </div>
        <div className="building-row">
          <span>Cycle time</span>
          <span>{formatDuration(cycleTimeMs)}</span>
        </div>
        <div className="building-row">
          <span>Owned units</span>
          <span>{business.count}</span>
        </div>
        {nextMilestone && (
          <div className="building-row">
            <span>Next milestone</span>
            <span>
              {nextMilestone.count} → {formatMultiplier(nextMilestone.mult)} profit
            </span>
          </div>
        )}
      </div>

      {business.running && (
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="progress-text">Running {Math.round(progress * 100)}%</div>
        </div>
      )}

      <div className="primary-action">
        <button
          className="primary-button"
          type="button"
          disabled={primaryAction.disabled}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </button>
        <div className="primary-sub">
          Next cost {formatMoney(nextCost)}
        </div>
        {queueFull && <div className="primary-sub">Upgrade queue full</div>}
        {upgradeTimeSec > 0 && (
          <div className="primary-sub">Upgrade time {formatDuration(upgradeTimeSec * 1000)}</div>
        )}
      </div>

      <div className="secondary-actions">
        {secondaryActions.map((action) => (
          <button
            key={action.key}
            className="secondary-button"
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>

      {building.upgradingUntil && (
        <div className="upgrade-progress">
          Upgrade finishes in {formatDuration(building.upgradingUntil - now)}
        </div>
      )}
    </div>
  );
};

export default BaseScreen;






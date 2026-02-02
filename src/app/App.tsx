import { useEffect, useMemo, useState } from "react";

import { BUSINESS_DEFS } from "../game/economy";
import type { BusinessId } from "../game/economy";
import {
  BUILDING_BY_ID,
  BUILDING_DEFS,
  getHqConfig,
  getQueueSlotsForHq,
  getUnlockedBuildingIdsForHq,
} from "../game/base";
import { formatDuration, formatMoney, formatMultiplier } from "../game/format";
import {
  getAvailableProjects,
  getProjectCost,
  getProjectSlots,
} from "../game/projects";
import { UPGRADE_BY_ID } from "../game/upgrades";
import { useGameStore } from "../game/store";
import BaseScreen from "../ui/components/BaseScreen";
import BusinessCard from "../ui/components/BusinessCard";
import BuyModeToggle from "../ui/components/BuyModeToggle";
import GoalsBar from "../ui/components/GoalsBar";
import NextActionBar from "../ui/components/NextActionBar";
import ProjectsPanel from "../ui/components/ProjectsPanel";
import SafePanel from "../ui/components/SafePanel";
import StatBar from "../ui/components/StatBar";
import UpgradesPanel from "../ui/components/UpgradesPanel";
import WarRoom from "../ui/components/WarRoom";
import WorkButton from "../ui/components/WorkButton";
import type { GoalContext } from "../game/goals";
import { getGoalProgress } from "../game/goals";

type BuyFeedback = Partial<Record<BusinessId, { qty: number; at: number }>>;

const App = () => {
  const cash = useGameStore((state) => state.cash);
  const incomePerSec = useGameStore((state) => state.getIncomePerSecTotal());
  const buyMode = useGameStore((state) => state.buyMode);
  const tapWork = useGameStore((state) => state.tapWork);
  const setBuyMode = useGameStore((state) => state.setBuyMode);
  const buyBusiness = useGameStore((state) => state.buyBusiness);
  const runBusiness = useGameStore((state) => state.runBusiness);
  const runAllBusinesses = useGameStore((state) => state.runAllBusinesses);
  const hireManager = useGameStore((state) => state.hireManager);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const startProject = useGameStore((state) => state.startProject);
  const getBusinessState = useGameStore((state) => state.getBusinessState);
  const getBusinessNextCost = useGameStore((state) => state.getBusinessNextCost);
  const getBusinessProfitPerCycle = useGameStore((state) => state.getBusinessProfitPerCycle);
  const getBusinessCycleTimeMs = useGameStore((state) => state.getBusinessCycleTimeMs);
  const getBusinessBuyInfo = useGameStore((state) => state.getBusinessBuyInfo);
  const getManagerCost = useGameStore((state) => state.getManagerCost);
  const getNextMilestone = useGameStore((state) => state.getNextMilestone);
  const unlockedBuyModes = useGameStore((state) => state.getUnlockedBuyModes());
  const businesses = useGameStore((state) => state.businesses);
  const buildings = useGameStore((state) => state.buildings);
  const buildQueue = useGameStore((state) => state.buildQueue);
  const world = useGameStore((state) => state.world);
  const bulkBuys = useGameStore((state) => state.bulkBuys);
  const purchasedUpgradesCount = useGameStore((state) => state.purchasedUpgrades.length);
  const projectsStarted = useGameStore((state) => state.projectsStarted);
  const getBuildingUpgradeCost = useGameStore((state) => state.getBuildingUpgradeCost);
  const getBuildingUpgradeTimeSec = useGameStore((state) => state.getBuildingUpgradeTimeSec);
  const hqLevel = useGameStore((state) => state.getHqLevel());
  const totalEarned = useGameStore((state) => state.totalEarned);
  const safeCash = useGameStore((state) => state.safeCash);
  const upgradeOffers = useGameStore((state) => state.upgradeOffers);
  const lastOfferRefreshAt = useGameStore((state) => state.lastOfferRefreshAt);
  const activeGoals = useGameStore((state) => state.activeGoals);
  const depositSafe = useGameStore((state) => state.depositSafe);
  const withdrawSafe = useGameStore((state) => state.withdrawSafe);
  const theftThreshold = useGameStore((state) => state.getTheftThreshold());
  const runningProjects = useGameStore((state) => state.runningProjects);
  const completedProjects = useGameStore((state) => state.completedProjects);

  const [now, setNow] = useState(() => Date.now());
  const [buyFeedback, setBuyFeedback] = useState<BuyFeedback>(() => ({}));
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [activeScreen, setActiveScreen] = useState<"base" | "market" | "war">("base");
  const [showGoals, setShowGoals] = useState(false);
  const [showSafe, setShowSafe] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let lastUiUpdate = 0;

    const tick = () => {
      const current = Date.now();
      const store = useGameStore.getState();
      store.processBusinessCycles(current);
      store.processBuildQueue(current);
      store.processProjectCompletions(current);
      store.processGoals(current);
      store.processUpgradeOffers(current);
      store.processRiskEvents(current);
      store.processWarTick(current);
      if (current - lastUiUpdate > 120) {
        lastUiUpdate = current;
        setNow(current);
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const sync = () => useGameStore.getState().syncOfflineProgress(Date.now());
    const markSeen = () => useGameStore.getState().markSeen(Date.now());

    sync();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync();
      } else {
        markSeen();
      }
    };

    window.addEventListener("focus", sync);
    window.addEventListener("pagehide", markSeen);
    window.addEventListener("beforeunload", markSeen);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("pagehide", markSeen);
      window.removeEventListener("beforeunload", markSeen);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const marketBusinessDefs = useMemo(() => BUSINESS_DEFS, []);

  const canRunAll = marketBusinessDefs.some((def) => {
    const business = getBusinessState(def.id);
    return business.count > 0 && !business.running;
  });

  const upgradeOfferDefs = useMemo(
    () => upgradeOffers.flatMap((id) => (UPGRADE_BY_ID[id] ? [UPGRADE_BY_ID[id]] : [])),
    [upgradeOffers]
  );
  const offerRefreshIn = Math.max(0, 90_000 - (now - lastOfferRefreshAt));
  const theftRisk = cash > theftThreshold;
  const projectSlots = useMemo(() => getProjectSlots(), []);
  const availableProjects = useMemo(
    () => getAvailableProjects(completedProjects, runningProjects, totalEarned, hqLevel),
    [completedProjects, runningProjects, totalEarned, hqLevel]
  );

  const goalContext: GoalContext = useMemo(() => {
    const counts = BUSINESS_DEFS.reduce((acc, def) => {
      acc[def.id] = businesses[def.id]?.count ?? 0;
      return acc;
    }, {} as Record<BusinessId, number>);
    const managersOwned = BUSINESS_DEFS.reduce((acc, def) => {
      acc[def.id] = Boolean(businesses[def.id]?.managerOwned);
      return acc;
    }, {} as Record<BusinessId, boolean>);
    const buildingLevels = Object.values(buildings).reduce((acc, building) => {
      const current = acc[building.typeId] ?? 0;
      acc[building.typeId] = Math.max(current, building.buildingLevel);
      return acc;
    }, {} as Record<keyof typeof BUILDING_BY_ID, number>);
    const buildingsBuiltCount = Object.values(buildings).filter(
      (building) => building.typeId !== "hq"
    ).length;
    const nextHqConfig = getHqConfig(hqLevel + 1);
    const hqTargetLevel = nextHqConfig.level > hqLevel ? nextHqConfig.level : null;
    const unlockedBuildingIds = getUnlockedBuildingIdsForHq(hqLevel);
    const builtTypes = new Set(Object.values(buildings).map((building) => building.typeId));
    const emptyPlots = world.plots.filter((plot) => !plot.buildingId).length;
    const unbuiltBuildingTypes =
      emptyPlots > 0
        ? unlockedBuildingIds.filter(
            (id) => id !== "hq" && !builtTypes.has(id)
          )
        : [];
    const bulkBuyUnlocked = unlockedBuyModes.some(
      (mode) => mode === "x10" || mode === "x100" || mode === "max"
    );

    return {
      counts,
      managersOwned,
      bulkBuys,
      purchasedUpgradesCount,
      projectsStartedCount: projectsStarted,
      buildingLevels,
      buildingsBuiltCount,
      hqLevel,
      unbuiltBuildingTypes,
      bulkBuyUnlocked,
      hqTargetLevel,
      canStartProject: availableProjects.length > 0 && runningProjects.length < projectSlots,
    };
  }, [
    availableProjects.length,
    buildings,
    bulkBuys,
    businesses,
    hqLevel,
    projectSlots,
    projectsStarted,
    purchasedUpgradesCount,
    runningProjects.length,
    unlockedBuyModes,
    world,
  ]);
  const goalsAlert = useMemo(() => {
    return activeGoals.some((goal) => {
      const progress = getGoalProgress(goal, goalContext);
      if (progress.target <= 0) {
        return false;
      }
      const ratio = progress.current / progress.target;
      return ratio >= 0.8 && progress.current < progress.target;
    });
  }, [activeGoals, goalContext]);
  const safeAlert = cash >= theftThreshold * 0.9;

  const nextAction = useMemo(() => {
    const hq = buildings.hq;
    const hqLevel = hq?.buildingLevel ?? 1;
    const hqConfig = getHqConfig(hqLevel);
    const nextHqConfig = getHqConfig(hqLevel + 1);
    const queueSlots = getQueueSlotsForHq(hqLevel);
    const queueCount = buildQueue.active.length;

    const builtTypes = new Set(Object.values(buildings).map((building) => building.typeId));
    const unlockedBuildingIds = getUnlockedBuildingIdsForHq(hqLevel);
    const unbuilt = BUILDING_DEFS.filter(
      (def) => def.id !== "hq" && unlockedBuildingIds.includes(def.id) && !builtTypes.has(def.id)
    ).sort((a, b) => a.buildCost - b.buildCost);

    if (unbuilt.length > 0) {
      const def = unbuilt[0];
      const canAfford = cash >= def.buildCost;
      return {
        title: `${canAfford ? "Build" : "Save for"} ${def.name}`,
        detail: `Cost ${formatMoney(def.buildCost)}`,
      };
    }

    if (hq && !hq.upgradingUntil && nextHqConfig.level > hqLevel && queueCount < queueSlots) {
      const cost = getBuildingUpgradeCost("hq");
      const duration = getBuildingUpgradeTimeSec("hq") * 1000;
      const newPlots = nextHqConfig.plots - hqConfig.plots;
      const newBuildings = nextHqConfig.unlockedBuildingIds.filter(
        (id) => !hqConfig.unlockedBuildingIds.includes(id)
      );
      const newQueueSlots = nextHqConfig.queueSlots - hqConfig.queueSlots;
      const newBuyModes = nextHqConfig.buyModeUnlocks.filter(
        (mode) => !hqConfig.buyModeUnlocks.includes(mode)
      );
      const unlockParts: string[] = [];
      if (newPlots > 0) {
        unlockParts.push(`${newPlots} plot${newPlots === 1 ? "" : "s"}`);
      }
      if (newBuildings.length > 0) {
        unlockParts.push(
          `unlock ${newBuildings.map((id) => BUILDING_BY_ID[id].name).join(", ")}`
        );
      }
      if (newQueueSlots > 0) {
        unlockParts.push(`+${newQueueSlots} queue slot${newQueueSlots === 1 ? "" : "s"}`);
      }
      if (newBuyModes.length > 0) {
        unlockParts.push(`${newBuyModes.map((mode) => mode.toUpperCase()).join(" / ")} buy`);
      }
      return {
        title: `${cash >= cost ? "Upgrade" : "Save for"} HQ to L${hqLevel + 1}`,
        detail: `${formatMoney(cost)} · ${formatDuration(duration)} → ${
          unlockParts.length > 0 ? unlockParts.join(" + ") : "new unlocks"
        }`,
      };
    }

    const managerTarget = BUSINESS_DEFS.find((def) => {
      const business = businesses[def.id];
      return business && business.count > 0 && !business.managerOwned;
    });
    if (managerTarget) {
      const cost = getManagerCost(managerTarget.id);
      return {
        title: `${cash >= cost ? "Hire" : "Save for"} ${managerTarget.name} manager`,
        detail: `${formatMoney(cost)} · auto-runs cycles`,
      };
    }

    const milestoneTargets = BUSINESS_DEFS.map((def) => {
      const business = businesses[def.id];
      const nextMilestone = getNextMilestone(def.id);
      if (!business || business.count <= 0 || !nextMilestone) {
        return null;
      }
      const missing = nextMilestone.count - business.count;
      if (missing <= 0) {
        return null;
      }
      return {
        def,
        missing,
        nextMilestone,
      };
    }).filter((entry): entry is { def: (typeof BUSINESS_DEFS)[number]; missing: number; nextMilestone: { count: number; mult: number } } =>
      Boolean(entry)
    );

    if (milestoneTargets.length > 0) {
      milestoneTargets.sort((a, b) => a.missing - b.missing);
      const target = milestoneTargets[0];
      return {
        title: `Buy ${target.missing} ${target.def.name} to reach ${target.nextMilestone.count} owned`,
        detail: `→ ${formatMultiplier(target.nextMilestone.mult)} profit`,
      };
    }

    if (availableProjects.length > 0 && runningProjects.length < projectSlots) {
      const project = availableProjects[0];
      const cost = getProjectCost(incomePerSec, project);
      return {
        title: `${cash >= cost ? "Start" : "Save for"} project: ${project.name}`,
        detail: `${formatMoney(cost)} · ${formatDuration(project.durationMs)}`,
      };
    }

    const idleBusiness = BUSINESS_DEFS.find((def) => {
      const business = businesses[def.id];
      return business && business.count > 0 && !business.managerOwned && !business.running;
    });
    if (idleBusiness) {
      const profit = getBusinessProfitPerCycle(idleBusiness.id);
      const cycleTimeMs = getBusinessCycleTimeMs(idleBusiness.id);
      return {
        title: `Run ${idleBusiness.name}`,
        detail: `${formatMoney(profit)} in ${formatDuration(cycleTimeMs)}`,
      };
    }

    return {
      title: "Buy more units to increase profit",
      detail: "Higher counts unlock milestones and upgrades.",
    };
  }, [
    availableProjects,
    buildings,
    buildQueue.active.length,
    businesses,
    cash,
    getBuildingUpgradeCost,
    getBuildingUpgradeTimeSec,
    getBusinessCycleTimeMs,
    getBusinessProfitPerCycle,
    getManagerCost,
    getNextMilestone,
    incomePerSec,
    projectSlots,
    runningProjects.length,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="app-kicker">PRE–PRE ALPHA</div>
          <h1>AdCap Core Only</h1>
        </div>
      </header>

      <StatBar cash={cash} incomePerSec={incomePerSec} />
      <NextActionBar title={nextAction.title} detail={nextAction.detail} />
      <div className="hud-toggles">
        <button
          className={`hud-button ${showGoals ? "active" : ""}`}
          type="button"
          onClick={() => setShowGoals((prev) => !prev)}
        >
          Goals
          {goalsAlert && <span className="hud-dot" />}
        </button>
        <button
          className={`hud-button ${showSafe ? "active" : ""}`}
          type="button"
          onClick={() => setShowSafe((prev) => !prev)}
        >
          Safe
          {safeAlert && <span className="hud-dot" />}
        </button>
      </div>
      {showGoals && <GoalsBar goals={activeGoals} context={goalContext} />}
      {showSafe && (
        <SafePanel
          cash={cash}
          safeCash={safeCash}
          theftThreshold={theftThreshold}
          theftRisk={theftRisk}
          onDeposit={depositSafe}
          onWithdraw={withdrawSafe}
        />
      )}
      <WorkButton onWork={tapWork} />

      <div className="screen-tabs">
        <div className="tab-group">
          <button
            className={`tab-button ${activeScreen === "base" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveScreen("base")}
          >
            Base
          </button>
          <button
            className={`tab-button ${activeScreen === "market" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveScreen("market")}
          >
            Market
          </button>
          <button
            className={`tab-button ${activeScreen === "war" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveScreen("war")}
          >
            War Room
          </button>
        </div>
        <button
          className="upgrades-button"
          type="button"
          onClick={() => setShowUpgrades(true)}
        >
          Upgrades
          {upgradeOfferDefs.length > 0 && <span className="upgrade-dot" />}
        </button>
      </div>

      {activeScreen === "base" ? (
        <BaseScreen now={now} buyMode={buyMode} cash={cash} />
      ) : activeScreen === "market" ? (
        <section className="business-panel">
          <div className="business-controls">
            <BuyModeToggle value={buyMode} onChange={setBuyMode} allowedModes={unlockedBuyModes} />
            <button
              className="run-all-button"
              type="button"
              onClick={runAllBusinesses}
              disabled={!canRunAll}
            >
              Run All
            </button>
          </div>

          <div className="business-list">
            {marketBusinessDefs.map((def) => {
              const business = getBusinessState(def.id);
              const profitPerCycle = getBusinessProfitPerCycle(def.id);
              const cycleTimeMs = getBusinessCycleTimeMs(def.id);
              const nextCost = getBusinessNextCost(def.id);
              const buyInfo = getBusinessBuyInfo(def.id);
              const managerCost = getManagerCost(def.id);
              const nextMilestone = getNextMilestone(def.id);
              const feedback = buyFeedback[def.id];
              const lastBoughtQty =
                feedback && now - feedback.at < 1500 ? feedback.qty : undefined;

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

              const handleBuy = () => {
                if (buyInfo.quantity <= 0 || cash < buyInfo.cost) {
                  return;
                }
                buyBusiness(def.id);
                setBuyFeedback((prev) => ({
                  ...prev,
                  [def.id]: { qty: buyInfo.quantity, at: Date.now() },
                }));
              };

              return (
                <BusinessCard
                  key={def.id}
                  def={def}
                  business={business}
                  profitPerCycle={profitPerCycle}
                  cycleTimeMs={cycleTimeMs}
                  nextCost={nextCost}
                  buyInfo={buyInfo}
                  buyMode={buyMode}
                  canAffordBuy={buyInfo.quantity > 0 && cash >= buyInfo.cost}
                  managerCost={managerCost}
                  canAffordManager={cash >= managerCost}
                  nextMilestone={nextMilestone}
                  progress={progress}
                  lastBoughtQty={lastBoughtQty}
                  onRun={() => runBusiness(def.id)}
                  onBuy={handleBuy}
                  onHireManager={() => hireManager(def.id)}
                />
              );
            })}
          </div>

          <div className="market-note">
            Market is for tuning. Base is the main play screen.
          </div>
        </section>
      ) : (
        <WarRoom now={now} cash={cash} incomePerSec={incomePerSec} />
      )}

      <ProjectsPanel
        projects={availableProjects}
        runningProjects={runningProjects}
        projectSlots={projectSlots}
        cash={cash}
        incomePerSec={incomePerSec}
        now={now}
        onStart={startProject}
      />
      <UpgradesPanel
        isOpen={showUpgrades}
        offers={upgradeOfferDefs}
        cash={cash}
        incomePerSec={incomePerSec}
        refreshInMs={offerRefreshIn}
        onBuy={buyUpgrade}
        onClose={() => setShowUpgrades(false)}
      />
    </div>
  );
};

export default App;

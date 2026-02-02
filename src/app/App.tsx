import { useEffect, useMemo, useRef, useState } from "react";

import { BUSINESS_DEFS } from "../game/economy";
import type { BusinessId } from "../game/economy";
import {
  BUILDING_BY_ID,
  BUILDING_DEFS,
  getHqConfig,
  getQueueSlotsForHq,
  getUnlockedBuildingIdsForHq,
  getUnlockedBuyModesForHq,
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
import UpgradesPanel from "../ui/components/UpgradesPanel";
import WarRoom from "../ui/components/WarRoom";
import RaidOverlay from "../ui/components/RaidOverlay";
import WorkButton from "../ui/components/WorkButton";
import ToastStack from "../ui/components/ToastStack";
import type { GoalContext } from "../game/goals";
import type { RaidEvent } from "../game/war";
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
  const unlockedBuyModes = useMemo(() => getUnlockedBuyModesForHq(hqLevel), [hqLevel]);
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
  const trophies = useGameStore((state) => state.war.trophies);
  const war = useGameStore((state) => state.war);
  const uiEvents = useGameStore((state) => state.uiEvents);
  const dismissUiEvent = useGameStore((state) => state.dismissUiEvent);
  const queueSlots = useGameStore((state) => state.getBuildQueueSlots());

  const [now, setNow] = useState(() => Date.now());
  const [buyFeedback, setBuyFeedback] = useState<BuyFeedback>(() => ({}));
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showWar, setShowWar] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [raidAnimation, setRaidAnimation] = useState<RaidEvent | null>(null);
  const lastRaidId = useRef<string | null>(null);

  useEffect(() => {
    const latestRaid = war.raidLog[0];
    if (!latestRaid || latestRaid.kind !== "attack") {
      return;
    }
    if (latestRaid.id === lastRaidId.current) {
      return;
    }
    lastRaidId.current = latestRaid.id;
    setRaidAnimation(latestRaid);
  }, [war.raidLog]);

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

  const queueCount = buildQueue.active.length;
  const nextQueueFinish = buildQueue.active.reduce(
    (min, item) => (item.finishAt < min ? item.finishAt : min),
    Number.POSITIVE_INFINITY
  );
  const queueRemaining =
    nextQueueFinish !== Number.POSITIVE_INFINITY ? Math.max(0, nextQueueFinish - now) : 0;

  const buildingsBuiltCount = Object.values(buildings).filter(
    (building) => building.typeId !== "hq"
  ).length;
  const hasTenUnits = BUSINESS_DEFS.some(
    (def) => (businesses[def.id]?.count ?? 0) >= 10
  );
  const hasManager = BUSINESS_DEFS.some((def) => businesses[def.id]?.managerOwned);
  const hasUpgradeStarted =
    buildQueue.active.length > 0 ||
    Object.values(buildings).some((building) => building.buildingLevel > 1);

  const onboardingStep = useMemo(() => {
    const steps = [
      {
        id: "place",
        title: "Place your first asset",
        hint: "Tap an empty plot to build.",
        complete: buildingsBuiltCount > 0,
      },
      {
        id: "units",
        title: "Buy 10 units",
        hint: "Open an asset and buy units.",
        complete: hasTenUnits,
      },
      {
        id: "manager",
        title: "Hire a handler",
        hint: "Assign a handler to automate cycles.",
        complete: hasManager,
      },
      {
        id: "upgrade",
        title: "Start an upgrade",
        hint: "Start a building upgrade from the panel.",
        complete: hasUpgradeStarted,
      },
    ];

    const index = steps.findIndex((step) => !step.complete);
    if (index === -1) {
      return null;
    }
    return {
      step: index + 1,
      total: steps.length,
      ...steps[index],
    };
  }, [buildingsBuiltCount, hasTenUnits, hasManager, hasUpgradeStarted]);

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
        title: `${cash >= cost ? "Upgrade" : "Save for"} Head Office to L${hqLevel + 1}`,
        detail: `${formatMoney(cost)} · ${formatDuration(duration)} ? ${
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
        title: `${cash >= cost ? "Hire" : "Save for"} ${managerTarget.name} handler`,
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
        detail: `? ${formatMultiplier(target.nextMilestone.mult)} profit`,
      };
    }

    if (availableProjects.length > 0 && runningProjects.length < projectSlots) {
      const project = availableProjects[0];
      const cost = getProjectCost(incomePerSec, project);
      return {
        title: `${cash >= cost ? "Start" : "Save for"} operation: ${project.name}`,
        detail: `${formatMoney(cost)} / ${formatDuration(project.durationMs)}`,
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
          <div className="app-kicker">Your City</div>
          <h1>Belograd District</h1>
        </div>
        <div className="app-subtitle">Republic of Vrbija</div>
      </header>

      <div className="city-hud">
        <div className="city-cash">
          <div className="city-cash-value">{formatMoney(cash)}</div>
          <div className="city-cash-rate">+{formatMoney(incomePerSec)} / sec</div>
        </div>
        <div className="city-badges">
          <div className="hud-badge">
            Queue {queueCount}/{queueSlots} -{" "}
            {queueCount > 0 ? formatDuration(queueRemaining) : "idle"}
          </div>
          <div className="hud-badge">Influence {trophies}</div>
        </div>
      </div>

      <div className="panel-bar">
        <button className="panel-button" type="button" onClick={() => setShowGoals(true)}>
          Goals
          {goalsAlert && <span className="upgrade-dot" />}
        </button>
        <button
          className="panel-button"
          type="button"
          onClick={() => setShowSafe(true)}
        >
          Safe
          {theftRisk && <span className="upgrade-dot" />}
        </button>
        <button
          className="panel-button"
          type="button"
          onClick={() => setShowOperations(true)}
        >
          Operations
        </button>
        <button
          className="panel-button"
          type="button"
          onClick={() => setShowUpgrades(true)}
        >
          Board Offers
          {upgradeOfferDefs.length > 0 && <span className="upgrade-dot" />}
        </button>
        <button className="panel-button" type="button" onClick={() => setShowWar(true)}>
          War Room
        </button>
        <button className="panel-button" type="button" onClick={() => setShowMarket(true)}>
          Data
        </button>
      </div>

      {onboardingStep ? (
        <div className="onboarding-rail">
          <div className="onboarding-kicker">
            Step {onboardingStep.step}/{onboardingStep.total}
          </div>
          <div className="onboarding-title">{onboardingStep.title}</div>
          <div className="onboarding-hint">{onboardingStep.hint}</div>
        </div>
      ) : (
        <NextActionBar title={nextAction.title} detail={nextAction.detail} />
      )}

      <BaseScreen now={now} buyMode={buyMode} cash={cash} />

      <div className="work-fab">
        <WorkButton onWork={tapWork} />
      </div>

      <RaidOverlay raid={raidAnimation} onClose={() => setRaidAnimation(null)} />

      <ToastStack events={uiEvents} onDismiss={dismissUiEvent} />

      {showGoals && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowGoals(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Goals</h2>
              <button className="modal-close" type="button" onClick={() => setShowGoals(false)}>
                Close
              </button>
            </div>
            <GoalsBar goals={activeGoals} context={goalContext} showHeader={false} />
          </div>
        </div>
      )}

      {showSafe && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowSafe(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Safehouse Vault</h2>
              <button className="modal-close" type="button" onClick={() => setShowSafe(false)}>
                Close
              </button>
            </div>
            <SafePanel
              cash={cash}
              safeCash={safeCash}
              theftThreshold={theftThreshold}
              theftRisk={theftRisk}
              onDeposit={depositSafe}
              onWithdraw={withdrawSafe}
            />
          </div>
        </div>
      )}

      {showOperations && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowOperations(false)}
        >
          <div
            className="modal-card modal-scroll"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Operations</h2>
                <div className="modal-subtitle">Long-term protocols and infrastructure.</div>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowOperations(false)}
              >
                Close
              </button>
            </div>
            <ProjectsPanel
              projects={availableProjects}
              runningProjects={runningProjects}
              projectSlots={projectSlots}
              cash={cash}
              incomePerSec={incomePerSec}
              now={now}
              onStart={startProject}
              showHeader={false}
            />
          </div>
        </div>
      )}

      {showWar && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowWar(false)}>
          <div
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <WarRoom now={now} cash={cash} incomePerSec={incomePerSec} />
          </div>
        </div>
      )}

      {showMarket && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowMarket(false)}>
          <div
            className="modal-card modal-scroll"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Data View</h2>
                <div className="modal-subtitle">Tuning panel for economy balance.</div>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowMarket(false)}>
                Close
              </button>
            </div>
            <section className="business-panel">
              <div className="business-controls">
                <BuyModeToggle
                  value={buyMode}
                  onChange={setBuyMode}
                  allowedModes={unlockedBuyModes}
                />
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
                Data view only. Base is the main play screen.
              </div>
            </section>
          </div>
        </div>
      )}

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








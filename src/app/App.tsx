import { useEffect, useMemo, useState } from "react";

import { BUSINESS_DEFS } from "../game/economy";
import type { BusinessId } from "../game/economy";
import { formatMoney } from "../game/format";
import { getAvailableProjects, getProjectSlots } from "../game/projects";
import { getAvailableUpgradesForCounts } from "../game/upgrades";
import { useGameStore } from "../game/store";
import BusinessCard from "../ui/components/BusinessCard";
import BuyModeToggle from "../ui/components/BuyModeToggle";
import ProjectsPanel from "../ui/components/ProjectsPanel";
import StatBar from "../ui/components/StatBar";
import UpgradesPanel from "../ui/components/UpgradesPanel";
import WorkButton from "../ui/components/WorkButton";

const UPGRADES_UNLOCK_TOTAL = 200;

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
  const purchasedUpgrades = useGameStore((state) => state.purchasedUpgrades);
  const totalEarned = useGameStore((state) => state.totalEarned);
  const runningProjects = useGameStore((state) => state.runningProjects);
  const completedProjects = useGameStore((state) => state.completedProjects);

  const [now, setNow] = useState(() => Date.now());
  const [buyFeedback, setBuyFeedback] = useState<BuyFeedback>(() => ({}));

  useEffect(() => {
    let frameId = 0;
    let lastUiUpdate = 0;

    const tick = () => {
      const current = Date.now();
      useGameStore.getState().processBusinessCycles(current);
      useGameStore.getState().processProjectCompletions(current);
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

  const unlockedBusinessDefs = useMemo(
    () => BUSINESS_DEFS.filter((def) => (def.unlockAtTotalEarned ?? 0) <= totalEarned),
    [totalEarned]
  );

  const lockedBusinessDefs = useMemo(
    () => BUSINESS_DEFS.filter((def) => (def.unlockAtTotalEarned ?? 0) > totalEarned),
    [totalEarned]
  );

  const canRunAll = unlockedBusinessDefs.some((def) => {
    const business = getBusinessState(def.id);
    return business.count > 0 && !business.running;
  });

  const businessCounts = useMemo(() => {
    return BUSINESS_DEFS.reduce((acc, def) => {
      acc[def.id] = businesses[def.id]?.count ?? 0;
      return acc;
    }, {} as Record<BusinessId, number>);
  }, [businesses]);

  const upgradesUnlocked = totalEarned >= UPGRADES_UNLOCK_TOTAL;
  const availableUpgrades = useMemo(
    () =>
      upgradesUnlocked
        ? getAvailableUpgradesForCounts(businessCounts, totalEarned, purchasedUpgrades)
        : [],
    [businessCounts, totalEarned, purchasedUpgrades, upgradesUnlocked]
  );

  const projectSlots = useMemo(() => getProjectSlots(completedProjects), [completedProjects]);
  const availableProjects = useMemo(
    () => getAvailableProjects(completedProjects, runningProjects, totalEarned),
    [completedProjects, runningProjects, totalEarned]
  );

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="app-kicker">PRE–PRE ALPHA</div>
          <h1>AdCap Core Only</h1>
        </div>
      </header>

      <StatBar cash={cash} incomePerSec={incomePerSec} />
      <WorkButton onWork={tapWork} />

      <section className="business-panel">
        <div className="business-controls">
          <BuyModeToggle value={buyMode} onChange={setBuyMode} />
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
          {unlockedBusinessDefs.map((def) => {
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
              const remaining = business.endsAt - now;
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

        {lockedBusinessDefs.length > 0 && (
          <details className="locked-section">
            <summary>Locked Businesses ({lockedBusinessDefs.length})</summary>
            <div className="locked-list">
              {lockedBusinessDefs.map((def) => (
                <div className="business-card locked" key={def.id}>
                  <div className="business-header">
                    <h3>{def.name}</h3>
                  </div>
                  <div className="business-meta">
                    Unlocks at {formatMoney(def.unlockAtTotalEarned ?? 0)} total earned
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <ProjectsPanel
        projects={availableProjects}
        runningProjects={runningProjects}
        projectSlots={projectSlots}
        cash={cash}
        incomePerSec={incomePerSec}
        now={now}
        onStart={startProject}
      />

      {upgradesUnlocked ? (
        <UpgradesPanel
          upgrades={availableUpgrades}
          cash={cash}
          incomePerSec={incomePerSec}
          onBuy={buyUpgrade}
        />
      ) : (
        <section className="upgrades-panel upgrades-locked">
          <div className="upgrades-header">
            <h2>Upgrades</h2>
          </div>
          <div className="upgrades-empty">
            Unlocks at {UPGRADES_UNLOCK_TOTAL} total earned.
          </div>
        </section>
      )}
    </div>
  );
};

export default App;

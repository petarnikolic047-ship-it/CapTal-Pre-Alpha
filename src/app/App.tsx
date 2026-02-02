import { useEffect, useMemo, useState } from "react";

import { BUSINESS_DEFS } from "../game/economy";
import type { BusinessId } from "../game/economy";
import { getAvailableUpgradesForCounts } from "../game/upgrades";
import { useGameStore } from "../game/store";
import BusinessCard from "../ui/components/BusinessCard";
import BuyModeToggle from "../ui/components/BuyModeToggle";
import StatBar from "../ui/components/StatBar";
import UpgradesPanel from "../ui/components/UpgradesPanel";
import WorkButton from "../ui/components/WorkButton";

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

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let frameId = 0;
    let lastUiUpdate = 0;

    const tick = () => {
      const current = Date.now();
      useGameStore.getState().processBusinessCycles(current);
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

  const canRunAll = BUSINESS_DEFS.some((def) => {
    const business = getBusinessState(def.id);
    return business.count > 0 && !business.managerOwned && !business.running;
  });

  const businessCounts = useMemo(() => {
    return BUSINESS_DEFS.reduce((acc, def) => {
      acc[def.id] = businesses[def.id]?.count ?? 0;
      return acc;
    }, {} as Record<BusinessId, number>);
  }, [businesses]);

  const availableUpgrades = useMemo(
    () => getAvailableUpgradesForCounts(businessCounts, totalEarned, purchasedUpgrades),
    [businessCounts, totalEarned, purchasedUpgrades]
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
          {BUSINESS_DEFS.map((def) => {
            const business = getBusinessState(def.id);
            const profitPerCycle = getBusinessProfitPerCycle(def.id);
            const cycleTimeMs = getBusinessCycleTimeMs(def.id);
            const nextCost = getBusinessNextCost(def.id);
            const buyInfo = getBusinessBuyInfo(def.id);
            const managerCost = getManagerCost(def.id);
            const nextMilestone = getNextMilestone(def.id);

            const progress =
              business.running && business.endsAt
                ? 1 - Math.max(0, Math.min(1, (business.endsAt - now) / cycleTimeMs))
                : 0;

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
                onRun={() => runBusiness(def.id)}
                onBuy={() => buyBusiness(def.id)}
                onHireManager={() => hireManager(def.id)}
              />
            );
          })}
        </div>
      </section>

      <UpgradesPanel upgrades={availableUpgrades} cash={cash} onBuy={buyUpgrade} />
    </div>
  );
};

export default App;
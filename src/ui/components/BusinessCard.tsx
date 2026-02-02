import type { BusinessDef } from "../../game/economy";
import type { BusinessState, BuyInfo, MilestoneInfo, BuyMode } from "../../game/store";
import { formatDuration, formatMoney, formatMultiplier } from "../../game/format";

type BusinessCardProps = {
  def: BusinessDef;
  business: BusinessState;
  profitPerCycle: number;
  cycleTimeMs: number;
  nextCost: number;
  buyInfo: BuyInfo;
  buyMode: BuyMode;
  canAffordBuy: boolean;
  managerCost: number;
  canAffordManager: boolean;
  nextMilestone: MilestoneInfo | null;
  progress: number;
  lastBoughtQty?: number;
  onRun: () => void;
  onBuy: () => void;
  onHireManager: () => void;
};

const formatBuyLabel = (mode: BuyMode, quantity: number, cost: number) => {
  const costLabel = `(${formatMoney(cost)})`;
  if (mode === "max") {
    return quantity > 0 ? `Buy Max ${costLabel}` : "Buy Max";
  }
  return mode === "x1" ? `Buy ${costLabel}` : `Buy ${mode} ${costLabel}`;
};

const BusinessCard = ({
  def,
  business,
  profitPerCycle,
  cycleTimeMs,
  nextCost,
  buyInfo,
  buyMode,
  canAffordBuy,
  managerCost,
  canAffordManager,
  nextMilestone,
  progress,
  lastBoughtQty,
  onRun,
  onBuy,
  onHireManager,
}: BusinessCardProps) => {
  const showRun = !business.running && business.count > 0;
  const progressPct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <div className="business-card">
      <div className="business-header">
        <div>
          <h3>{def.name}</h3>
          <div className="business-owned">Owned: {business.count}</div>
        </div>
        {business.managerOwned && <span className="business-auto">AUTO</span>}
      </div>
      <div className="business-meta">Profit / cycle: {formatMoney(profitPerCycle)}</div>
      <div className="business-meta">Cycle time: {formatDuration(cycleTimeMs)}</div>
      <div className="business-meta">Next cost: {formatMoney(nextCost)}</div>
      {nextMilestone && (
        <div className="business-milestone">
          Next: {nextMilestone.count} owned → {formatMultiplier(nextMilestone.mult)} profit
        </div>
      )}
      {business.running && (
        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="progress-text">Running… {progressPct}%</div>
        </div>
      )}
      <div className="business-actions">
        {showRun && (
          <button className="run-button" type="button" onClick={onRun}>
            Run
          </button>
        )}
        <button
          className="buy-button"
          type="button"
          onClick={onBuy}
          disabled={!canAffordBuy}
        >
          {formatBuyLabel(buyMode, buyInfo.quantity, buyInfo.cost)}
        </button>
        <button
          className="manager-button"
          type="button"
          onClick={onHireManager}
          disabled={!canAffordManager || business.managerOwned}
        >
          {business.managerOwned ? "Manager Hired" : `Hire Manager (${formatMoney(managerCost)})`}
        </button>
        {lastBoughtQty ? <div className="buy-feedback">Bought {lastBoughtQty}</div> : null}
      </div>
    </div>
  );
};

export default BusinessCard;
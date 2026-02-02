import type { UpgradeDef } from "../../game/upgrades";
import { getUpgradeCost } from "../../game/upgrades";
import { BUSINESS_BY_ID } from "../../game/economy";
import { formatDuration, formatMoney, formatMultiplier } from "../../game/format";

type UpgradesPanelProps = {
  upgrades: UpgradeDef[];
  cash: number;
  incomePerSec: number;
  onBuy: (id: string) => void;
};

const formatEffect = (upgrade: UpgradeDef) => {
  const parts: string[] = [];
  if (upgrade.effect.profitMult) {
    parts.push(`${formatMultiplier(upgrade.effect.profitMult)} profit`);
  }
  if (upgrade.effect.timeMult) {
    parts.push(`${formatMultiplier(upgrade.effect.timeMult)} cycle time`);
  }
  return parts.join(" · ");
};

const formatUnlock = (upgrade: UpgradeDef) => {
  const parts: string[] = [];
  if (upgrade.unlock.businessId && upgrade.unlock.countAtLeast) {
    const name = BUSINESS_BY_ID[upgrade.unlock.businessId]?.name ?? "Business";
    parts.push(`Own ${upgrade.unlock.countAtLeast} ${name}`);
  }
  if (upgrade.unlock.totalCashEarnedAtLeast) {
    parts.push(`Earn ${formatMoney(upgrade.unlock.totalCashEarnedAtLeast)} total`);
  }
  if (parts.length === 0) {
    return "Unlocked by: Starter";
  }
  return `Unlocked by: ${parts.join(" + ")}`;
};

const UpgradesPanel = ({ upgrades, cash, incomePerSec, onBuy }: UpgradesPanelProps) => {
  return (
    <section className="upgrades-panel">
      <div className="upgrades-header">
        <h2>Upgrades</h2>
        {upgrades.length > 0 && <span className="upgrade-dot" />}
      </div>
      {upgrades.length === 0 ? (
        <div className="upgrades-empty">No upgrades available yet.</div>
      ) : (
        <div className="upgrades-list">
          {upgrades.map((upgrade) => {
            const cost = getUpgradeCost(incomePerSec, upgrade);
            const canAfford = cash >= cost && cost > 0;
            return (
              <div className="upgrade-card" key={upgrade.id}>
                <div>
                  <div className="upgrade-name">{upgrade.name}</div>
                  <div className="upgrade-effect">{formatEffect(upgrade)}</div>
                  <div className="upgrade-unlock">{formatUnlock(upgrade)}</div>
                  <div className="upgrade-meta">
                    Target {formatDuration(upgrade.targetSeconds * 1000)} of income
                  </div>
                </div>
                <button
                  className="upgrade-buy"
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(upgrade.id)}
                >
                  Buy {formatMoney(cost)}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default UpgradesPanel;
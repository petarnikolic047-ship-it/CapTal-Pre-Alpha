import type { UpgradeDef } from "../../game/upgrades";
import { getUpgradeCost } from "../../game/upgrades";
import { formatDuration, formatMoney, formatMultiplier } from "../../game/format";

type UpgradesPanelProps = {
  offers: UpgradeDef[];
  cash: number;
  incomePerSec: number;
  refreshInMs: number;
  isOpen: boolean;
  onBuy: (id: string) => void;
  onClose: () => void;
};

const formatEffect = (upgrade: UpgradeDef) => {
  const parts: string[] = [];
  if (upgrade.effect.profitMult) {
    parts.push(`${formatMultiplier(upgrade.effect.profitMult)} profit`);
  }
  if (upgrade.effect.timeMult) {
    parts.push(`${formatMultiplier(upgrade.effect.timeMult)} cycle time`);
  }
  return parts.join(" / ");
};

const UpgradesPanel = ({
  offers,
  cash,
  incomePerSec,
  refreshInMs,
  isOpen,
  onBuy,
  onClose,
}: UpgradesPanelProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Board Offers</h2>
            <div className="modal-subtitle">
              Offers refresh in {formatDuration(refreshInMs)}
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {offers.length === 0 ? (
          <div className="upgrades-empty">No offers yet.</div>
        ) : (
          <div className="upgrade-offers">
            {offers.map((upgrade) => {
              const cost = getUpgradeCost(incomePerSec, upgrade);
              const canAfford = cash >= cost && cost > 0;
              return (
                <div className="upgrade-card" key={upgrade.id}>
                  <div>
                    <div className="upgrade-name">{upgrade.name}</div>
                    {upgrade.description && (
                      <div className="upgrade-description">{upgrade.description}</div>
                    )}
                    <div className="upgrade-effect">{formatEffect(upgrade)}</div>
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
      </div>
    </div>
  );
};

export default UpgradesPanel;


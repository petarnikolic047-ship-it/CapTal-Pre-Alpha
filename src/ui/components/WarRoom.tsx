import { useMemo } from "react";

import { formatDuration, formatMoney } from "../../game/format";
import { WAR_TARGET_REFRESH_MS } from "../../game/war";
import type { WarUpgradeDef } from "../../game/upgrades_war";
import { WAR_UPGRADES, getWarUpgradeCost } from "../../game/upgrades_war";
import { useGameStore } from "../../game/store";

type WarRoomProps = {
  now: number;
  cash: number;
  incomePerSec: number;
};

const WarRoom = ({ now, cash, incomePerSec }: WarRoomProps) => {
  const war = useGameStore((state) => state.war);
  const offense = useGameStore((state) => state.getWarOffensePower());
  const defense = useGameStore((state) => state.getWarDefensePower());
  const vaultProtectPct = useGameStore((state) => state.getWarVaultProtectPct());
  const attackTarget = useGameStore((state) => state.attackWarTarget);
  const refreshTargets = useGameStore((state) => state.refreshWarTargets);
  const buyWarUpgrade = useGameStore((state) => state.buyWarUpgrade);

  const attackCooldownRemaining = war.attackCooldownUntil
    ? Math.max(0, war.attackCooldownUntil - now)
    : 0;
  const shieldRemaining = war.shieldUntil ? Math.max(0, war.shieldUntil - now) : 0;
  const refreshRemaining = Math.max(0, WAR_TARGET_REFRESH_MS - (now - war.lastTargetsAt));
  const canAttack = attackCooldownRemaining <= 0;

  const upgradesByKind = useMemo(() => {
    const groups: Record<WarUpgradeDef["kind"], WarUpgradeDef[]> = {
      security: [],
      war: [],
    };
    for (const upgrade of WAR_UPGRADES) {
      groups[upgrade.kind].push(upgrade);
    }
    return groups;
  }, []);

  return (
    <section className="war-room">
      <div className="war-header">
        <div>
          <div className="war-kicker">War Room</div>
          <h2>League: {war.league.toUpperCase()}</h2>
        </div>
        <div className="war-trophies">
          <span>Trophies</span>
          <strong>{war.trophies}</strong>
        </div>
      </div>

      <div className="war-stats">
        <div className="war-stat-card">
          <div className="war-stat-label">Offense</div>
          <div className="war-stat-value">{Math.round(offense)}</div>
        </div>
        <div className="war-stat-card">
          <div className="war-stat-label">Defense</div>
          <div className="war-stat-value">{Math.round(defense)}</div>
        </div>
        <div className="war-stat-card">
          <div className="war-stat-label">Vault Protection</div>
          <div className="war-stat-value">{Math.round(vaultProtectPct * 100)}%</div>
        </div>
        <div className="war-stat-card">
          <div className="war-stat-label">Shield</div>
          <div className="war-stat-value">
            {shieldRemaining > 0 ? formatDuration(shieldRemaining) : "None"}
          </div>
        </div>
      </div>

      <div className="war-section">
        <div className="war-section-header">
          <h3>Targets</h3>
          <div className="war-section-actions">
            <button
              className="war-refresh"
              type="button"
              onClick={() => refreshTargets(true)}
              disabled={refreshRemaining > 0}
            >
              Refresh
            </button>
            {refreshRemaining > 0 && (
              <span className="war-refresh-timer">
                {formatDuration(refreshRemaining)}
              </span>
            )}
          </div>
        </div>
        <div className="war-targets">
          {war.targets.map((target) => (
            <div className={`war-target-card ${target.difficulty}`} key={target.id}>
              <div className="war-target-info">
                <div className="war-target-name">{target.name}</div>
                <div className="war-target-meta">
                  Defense {Math.round(target.defense)} · Loot {formatMoney(target.loot)}
                </div>
                <div className="war-target-meta">
                  Trophies +{target.trophyWin} / -{target.trophyLoss}
                </div>
              </div>
              <div className="war-target-actions">
                <button
                  className="war-action-button"
                  type="button"
                  onClick={() => attackTarget(target.id)}
                  disabled={!canAttack}
                >
                  Raid
                </button>
                {!canAttack && (
                  <span className="war-cooldown">
                    {formatDuration(attackCooldownRemaining)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {war.targets.length === 0 && (
            <div className="war-empty">No targets available yet.</div>
          )}
        </div>
      </div>

      <div className="war-section">
        <div className="war-section-header">
          <h3>Security Upgrades</h3>
        </div>
        <div className="war-upgrades">
          {upgradesByKind.security.map((upgrade) => (
            <WarUpgradeCard
              key={upgrade.id}
              upgrade={upgrade}
              cash={cash}
              incomePerSec={incomePerSec}
              owned={war.warUpgrades.includes(upgrade.id)}
              onBuy={buyWarUpgrade}
            />
          ))}
        </div>
      </div>

      <div className="war-section">
        <div className="war-section-header">
          <h3>War Upgrades</h3>
        </div>
        <div className="war-upgrades">
          {upgradesByKind.war.map((upgrade) => (
            <WarUpgradeCard
              key={upgrade.id}
              upgrade={upgrade}
              cash={cash}
              incomePerSec={incomePerSec}
              owned={war.warUpgrades.includes(upgrade.id)}
              onBuy={buyWarUpgrade}
            />
          ))}
        </div>
      </div>

      <div className="war-section">
        <div className="war-section-header">
          <h3>Raid Log</h3>
        </div>
        <div className="war-log">
          {war.raidLog.length === 0 && (
            <div className="war-empty">No raids yet.</div>
          )}
          {war.raidLog.map((entry) => {
            const timeAgo = formatDuration(Math.max(0, now - entry.at));
            const title =
              entry.kind === "attack"
                ? `Raided ${entry.targetName ?? "Target"}`
                : "Defense raid";
            const resultLabel = entry.result === "win" ? "Win" : "Loss";
            const lootLabel =
              entry.loot > 0
                ? `${entry.result === "win" ? "+" : "-"}${formatMoney(entry.loot)}`
                : "0";
            const trophiesLabel = entry.trophiesDelta !== 0 ? `${entry.trophiesDelta}` : "0";
            return (
              <div className="war-log-item" key={entry.id}>
                <div>
                  <div className="war-log-title">{title}</div>
                  <div className="war-log-meta">{timeAgo} ago</div>
                </div>
                <div className={`war-log-result ${entry.result}`}>{resultLabel}</div>
                <div className="war-log-meta">{lootLabel} cash</div>
                <div className="war-log-meta">{trophiesLabel} trophies</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

type WarUpgradeCardProps = {
  upgrade: WarUpgradeDef;
  cash: number;
  incomePerSec: number;
  owned: boolean;
  onBuy: (id: string) => void;
};

const WarUpgradeCard = ({ upgrade, cash, incomePerSec, owned, onBuy }: WarUpgradeCardProps) => {
  const cost = getWarUpgradeCost(incomePerSec, upgrade);
  const canAfford = cash >= cost && cost > 0;
  return (
    <div className="war-upgrade-card">
      <div>
        <div className="war-upgrade-name">{upgrade.name}</div>
        <div className="war-upgrade-desc">{upgrade.description}</div>
        <div className="war-upgrade-meta">Cost: {formatMoney(cost)}</div>
      </div>
      <button
        className="war-action-button"
        type="button"
        disabled={owned || !canAfford}
        onClick={() => onBuy(upgrade.id)}
      >
        {owned ? "Owned" : "Buy"}
      </button>
    </div>
  );
};

export default WarRoom;

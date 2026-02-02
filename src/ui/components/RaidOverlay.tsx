import { useEffect, useRef, useState } from "react";

import { formatMoney } from "../../game/format";
import type { RaidEvent } from "../../game/war";

type RaidOverlayProps = {
  raid: RaidEvent | null;
  onClose: () => void;
};

const RaidOverlay = ({ raid, onClose }: RaidOverlayProps) => {
  const [canSkip, setCanSkip] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!raid) {
      return undefined;
    }
    setCanSkip(false);
    const allowSkip = setTimeout(() => setCanSkip(true), 1200);
    const autoClose = setTimeout(() => onCloseRef.current(), 4800);
    return () => {
      clearTimeout(allowSkip);
      clearTimeout(autoClose);
    };
  }, [raid]);

  if (!raid) {
    return null;
  }

  const win = raid.result === "win";
  const trophyLabel = raid.trophiesDelta >= 0 ? `+${raid.trophiesDelta}` : `${raid.trophiesDelta}`;
  const lootLabel = win ? `+${formatMoney(raid.loot)}` : "No loot";
  const targetName = raid.targetName ?? "Rival";

  return (
    <div
      className={`raid-overlay ${win ? "win" : "loss"}`}
      role="presentation"
      onClick={() => onCloseRef.current()}
    >
      <div
        className="raid-overlay-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="raid-overlay-header">
          <div className="raid-overlay-title">WAR ROOM</div>
          <div className="raid-overlay-target">Target: {targetName}</div>
        </div>
        <div className="raid-panels">
          <div className="raid-panel panel-1">
            <span>INFILTRATE</span>
          </div>
          <div className="raid-panel panel-2">
            <span>CLASH</span>
          </div>
          <div className="raid-panel panel-3">
            <span>EXTRACT</span>
          </div>
        </div>
        <div className={`raid-stamp ${win ? "win" : "loss"}`}>{win ? "WIN" : "LOSS"}</div>
        <div className="raid-reward">
          <div className={`raid-loot ${win ? "gain" : "loss"}`}>{lootLabel}</div>
          <div className="raid-meta">Trophies {trophyLabel}</div>
        </div>
        {canSkip && (
          <button className="raid-skip" type="button" onClick={onClose}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default RaidOverlay;

import type { BuyMode } from "../../game/store";

type BuyModeToggleProps = {
  value: BuyMode;
  onChange: (mode: BuyMode) => void;
  allowedModes?: BuyMode[];
};

const BUY_MODES: BuyMode[] = ["x1", "x10", "x100", "max"];

const BuyModeToggle = ({ value, onChange, allowedModes }: BuyModeToggleProps) => {
  const allowed = new Set(allowedModes ?? BUY_MODES);
  return (
    <div className="buy-modes">
      {BUY_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={`buy-mode-button${value === mode ? " active" : ""}`}
          onClick={() => onChange(mode)}
          disabled={!allowed.has(mode)}
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default BuyModeToggle;

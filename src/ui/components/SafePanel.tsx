import { formatMoney } from "../../game/format";

type SafePanelProps = {
  cash: number;
  safeCash: number;
  theftThreshold: number;
  theftRisk: boolean;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
};

const SafePanel = ({
  cash,
  safeCash,
  theftThreshold,
  theftRisk,
  onDeposit,
  onWithdraw,
}: SafePanelProps) => {
  const deposit25 = cash * 0.25;
  const deposit50 = cash * 0.5;
  const withdraw25 = safeCash * 0.25;
  const withdraw50 = safeCash * 0.5;

  return (
    <section className="safe-panel">
      <div className="safe-header">
        <div>
          <div className="safe-title">Safe</div>
          <div className="safe-balance">Stored: {formatMoney(safeCash)}</div>
        </div>
        {theftRisk && (
          <div className="safe-warning">
            Cash is unsafe above {formatMoney(theftThreshold)}
          </div>
        )}
      </div>
      <div className="safe-actions">
        <div className="safe-actions-group">
          <span className="safe-actions-label">Deposit</span>
          <button
            className="safe-button"
            type="button"
            onClick={() => onDeposit(deposit25)}
            disabled={deposit25 <= 0}
          >
            25%
          </button>
          <button
            className="safe-button"
            type="button"
            onClick={() => onDeposit(deposit50)}
            disabled={deposit50 <= 0}
          >
            50%
          </button>
          <button
            className="safe-button"
            type="button"
            onClick={() => onDeposit(cash)}
            disabled={cash <= 0}
          >
            Max
          </button>
        </div>
        <div className="safe-actions-group">
          <span className="safe-actions-label">Withdraw</span>
          <button
            className="safe-button"
            type="button"
            onClick={() => onWithdraw(withdraw25)}
            disabled={withdraw25 <= 0}
          >
            25%
          </button>
          <button
            className="safe-button"
            type="button"
            onClick={() => onWithdraw(withdraw50)}
            disabled={withdraw50 <= 0}
          >
            50%
          </button>
          <button
            className="safe-button"
            type="button"
            onClick={() => onWithdraw(safeCash)}
            disabled={safeCash <= 0}
          >
            Max
          </button>
        </div>
      </div>
    </section>
  );
};

export default SafePanel;

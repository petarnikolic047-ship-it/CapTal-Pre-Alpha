import { formatMoney, formatRate } from "../../game/format";

type StatBarProps = {
  cash: number;
  incomePerSec: number;
};

const StatBar = ({ cash, incomePerSec }: StatBarProps) => {
  return (
    <div className="stat-bar">
      <div className="stat-money">{formatMoney(cash)}</div>
      <div className="stat-rate">
        <span className="stat-rate-label">Potential</span>
        {formatRate(incomePerSec)}
      </div>
    </div>
  );
};

export default StatBar;
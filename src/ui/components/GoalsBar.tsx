import type { BusinessId } from "../../game/economy";
import type { GoalState } from "../../game/goals";
import { formatGoalLabel, formatGoalReward, getGoalProgress } from "../../game/goals";

type GoalsBarProps = {
  goals: GoalState[];
  counts: Record<BusinessId, number>;
  purchasedUpgradesCount: number;
  projectsStarted: number;
};

const GoalsBar = ({
  goals,
  counts,
  purchasedUpgradesCount,
  projectsStarted,
}: GoalsBarProps) => {
  return (
    <section className="goals-bar">
      <div className="goals-header">
        <h2>Goals</h2>
      </div>
      {goals.length === 0 ? (
        <div className="goals-empty">No goals right now.</div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const progress = getGoalProgress(
              goal,
              counts,
              purchasedUpgradesCount,
              projectsStarted
            );
            const current = Math.min(progress.current, progress.target);
            return (
              <div className="goal-item" key={goal.id}>
                <span className="goal-text">{formatGoalLabel(goal)}</span>
                <span className="goal-progress">
                  {current}/{progress.target}
                </span>
                <span className="goal-reward">{formatGoalReward(goal)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default GoalsBar;

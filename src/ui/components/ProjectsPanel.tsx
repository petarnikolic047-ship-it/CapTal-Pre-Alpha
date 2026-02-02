import { PROJECT_BY_ID, getProjectCost } from "../../game/projects";
import type { ProjectDef, ProjectRun } from "../../game/projects";
import { formatDuration, formatMoney } from "../../game/format";

type ProjectsPanelProps = {
  projects: ProjectDef[];
  runningProjects: ProjectRun[];
  projectSlots: number;
  cash: number;
  incomePerSec: number;
  now: number;
  onStart: (id: string) => void;
};

const formatEffect = (project: ProjectDef) => {
  const parts: string[] = [];
  if (project.effect.offlineCapSecondsAdd) {
    const hours = project.effect.offlineCapSecondsAdd / 3600;
    parts.push(`+${hours}h offline cap`);
  }
  if (project.effect.globalProfitMult) {
    const bonus = project.effect.globalProfitMult - 1;
    parts.push(`+${Math.round(bonus * 100)}% profit`);
  }
  if (project.effect.globalTimeMult) {
    const speed = Math.round((1 - project.effect.globalTimeMult) * 100);
    parts.push(`-${speed}% cycle time`);
  }
  if (project.effect.autoRunAll) {
    parts.push("Auto-run all businesses");
  }
  return parts.join(" · ");
};

const ProjectsPanel = ({
  projects,
  runningProjects,
  projectSlots,
  cash,
  incomePerSec,
  now,
  onStart,
}: ProjectsPanelProps) => {
  const slotsUsed = runningProjects.length;

  return (
    <section className="projects-panel">
      <div className="projects-header">
        <h2>Projects</h2>
        <div className="projects-slots">
          Slots {slotsUsed}/{projectSlots}
        </div>
      </div>

      {runningProjects.length > 0 && (
        <div className="projects-running">
          {runningProjects.map((run) => {
            const def = PROJECT_BY_ID[run.id];
            if (!def) {
              return null;
            }
            const remainingMs = Math.max(0, run.endsAt - now);
            const progress = def.durationMs > 0 ? 1 - remainingMs / def.durationMs : 1;
            const progressPct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

            return (
              <div className="project-card running" key={run.id}>
                <div>
                  <div className="project-name">{def.name}</div>
                  <div className="project-effect">{formatEffect(def)}</div>
                  <div className="project-meta">Time left: {formatDuration(remainingMs)}</div>
                </div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="progress-text">{progressPct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="projects-available">
        {projects.length === 0 ? (
          <div className="projects-empty">No projects available right now.</div>
        ) : (
          projects.map((project) => {
            const cost = getProjectCost(incomePerSec, project);
            const canAfford = cost > 0 && cash >= cost && slotsUsed < projectSlots;
            const label = slotsUsed >= projectSlots ? "Slots full" : "Start Project";

            return (
              <div className="project-card" key={project.id}>
                <div>
                  <div className="project-name">{project.name}</div>
                  <div className="project-effect">{formatEffect(project)}</div>
                  <div className="project-meta">Duration: {formatDuration(project.durationMs)}</div>
                  <div className="project-meta">
                    Cost: {formatMoney(cost)} (target {formatDuration(project.targetSeconds * 1000)})
                  </div>
                </div>
                <button
                  className="project-start"
                  type="button"
                  onClick={() => onStart(project.id)}
                  disabled={!canAfford}
                >
                  {label}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default ProjectsPanel;

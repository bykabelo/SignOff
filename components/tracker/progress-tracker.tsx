import {
  deriveStages,
  formatFullDay,
  projectStart,
  stageProgress,
  type Stage,
} from "@/lib/stages";
import type { Post } from "@/types/database";

/**
 * Vertical stage timeline for a design project.
 *
 * Presentational and dependency-free, so the same component serves the
 * creator's workspace and the client-facing review page — the only
 * difference between them is the accent and the heading.
 */

const VIOLET = "#534AB7";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="7"
        width="9"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.75 7V5.25a2.25 2.25 0 014.5 0V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The dot, and the line running down to the next stage. */
function StageMarker({
  state,
  accent,
  last,
}: {
  state: Stage["state"];
  accent: string;
  last: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center self-stretch">
      {state === "completed" ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          <CheckIcon />
        </span>
      ) : state === "current" ? (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white"
          style={{ boxShadow: `0 0 0 2px ${accent}` }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: accent }}
          />
        </span>
      ) : state === "locked" ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-hairline border-line bg-[#f4f2ec] text-faint">
          <LockIcon />
        </span>
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-hairline border-line bg-white">
          <span className="h-2 w-2 rounded-full bg-[#d3d1c7]" />
        </span>
      )}

      {/* The connector stops at the last stage rather than trailing off. */}
      {last ? null : (
        <span
          className="mt-1 w-px flex-1"
          style={{
            background: state === "completed" ? accent : "#e8e6de",
            opacity: state === "completed" ? 0.35 : 1,
          }}
        />
      )}
    </div>
  );
}

export function ProgressTracker({
  title,
  stages: posts,
  targetDate,
  accent = VIOLET,
  heading,
  intro,
}: {
  title: string;
  stages: Post[];
  targetDate: string | null;
  accent?: string;
  heading?: string;
  intro?: string;
}) {
  const stages = deriveStages(posts);
  const progress = stageProgress(stages);

  if (stages.length === 0) return null;

  const start = formatFullDay(projectStart(posts));
  const target = formatFullDay(targetDate);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-serif text-xl">{heading ?? title}</h2>
          {intro ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">{intro}</p>
          ) : null}
        </div>

        {/* Dates wrap under the title on a phone rather than squeezing it. */}
        {start || target ? (
          <dl className="flex gap-5 text-xs">
            {start ? (
              <div>
                <dt className="text-faint">Started</dt>
                <dd className="mt-0.5 text-ink">{start}</dd>
              </div>
            ) : null}
            {target ? (
              <div>
                <dt className="text-faint">Estimated</dt>
                <dd className="mt-0.5 text-ink">{target}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-muted">
            {progress.complete} of {progress.total} stage
            {progress.total === 1 ? "" : "s"} complete
          </span>
          <span className="font-medium text-ink">{progress.percent}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#eeedea]"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} progress`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%`, background: accent }}
          />
        </div>
      </div>

      <ol className="mt-6">
        {stages.map((stage, i) => {
          const last = i === stages.length - 1;
          return (
            <li key={stage.id} className="flex gap-3.5">
              <StageMarker state={stage.state} accent={accent} last={last} />

              <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"}`}>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span
                    className={`text-[15px] ${
                      stage.state === "completed"
                        ? "text-muted"
                        : stage.state === "current"
                          ? "font-medium text-ink"
                          : "text-faint"
                    }`}
                  >
                    {stage.name}
                  </span>

                  {stage.pill ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: stage.pill.bg,
                        color: stage.pill.fg,
                      }}
                    >
                      {stage.pill.label}
                    </span>
                  ) : null}
                </div>

                {stage.detail ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {stage.detail}
                  </p>
                ) : null}

                {stage.state === "locked" ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-faint">
                    {stage.waitsFor
                      ? `Starts once ${stage.waitsFor} is approved`
                      : "Starts once the stage above is approved"}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

"use client";

import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { buttonClass } from "@/components/button";
import { shellCopy } from "@/lib/copy/shell";
import { surveyCopy } from "@/lib/copy/survey";
import { fill } from "@/lib/copy/template";
import type { Anchor, RoleKey, Screen, SurveyContent } from "@/lib/survey/content";

/**
 * The anonymous survey (Milestone 5 plan, 3.3, 3.4 and 4.2; layout notes of 24 September 2026). The
 * link carries its token in the fragment, which never reaches a server; the page reads it, takes it
 * out of the address bar and history, and keeps it, the signed start stamp and the answers in this
 * tab's session storage only, so a reload survives and nothing is saved anywhere before the
 * answers are sent. No cookie is set or read. Mobile first: one group of up to four items per
 * screen, answer targets 52 pixels tall.
 */

const STORE = "pvp-survey";

interface Answers {
  team: string | null;
  items: Record<string, number>;
  optOut: Record<string, boolean>;
  processItems: Record<string, Record<string, number>>;
  decisions: Record<string, { roles: Partial<Record<RoleKey, string[]>>; clarity?: number }>;
}

interface Stored {
  token: string;
  stamp?: string;
  started?: boolean;
  index?: number;
  answers?: Answers;
}

type Phase = "loading" | "unavailable" | "unknown" | "closed" | "landing" | "screens" | "done";

const EMPTY: Answers = { team: null, items: {}, optOut: {}, processItems: {}, decisions: {} };

function readStore(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStore(value: Stored | null): void {
  try {
    if (value) sessionStorage.setItem(STORE, JSON.stringify(value));
    else sessionStorage.removeItem(STORE);
  } catch {
    // Storage refused (private mode): the survey still works until the tab reloads.
  }
}

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  return (await response.json()) as Record<string, unknown>;
}

/** The answers in the shape ingest_survey_response takes. */
function payloadOf(content: SurveyContent, answers: Answers): Record<string, unknown> {
  switch (content.audience) {
    case "members_part_a":
      return { ...(answers.team ? { team: answers.team } : {}), items: answers.items };
    case "members_part_b": {
      const processIds = [
        ...new Set(
          content.screens.flatMap((s) => (s.kind === "items" && s.process ? [s.process.id] : [])),
        ),
      ];
      return {
        items: answers.items,
        processes: processIds
          .filter((id) => !answers.optOut[id] && Object.keys(answers.processItems[id] ?? {}).length)
          .map((id) => ({ process: id, items: answers.processItems[id] })),
      };
    }
    case "team_leaders":
      return { items: answers.items };
    case "leadership_team":
      return {
        decisions: Object.entries(answers.decisions)
          .map(([decisionType, d]) => ({
            decisionType,
            roles: Object.fromEntries(
              Object.entries(d.roles).filter(([, list]) => (list ?? []).length > 0),
            ),
            ...(d.clarity ? { clarity: d.clarity } : {}),
          }))
          .filter((d) => d.clarity !== undefined || Object.keys(d.roles).length > 0),
      };
  }
}

function Bar({ label, progress }: { label?: string; progress?: { value: number; max: number } }) {
  return (
    <header>
      <div className="flex h-14 items-center justify-between bg-slate px-6">
        <p className="font-display text-[22px] leading-none font-medium">
          <span className="text-white">{shellCopy["wordmark.first"]}</span>
          <span className="text-gold">{shellCopy["wordmark.second"]}</span>
        </p>
        {label ? <p className="text-sm text-slate-20">{label}</p> : null}
      </div>
      {progress ? (
        // The label beside it says the same in words, so the bar itself is not announced.
        <progress
          aria-hidden="true"
          value={progress.value}
          max={progress.max}
          className="block h-1 w-full appearance-none border-0 bg-slate-10 [&::-moz-progress-bar]:bg-gold [&::-webkit-progress-bar]:bg-slate-10 [&::-webkit-progress-value]:bg-gold"
        />
      ) : null}
    </header>
  );
}

function Shell({ children, bar }: { children: ReactNode; bar?: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {bar ?? <Bar />}
      <main className="mx-auto max-w-xl px-6 pt-8 pb-16">{children}</main>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <h1 className="font-display text-[34px] leading-tight font-medium text-slate">{title}</h1>
      <p className="mt-4 text-slate">{body}</p>
    </Shell>
  );
}

/** Five square answer buttons, numbered 1 to 5, as a radio group named by the question. */
function Scale({
  name,
  legend,
  anchors,
  value,
  onChange,
  showEnds,
}: {
  name: string;
  legend: string;
  anchors: Anchor[];
  value: number | undefined;
  onChange: (value: number) => void;
  showEnds: boolean;
}) {
  const label = (v: number) => anchors.find((a) => a.value === v)?.label;
  const five = anchors.length === 5;
  return (
    <fieldset className="mt-8">
      <legend className="text-[17px] leading-snug text-slate">{legend}</legend>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <label
            key={v}
            className="flex h-[52px] cursor-pointer items-center justify-center rounded-control border border-grey-80 font-mono text-lg text-slate has-checked:border-slate has-checked:bg-slate has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-slate"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={v}
              checked={value === v}
              onChange={() => onChange(v)}
              aria-label={
                label(v)
                  ? fill(surveyCopy["scale.value"], { value: v, label: label(v)! })
                  : String(v)
              }
            />
            <span aria-hidden="true">{v}</span>
          </label>
        ))}
      </div>
      {showEnds && five ? (
        <div
          className="mt-1 grid grid-cols-5 gap-2 text-center text-xs text-grey"
          aria-hidden="true"
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <span key={v}>{label(v)}</span>
          ))}
        </div>
      ) : showEnds ? (
        <div className="mt-1 flex justify-between gap-4 text-xs text-grey" aria-hidden="true">
          <span>{label(1)}</span>
          <span className="text-right">{label(5)}</span>
        </div>
      ) : null}
    </fieldset>
  );
}

export function SurveyApp() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [content, setContent] = useState<SurveyContent | null>(null);
  const [stored, setStored] = useState<Stored | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const open = useCallback(async (token: string, restore: Stored | null) => {
    let json: Record<string, unknown>;
    try {
      json = await post("/api/survey/open", { token });
    } catch {
      setPhase("unavailable");
      return null;
    }
    if (json.state === "open") {
      const next: Stored = { ...(restore ?? {}), token, stamp: json.stamp as string };
      writeStore(next);
      setStored(next);
      setContent(json.content as SurveyContent);
      setAnswers(next.answers ?? EMPTY);
      setIndex(next.index ?? 0);
      setPhase(next.started ? "screens" : "landing");
      return next;
    }
    writeStore(null);
    setPhase(
      json.state === "closed" ? "closed" : json.state === "unknown" ? "unknown" : "unavailable",
    );
    return null;
  }, []);

  useEffect(() => {
    const begin = () => {
      const match = /(?:^|&)t=([^&]+)/.exec(window.location.hash.slice(1));
      const previous = readStore();
      let token: string | null = previous?.token ?? null;
      if (match) {
        token = decodeURIComponent(match[1]!);
        // The token leaves the address bar and the history at once.
        window.history.replaceState(null, "", "/s");
      }
      if (!token) {
        setPhase("unknown");
        return;
      }
      const restore = previous?.token === token ? previous : null;
      setPhase("loading");
      setContent(null);
      setError(null);
      void open(token, restore);
    };
    begin();
    // A second link opened in the same tab (Part B after Part A) arrives as a new fragment.
    const onHash = () => {
      if (window.location.hash.includes("t=")) begin();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [open]);

  const save = (next: Partial<Stored>) => {
    if (!stored) return;
    const merged = { ...stored, ...next };
    setStored(merged);
    writeStore(merged);
  };

  // Each answer is one interaction, so the answers as rendered are the ones it changes.
  const answer = (update: (a: Answers) => Answers) => {
    const next = update(answers);
    setAnswers(next);
    save({ answers: next });
  };

  const go = (to: number) => {
    setIndex(to);
    setError(null);
    save({ index: to, started: true });
    window.scrollTo(0, 0);
    requestAnimationFrame(() => heading.current?.focus());
  };

  async function submit() {
    if (!content || !stored) return;
    setSending(true);
    setError(null);
    const body = () => ({
      token: stored.token,
      audience: content.audience,
      stamp: readStore()?.stamp ?? stored.stamp,
      answers: payloadOf(content, answers),
    });
    try {
      let json = await post("/api/survey/submit", body());
      if (json.state === "stale") {
        // The page was open too long for its stamp: open the survey again for a fresh one.
        const reopened = await open(stored.token, { ...stored, answers, index, started: true });
        if (reopened) json = await post("/api/survey/submit", { ...body(), stamp: reopened.stamp });
      }
      if (json.state === "received") {
        writeStore(null);
        setPhase("done");
      } else if (json.state === "unknown" || json.state === "closed") {
        writeStore(null);
        setPhase(json.state);
      } else {
        setError(json.state === "empty" ? surveyCopy["error.empty"] : surveyCopy["error.send"]);
      }
    } catch {
      setError(surveyCopy["error.send"]);
    } finally {
      setSending(false);
    }
  }

  if (phase === "loading") {
    return (
      <Shell>
        <p className="text-grey" role="status">
          {surveyCopy["state.loading"]}
        </p>
      </Shell>
    );
  }
  if (phase === "unknown") {
    return (
      <Message title={surveyCopy["state.unknown.title"]} body={surveyCopy["state.unknown.body"]} />
    );
  }
  if (phase === "closed") {
    return (
      <Message title={surveyCopy["state.closed.title"]} body={surveyCopy["state.closed.body"]} />
    );
  }
  if (phase === "unavailable" || !content) {
    return <Message title={surveyCopy["page.title"]} body={surveyCopy["error.send"]} />;
  }
  if (phase === "done") {
    return (
      <Shell>
        <h1 className="font-display text-[34px] leading-tight font-medium text-slate">
          {surveyCopy["done.title"]}
        </h1>
        <p className="mt-4 text-slate">{surveyCopy["done.body"]}</p>
        {content.partBFollows ? (
          <p className="mt-4 text-slate">{surveyCopy["done.partB"]}</p>
        ) : null}
      </Shell>
    );
  }

  if (phase === "landing") {
    const title =
      content.audience === "team_leaders"
        ? surveyCopy["landing.title.teamLeaders"]
        : content.audience === "leadership_team"
          ? fill(surveyCopy["landing.title.leadershipTeam"], { unit: content.unitName })
          : fill(surveyCopy["landing.title.members"], { unit: content.unitName });
    const blocks: Array<{ title: string; body: ReactNode }> = [
      content.disclosure
        ? {
            title: surveyCopy["landing.small.title"],
            body:
              content.disclosure === "leadershipTeam"
                ? surveyCopy["landing.leadershipTeam"]
                : surveyCopy["landing.smallGroup"],
          }
        : {
            title: surveyCopy["landing.anonymous.title"],
            body: fill(surveyCopy["landing.anonymous"], { floor: content.floor }),
          },
      {
        title: fill(surveyCopy["landing.minutes.title"], { minutes: content.minutes }),
        body:
          content.audience === "leadership_team"
            ? fill(surveyCopy["landing.decisions"], { n: content.groupCount })
            : `${fill(surveyCopy["landing.questions"], {
                items: content.questionCount,
                groups: content.groupCount,
              })}${content.partBFollows ? ` ${surveyCopy["landing.partB"]}` : ""}`,
      },
      { title: surveyCopy["landing.why.title"], body: surveyCopy["landing.why"] },
    ];
    return (
      <Shell>
        <p className="text-[13px] tracking-wide text-grey uppercase">
          {fill(surveyCopy["landing.eyebrow"], {
            organisation: content.organisationName,
            unit: content.unitName,
          })}
        </p>
        <h1 className="mt-3 font-display text-[34px] leading-tight font-medium text-slate">
          {title}
        </h1>
        <div className="mt-8 space-y-6">
          {blocks.map((block, i) => (
            <section
              key={block.title}
              className={`border-t pt-4 ${i === 0 ? "border-gold" : "border-grey-20"}`}
            >
              <h2 className="font-medium text-slate">{block.title}</h2>
              <p className="mt-1 text-slate">{block.body}</p>
            </section>
          ))}
        </div>
        <button
          type="button"
          className={`mt-10 h-12 w-full ${buttonClass("primary")}`}
          onClick={() => {
            setPhase("screens");
            go(index);
          }}
        >
          {surveyCopy["landing.start"]}
        </button>
        <details className="mt-6 text-center">
          <summary className="cursor-pointer text-sm text-slate underline underline-offset-4">
            {surveyCopy["landing.about"]}
          </summary>
          <div className="mt-4 space-y-3 text-left text-sm text-slate">
            <p>{fill(surveyCopy["about.behalf"], { organisation: content.organisationName })}</p>
            <p>{surveyCopy["about.stored"]}</p>
            <p>
              {fill(surveyCopy["about.shown"], {
                organisation: content.organisationName,
                floor: content.floor,
              })}
            </p>
            <p>{surveyCopy["about.skip"]}</p>
          </div>
        </details>
      </Shell>
    );
  }

  const screen: Screen = content.screens[index]!;
  const last = index === content.screens.length - 1;
  const group = screen.kind === "team" ? undefined : screen.group;
  const barLabel =
    group === undefined
      ? undefined
      : fill(surveyCopy[screen.kind === "decision" ? "bar.decision" : "bar.group"], {
          g: group,
          total: content.groupCount,
        });

  return (
    <Shell bar={<Bar label={barLabel} progress={{ value: group ?? 0, max: content.groupCount }} />}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (last) void submit();
          else go(index + 1);
        }}
      >
        {screen.kind === "team" ? (
          <>
            <p className="text-[13px] tracking-wide text-grey uppercase">
              {surveyCopy["team.eyebrow"]}
            </p>
            <fieldset className="mt-3">
              <legend>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="font-display text-[26px] leading-tight font-medium text-slate"
                >
                  {surveyCopy["team.title"]}
                </h1>
              </legend>
              <p className="mt-2 text-sm text-grey">{surveyCopy["team.hint"]}</p>
              <div className="mt-6 space-y-2">
                {screen.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-grey-80 px-4 text-slate has-checked:border-slate has-checked:bg-slate-05 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-slate"
                  >
                    <input
                      type="radio"
                      name="team"
                      value={option.id}
                      checked={answers.team === option.id}
                      onChange={() => answer((a) => ({ ...a, team: option.id }))}
                      className="size-5 accent-slate"
                    />
                    {option.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {screen.kind === "items" ? (
          <>
            <h1
              ref={heading}
              tabIndex={-1}
              className="text-[13px] tracking-wide text-grey uppercase"
            >
              {screen.heading}
            </h1>
            {screen.scaleLine ? <p className="mt-1 text-sm text-grey">{screen.scaleLine}</p> : null}
            {screen.process ? (
              <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-slate">
                <input
                  type="checkbox"
                  className="size-5 accent-slate"
                  checked={Boolean(answers.optOut[screen.process.id])}
                  onChange={(event) => {
                    const id = screen.process!.id;
                    const checked = event.target.checked;
                    answer((a) => ({ ...a, optOut: { ...a.optOut, [id]: checked } }));
                  }}
                />
                {surveyCopy["partB.optOut"]}
              </label>
            ) : null}
            {screen.process && answers.optOut[screen.process.id]
              ? null
              : screen.questions.map((q) => {
                  const processId = screen.process?.id;
                  const value = processId
                    ? answers.processItems[processId]?.[q.code]
                    : answers.items[q.code];
                  return (
                    <Scale
                      key={q.code}
                      name={`${processId ?? "item"}-${q.code}`}
                      legend={q.wording}
                      anchors={q.anchors}
                      value={value}
                      showEnds={screen.scaleLine === null}
                      onChange={(v) =>
                        answer((a) =>
                          processId
                            ? {
                                ...a,
                                processItems: {
                                  ...a.processItems,
                                  [processId]: {
                                    ...(a.processItems[processId] ?? {}),
                                    [q.code]: v,
                                  },
                                },
                              }
                            : { ...a, items: { ...a.items, [q.code]: v } },
                        )
                      }
                    />
                  );
                })}
          </>
        ) : null}

        {screen.kind === "decision" ? (
          <DecisionScreen
            content={content}
            decisionType={screen.decisionType}
            heading={heading}
            value={answers.decisions[screen.decisionType.id] ?? { roles: {} }}
            onChange={(d) =>
              answer((a) => ({ ...a, decisions: { ...a.decisions, [screen.decisionType.id]: d } }))
            }
          />
        ) : null}

        {error ? (
          <p role="alert" className="mt-8 border-l-2 border-gold-deep bg-gold-10 px-4 py-2 text-sm">
            {error}
          </p>
        ) : null}
        <div className="mt-10 flex gap-3">
          <button
            type="button"
            className={`h-12 ${buttonClass("secondary")}`}
            onClick={() => (index === 0 ? setPhase("landing") : go(index - 1))}
          >
            {surveyCopy["nav.back"]}
          </button>
          <button
            type="submit"
            disabled={sending}
            className={`h-12 flex-1 ${buttonClass("primary")}`}
          >
            {last
              ? sending
                ? surveyCopy["nav.sending"]
                : surveyCopy["nav.submit"]
              : surveyCopy["nav.next"]}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function DecisionScreen({
  content,
  decisionType,
  heading,
  value,
  onChange,
}: {
  content: SurveyContent;
  decisionType: { id: string; name: string };
  heading: RefObject<HTMLHeadingElement | null>;
  value: { roles: Partial<Record<RoleKey, string[]>>; clarity?: number };
  onChange: (value: { roles: Partial<Record<RoleKey, string[]>>; clarity?: number }) => void;
}) {
  const options = [
    ...content.positions.map((p) => ({ id: p.id, label: p.title })),
    { id: "unclear", label: surveyCopy["leadership.unclear"] },
  ];
  return (
    <>
      <h1
        ref={heading}
        tabIndex={-1}
        className="font-display text-[26px] leading-tight font-medium text-slate"
      >
        {decisionType.name}
      </h1>
      {content.roles.map((role) => {
        const chosen = value.roles[role.key] ?? [];
        return (
          <fieldset key={role.key} className="mt-8">
            <legend className="text-[17px] leading-snug text-slate">{role.wording}</legend>
            <p className="mt-1 text-sm text-grey">
              {role.single ? surveyCopy["leadership.pickOne"] : surveyCopy["leadership.pickMany"]}
            </p>
            <div className="mt-2">
              {options.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-slate"
                >
                  <input
                    type={role.single ? "radio" : "checkbox"}
                    name={`${decisionType.id}-${role.key}`}
                    className="size-5 accent-slate"
                    checked={chosen.includes(option.id)}
                    onChange={(event) => {
                      const next = role.single
                        ? [option.id]
                        : event.target.checked
                          ? [...chosen, option.id]
                          : chosen.filter((id) => id !== option.id);
                      onChange({ ...value, roles: { ...value.roles, [role.key]: next } });
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      {content.clarity ? (
        <Scale
          name={`${decisionType.id}-clarity`}
          legend={content.clarity.wording}
          anchors={content.clarity.anchors}
          value={value.clarity}
          showEnds
          onChange={(clarity) => onChange({ ...value, clarity })}
        />
      ) : null}
    </>
  );
}

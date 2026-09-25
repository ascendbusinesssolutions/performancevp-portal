"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonClass } from "@/components/button";
import { managerCopy } from "@/lib/copy/manager";
import { fill } from "@/lib/copy/template";
import {
  askedOf,
  byKey,
  type FormReport,
  type Kind,
  needsEvidence,
  neededKeys,
  type RatingForm,
  ratingKey,
} from "@/lib/rating/form";

import { type RatingsToSave, saveRatings } from "./actions";

/**
 * The manager's rating form (Milestone 5 plan, 3.4 and D14; layout notes of 24 September 2026).
 * Direct reports on the left with their status; the open report on the right: skills, knowledge and
 * the overall band, each as five buttons. A rating saves as soon as it is chosen, except a 5 (or a
 * band of 5 or 1), which saves once its line of evidence is written. The manager's own earlier
 * ratings of the same person are shown as a pre-fill and saved only when the manager confirms the
 * report with "Done".
 */

export interface Anchors {
  skill: Array<{ value: number; label: string }>;
  knowledge: Array<{ value: number; label: string }>;
  band: Array<{ value: number; label: string }>;
}

interface Value {
  value: number;
  note: string | null;
}

const ROW = "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3";
const EVIDENCE = "mt-1 bg-slate-05 px-4 py-3";

function anchorLine(anchors: Anchors["skill"]): string {
  return [1, 3, 5]
    .map((v) => anchors.find((a) => a.value === v))
    .filter((a): a is { value: number; label: string } => Boolean(a))
    .map((a) => fill(managerCopy.anchor, { value: a.value, label: a.label }))
    .join(" · ");
}

function Buttons({
  name,
  labelledBy,
  anchors,
  value,
  disabled,
  onChoose,
}: {
  name: string;
  labelledBy: string;
  anchors: Anchors["skill"];
  value: number | undefined;
  disabled: boolean;
  onChoose: (value: number) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-labelledby={labelledBy}>
      {[1, 2, 3, 4, 5].map((v) => {
        const label = anchors.find((a) => a.value === v)?.label;
        return (
          <label
            key={v}
            className="flex size-10 cursor-pointer items-center justify-center rounded-control border border-grey-80 font-mono text-slate has-checked:border-slate has-checked:bg-slate has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-slate has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={v}
              checked={value === v}
              disabled={disabled}
              onChange={() => onChoose(v)}
              aria-label={label ? fill(managerCopy["scale.value"], { value: v, label }) : String(v)}
            />
            <span aria-hidden="true">{v}</span>
          </label>
        );
      })}
    </div>
  );
}

function Evidence({
  id,
  label,
  note,
  disabled,
  onChange,
  onCommit,
}: {
  id: string;
  label: string;
  note: string;
  disabled: boolean;
  onChange: (note: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className={EVIDENCE}>
      <label htmlFor={id} className="block text-sm text-slate">
        {label}
      </label>
      <input
        id={id}
        type="text"
        maxLength={500}
        value={note}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
          }
        }}
        className="mt-1 block w-full rounded-control border border-grey-80 bg-white px-3 py-2 text-slate focus:border-slate focus:outline-2 focus:outline-offset-2 focus:outline-slate"
      />
    </div>
  );
}

export function RatingFormView({
  form,
  anchors,
  eyebrow,
  closes,
  initialReport,
}: {
  form: RatingForm;
  anchors: Anchors;
  eyebrow: string;
  closes: string;
  initialReport: string | null;
}) {
  const open = form.campaign.status === "open";
  const prefill = useMemo(() => byKey(form.previous), [form]);
  const [saved, setSaved] = useState(() => byKey(form.ratings));
  const [draft, setDraft] = useState<Map<string, Value>>(new Map());
  const [current, setCurrent] = useState(
    form.reports.find((r) => r.subject === initialReport)?.subject ??
      form.reports.find(
        (r) =>
          !neededKeys(
            r,
            form.units.find((u) => u.campaignUnitId === r.campaignUnitId),
          ).every((k) => saved.has(k)),
      )?.subject ??
      form.reports[0]?.subject ??
      "",
  );
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const unitOf = (r: FormReport) => form.units.find((u) => u.campaignUnitId === r.campaignUnitId);
  const done = (r: FormReport) => {
    const keys = neededKeys(r, unitOf(r));
    return keys.length > 0 && keys.every((k) => saved.has(k));
  };
  const report = form.reports.find((r) => r.subject === current);
  const doneCount = form.reports.filter(done).length;

  const shown = (key: string): { value?: number; note: string; prefilled: boolean } => {
    const own = draft.get(key) ?? saved.get(key);
    if (own) return { value: own.value, note: own.note ?? "", prefilled: false };
    const earlier = prefill.get(key);
    return earlier
      ? { value: earlier.value, note: earlier.note ?? "", prefilled: true }
      : { note: "", prefilled: false };
  };

  async function persist(subject: string, payload: RatingsToSave, keys: Array<[string, Value]>) {
    setState("saving");
    setError(null);
    const result = await saveRatings(form.session.id, subject, payload);
    if (result.ok) {
      setSaved((s) => new Map([...s, ...keys]));
      setDraft((d) => {
        const next = new Map(d);
        for (const [k] of keys) next.delete(k);
        return next;
      });
      setState("saved");
      return true;
    }
    setState("idle");
    setError(
      managerCopy[
        result.error === "evidence"
          ? "error.evidence"
          : result.error === "closed"
            ? "error.closed"
            : "error.save"
      ],
    );
    return false;
  }

  function entry(kind: Kind, id: string | undefined, value: Value): RatingsToSave {
    return kind === "band"
      ? { band: value }
      : { [kind === "skill" ? "skills" : "knowledge"]: [{ id: id!, ...value }] };
  }

  function choose(kind: Kind, id: string | undefined, value: number) {
    if (!report) return;
    const key = ratingKey(report.subject, kind, id);
    const note = shown(key).note.trim();
    if (needsEvidence(kind, value) && !note) {
      setDraft((d) => new Map(d).set(key, { value, note: "" }));
      return;
    }
    const v: Value = { value, note: needsEvidence(kind, value) ? note : null };
    setDraft((d) => new Map(d).set(key, v));
    void persist(report.subject, entry(kind, id, v), [[key, v]]);
  }

  function writeNote(kind: Kind, id: string | undefined, note: string) {
    if (!report) return;
    const key = ratingKey(report.subject, kind, id);
    const value = shown(key).value;
    if (value === undefined) return;
    setDraft((d) => new Map(d).set(key, { value, note }));
  }

  function commitNote(kind: Kind, id: string | undefined) {
    if (!report) return;
    const key = ratingKey(report.subject, kind, id);
    const pending = draft.get(key);
    if (!pending || !pending.note?.trim()) return;
    const v = { value: pending.value, note: pending.note.trim() };
    void persist(report.subject, entry(kind, id, v), [[key, v]]);
  }

  const order = form.reports;
  const nextReport = report
    ? [...order.slice(order.indexOf(report) + 1), ...order.slice(0, order.indexOf(report))].find(
        (r) => !done(r),
      )
    : undefined;

  /** "Done": the pre-filled and pending ratings of this report are saved, then the next opens. */
  async function confirm() {
    if (!report) return;
    const asked = askedOf(report, unitOf(report));
    const payload: RatingsToSave = { skills: [], knowledge: [] };
    const keys: Array<[string, Value]> = [];
    const add = (kind: Kind, id?: string) => {
      const key = ratingKey(report.subject, kind, id);
      if (saved.has(key) && !draft.has(key)) return;
      const s = shown(key);
      if (s.value === undefined) return;
      const v: Value = {
        value: s.value,
        note: needsEvidence(kind, s.value) ? s.note.trim() : null,
      };
      if (needsEvidence(kind, s.value) && !v.note) return;
      keys.push([key, v]);
      if (kind === "band") payload.band = v;
      else (kind === "skill" ? payload.skills! : payload.knowledge!).push({ id: id!, ...v });
    };
    for (const s of asked.skills) add("skill", s.id);
    for (const d of asked.domains) add("knowledge", d.id);
    if (asked.band) add("band");
    const missingEvidence = neededKeys(report, unitOf(report)).some((key) => {
      const s = shown(key);
      const kind = key.split("|")[1] as Kind;
      return s.value !== undefined && needsEvidence(kind, s.value) && !s.note.trim();
    });
    if (missingEvidence) {
      setError(managerCopy["error.evidence"]);
      return;
    }
    if (keys.length > 0 && !(await persist(report.subject, payload, keys))) return;
    if (nextReport) move(nextReport.subject);
  }

  function move(subject: string) {
    setCurrent(subject);
    setError(null);
    setState("idle");
    window.history.replaceState(null, "", `?report=${subject}`);
    window.scrollTo(0, 0);
  }

  const unit = report ? unitOf(report) : undefined;
  const asked = report ? askedOf(report, unit) : undefined;
  const family = unit?.roleFamilies.find((f) => f.id === report?.roleFamilyId);
  const reportPrefilled =
    report !== undefined &&
    neededKeys(report, unit).some((k) => !saved.has(k) && !draft.has(k) && prefill.has(k));
  const noPrevious =
    form.previous.skills.length + form.previous.knowledge.length + form.previous.bands.length === 0;

  const row = (kind: Kind, id: string, name: ReactLabel) => {
    const key = ratingKey(report!.subject, kind, id);
    const s = shown(key);
    const five = s.value !== undefined && needsEvidence(kind, s.value);
    return (
      <li key={id} className="border-b border-grey-20" data-testid={`rate-${name.text}`}>
        <div>
          <div className={ROW}>
            <span id={`${key}-label`} className="text-slate">
              {name.text}
              {name.critical ? (
                <span className="ml-2 text-xs tracking-wide text-gold-deep uppercase">
                  {managerCopy.critical}
                </span>
              ) : null}
            </span>
            <Buttons
              name={key}
              labelledBy={`${key}-label`}
              anchors={kind === "skill" ? anchors.skill : anchors.knowledge}
              value={s.value}
              disabled={!open}
              onChoose={(v) => choose(kind, id, v)}
            />
          </div>
          {five ? (
            <Evidence
              id={`${key}-evidence`}
              label={managerCopy["evidence.five"]}
              note={s.note}
              disabled={!open}
              onChange={(note) => writeNote(kind, id, note)}
              onCommit={() => commitNote(kind, id)}
            />
          ) : null}
        </div>
      </li>
    );
  };

  const band = report ? shown(ratingKey(report.subject, "band")) : undefined;

  return (
    <div className="mx-auto max-w-[1160px] px-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-8 pt-10 pb-8">
        <div>
          <p className="text-[13px] tracking-wide text-grey uppercase">{eyebrow}</p>
          <h1 className="mt-2 font-display text-title font-medium text-slate">
            {managerCopy.title}
          </h1>
          <p className="mt-3 text-sm text-grey" data-testid="rating-meta">
            {fill(managerCopy.meta, { done: doneCount, total: form.reports.length, date: closes })}
          </p>
        </div>
        <p className="max-w-[380px] text-sm text-grey">{managerCopy.identified}</p>
      </div>
      {!open ? (
        <p role="status" className="mb-6 border-l-2 border-slate-40 bg-slate-05 px-4 py-2 text-sm">
          {managerCopy["error.closed"]}
        </p>
      ) : null}

      <div className="grid gap-10 border-t border-grey-20 pt-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label={managerCopy["list.label"]}>
          <ul className="border-t border-grey-20">
            {form.reports.map((r) => {
              const status = r.subject === current ? "open" : done(r) ? "done" : "todo";
              return (
                <li key={r.subject} className="border-b border-grey-20">
                  <button
                    type="button"
                    onClick={() => move(r.subject)}
                    aria-current={r.subject === current ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-4 px-3 py-3 text-left text-sm text-slate focus-visible:outline-2 focus-visible:outline-slate ${
                      r.subject === current ? "bg-slate-05" : "hover:bg-grey-10"
                    }`}
                    data-testid={`report-${r.name}`}
                  >
                    <span>{r.name}</span>
                    <span className="text-xs text-grey">{managerCopy[`status.${status}`]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-grey">{managerCopy.missing}</p>
        </nav>

        {report && asked ? (
          <section aria-labelledby="report-name">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="report-name" className="font-display text-[30px] leading-tight text-slate">
                  {report.name}
                </h2>
                <p className="mt-1 text-sm text-grey">
                  {report.team
                    ? fill(managerCopy["report.meta"], {
                        family: family?.name ?? report.roleTitle ?? "",
                        team: report.team,
                        fte: report.fte,
                        start: startLabel(report.startDate),
                      })
                    : fill(managerCopy["report.metaNoTeam"], {
                        family: family?.name ?? report.roleTitle ?? "",
                        fte: report.fte,
                        start: startLabel(report.startDate),
                      })}
                </p>
              </div>
              <p className="text-sm text-grey">
                {reportPrefilled ? managerCopy.prefilled : noPrevious ? managerCopy.firstTime : ""}
              </p>
            </div>

            {asked.skills.length > 0 ? (
              <div className="mt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-grey-20 pb-2">
                  <h3 className="font-display text-xl text-slate">{managerCopy["skills.title"]}</h3>
                  <p className="text-xs text-grey">{anchorLine(anchors.skill)}</p>
                </div>
                <ul>
                  {asked.skills.map((s) =>
                    row("skill", s.id, { text: s.name, critical: s.critical }),
                  )}
                </ul>
              </div>
            ) : null}

            {asked.domains.length > 0 ? (
              <div className="mt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-grey-20 pb-2">
                  <h3 className="font-display text-xl text-slate">
                    {managerCopy["knowledge.title"]}
                  </h3>
                  <p className="text-xs text-grey">{anchorLine(anchors.knowledge)}</p>
                </div>
                <ul>
                  {asked.domains.map((d) =>
                    row("knowledge", d.id, { text: d.name, critical: d.criticality === 3 }),
                  )}
                </ul>
              </div>
            ) : null}

            {asked.band && band ? (
              <fieldset className="mt-8">
                <legend className="font-display text-xl text-slate">
                  {managerCopy["band.title"]}
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  {anchors.band.map((a) => (
                    <label
                      key={a.value}
                      className="flex cursor-pointer flex-col gap-1 rounded-control border border-grey-80 p-3 text-sm text-slate has-checked:border-2 has-checked:border-slate has-checked:bg-slate-05 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-slate"
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`${report.subject}-band`}
                        value={a.value}
                        checked={band.value === a.value}
                        disabled={!open}
                        onChange={() => choose("band", undefined, a.value)}
                      />
                      <span className="font-mono text-lg">{a.value}</span>
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
                {band.value !== undefined && needsEvidence("band", band.value) ? null : (
                  <p className="mt-2 text-sm text-grey">{managerCopy["evidence.band"]}</p>
                )}
                {band.value !== undefined && needsEvidence("band", band.value) ? (
                  <Evidence
                    id={`${report.subject}-band-evidence`}
                    label={managerCopy["evidence.band"]}
                    note={band.note}
                    disabled={!open}
                    onChange={(note) => writeNote("band", undefined, note)}
                    onCommit={() => commitNote("band", undefined)}
                  />
                ) : null}
              </fieldset>
            ) : unit?.c3Route === "formal" ? (
              <p className="mt-8 text-sm text-grey">
                {fill(managerCopy.formalRoute, { unit: unit.name })}
              </p>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="mt-6 border-l-2 border-gold-deep bg-gold-10 px-4 py-2 text-sm"
              >
                {error}
              </p>
            ) : null}
            {!nextReport && done(report) ? (
              <p role="status" className="mt-6 text-sm text-slate">
                {managerCopy.allDone}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              {open ? (
                <button
                  type="button"
                  className={buttonClass("primary")}
                  onClick={() => void confirm()}
                >
                  {nextReport
                    ? fill(managerCopy.next, { name: nextReport.name })
                    : managerCopy.finish}
                </button>
              ) : null}
              <Link
                href="/"
                className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
              >
                {managerCopy.later}
              </Link>
              <span role="status" className="text-sm text-grey">
                {state === "saving"
                  ? managerCopy.saving
                  : state === "saved"
                    ? managerCopy.saved
                    : ""}
              </span>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function startLabel(date: string | null): string {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
}

interface ReactLabel {
  text: string;
  critical: boolean;
}

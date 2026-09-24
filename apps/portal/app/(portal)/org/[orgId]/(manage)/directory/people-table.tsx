"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonClass } from "@/components/button";
import { Head, Row, Table, Td, Th } from "@/components/table";
import { INPUT_CLASS } from "@/components/ui";
import { directoryCopy } from "@/lib/copy/directory";
import { fill } from "@/lib/copy/template";

export interface PersonListRow {
  id: string;
  ref: string;
  name: string;
  unit: string;
  manager: string;
  fte: number;
  teamLeader: boolean;
  leadershipTeam: boolean;
}

const PAGE_SIZE = 100;

/**
 * The people in the directory, found by name or employee ID in the browser. The search never
 * reaches a URL, because a name in a query string would be personal data in a URL (CLAUDE.md
 * Section 4); the unit and "missing" filters, which carry no personal data, are applied by the page.
 */
export function PeopleTable({ orgId, rows }: { orgId: string; rows: PersonListRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q));
  }, [rows, query]);
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = matched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block w-full max-w-sm">
          <span className="block text-sm text-grey">{directoryCopy["people.search"]}</span>
          <input
            type="search"
            className={INPUT_CLASS}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <p className="text-sm text-grey" aria-live="polite" data-testid="people-count">
          {fill(directoryCopy["people.count"], { shown: matched.length, total: rows.length })}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-grey">{directoryCopy["people.none"]}</p>
      ) : (
        <div className="mt-6">
          <Table testId="people">
            <Head>
              <Th>{directoryCopy["page.col.id"]}</Th>
              <Th>{directoryCopy["page.col.name"]}</Th>
              <Th>{directoryCopy["page.col.unit"]}</Th>
              <Th>{directoryCopy["page.col.manager"]}</Th>
              <Th align="right">{directoryCopy["page.col.fte"]}</Th>
              <Th>{directoryCopy["people.col.flags"]}</Th>
              <Th />
            </Head>
            <tbody>
              {shown.map((r) => (
                <Row key={r.id}>
                  <Td figure muted>
                    {r.ref}
                  </Td>
                  <Td>{r.name}</Td>
                  <Td muted>{r.unit}</Td>
                  <Td figure muted>
                    {r.manager}
                  </Td>
                  <Td figure muted align="right">
                    {r.fte}
                  </Td>
                  <Td muted>
                    {[
                      r.teamLeader ? directoryCopy["people.flag.teamLeader"] : null,
                      r.leadershipTeam ? directoryCopy["people.flag.leadershipTeam"] : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Td>
                  <Td align="right">
                    <Link
                      className="text-sm text-slate underline underline-offset-4 hover:text-gold-deep"
                      href={`/org/${orgId}/directory/people/${r.id}`}
                      aria-label={`${directoryCopy["people.edit"]} ${r.name}`}
                    >
                      {directoryCopy["people.edit"]}
                    </Link>
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-6 flex items-center gap-6 text-sm">
          <button
            type="button"
            className={buttonClass("quiet")}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            {directoryCopy["people.previous"]}
          </button>
          <span className="text-grey">
            {fill(directoryCopy["people.page"], { page: current, pages })}
          </span>
          <button
            type="button"
            className={buttonClass("quiet")}
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            {directoryCopy["people.next"]}
          </button>
        </div>
      ) : null}
    </div>
  );
}

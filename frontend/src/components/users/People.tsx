import { PageHeading } from "../ui/PageHeading.js";
﻿import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { Avatar } from "./Avatar.js";
type Person = {
  id: string;
  fullName: string;
  username: string;
  role: string;
  bio: string;
  avatarUrl?: string;
};
export function People() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ users: Person[]; pages: number }>({
    users: [],
    pages: 1,
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .request<typeof result>(
          `/users?search=${encodeURIComponent(search)}&page=${page}`,
          { signal: controller.signal },
        )
        .then(setResult)
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page]);
  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Better, together" title="People" description="Discover faculty profiles and the people connected to you. Student profiles are visible only to themselves, their connected professors and administrators." />
      <input
        aria-label="Search people"
            maxLength={120}
        placeholder="Search name or username"
        className="w-full max-w-md rounded-xl border px-4 py-3"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {error && <p role="alert">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.users.map((person) => (
          <article
            key={person.id}
            className="person-card ui-panel space-y-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                userId={person.id}
                name={person.fullName}
                url={person.avatarUrl}
                size="h-14 w-14"
              />
              <div className="min-w-0 break-words">
                <h2 className="font-bold">{person.fullName}</h2>
                <p className="text-sm text-slate-500">
                  @{person.username} · {person.role}
                </p>
              </div>
            </div>
            <p className="text-sm whitespace-pre-line break-words">
              {person.bio || "No bio yet."}
            </p>
          </article>
        ))}
      </div>
      {!result.users.length && <p>No people found.</p>}
      <div className="pagination-row">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="rounded-xl border px-4 py-2 disabled:opacity-40"
        >
          Previous page
        </button>
        <span>
          Page {page} of {result.pages}
        </span>
        <button
          disabled={page >= result.pages}
          onClick={() => setPage(page + 1)}
          className="rounded-xl border px-4 py-2 disabled:opacity-40"
        >
          Next page
        </button>
      </div>
    </div>
  );
}

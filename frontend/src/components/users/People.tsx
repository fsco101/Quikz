import React, { useEffect, useState } from "react";
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
      <h1 className="text-3xl font-black text-[#070235]">People</h1>
      <p className="text-slate-600">
        Meet the faculty, students and administrators in Quikz.
      </p>
      <input
        aria-label="Search people"
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
            className="rounded-2xl border bg-white p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Avatar
                userId={person.id}
                name={person.fullName}
                url={person.avatarUrl}
                size="h-14 w-14"
              />
              <div>
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
      <div className="flex items-center gap-4">
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

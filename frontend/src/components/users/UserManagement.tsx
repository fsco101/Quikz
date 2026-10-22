import { useAuth } from "../../context/AuthContext.js";
import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { User } from "../../types/auth.js";
import { Avatar } from "./Avatar.js";
const blank = {
  fullName: "",
  surname: "",
  username: "",
  email: "",
  role: "student",
  yearLevel: "1st Year",
  section: "Section A",
  active: true,
  password: "",
  termsAccepted: false,
};
const field = "mt-1 w-full rounded-xl border px-3 py-2 bg-white";
export function UserManagement() {
  const { user: signedInUser, updateUser, logout } = useAuth();
  const [result, setResult] = useState<{
    users: User[];
    total: number;
    pages: number;
  }>({ users: [], total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<string | null | undefined>();
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .request<typeof result>(
          `/admin/users?search=${encodeURIComponent(search)}&role=${role}&status=${status}&page=${page}`,
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
  }, [search, role, status, page, reload]);
  const change = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body: any = { ...draft };
      if (editing && !body.password) delete body.password;
      const saved = await api.request<{ user: User }>(
        editing ? `/admin/users/${editing}` : "/admin/users",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      if (saved.user.id === signedInUser?.id) {
        if (body.password) {
          logout();
          return;
        }
        updateUser(saved.user);
      }
      setNotice(
        editing
          ? "User updated. Account permissions take effect immediately."
          : "User created.",
      );
      setEditing(undefined);
      setReload((n) => n + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#070235]">
            User management
          </h1>
          <p className="mt-2 text-slate-600">
            Create accounts, update roles, reset passwords and manage account
            access.
          </p>
        </div>
        <button
          className="rounded-xl bg-[#4648d4] px-4 py-2 font-bold text-white"
          onClick={() => {
            setEditing(null);
            setDraft({ ...blank });
            setError("");
          }}
        >
          Create user
        </button>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          {notice}
        </p>
      )}
      {editing !== undefined && (
        <form
          onSubmit={save}
          className="rounded-2xl border bg-white p-6 grid gap-4 sm:grid-cols-2"
        >
          <h2 className="sm:col-span-2 text-xl font-bold">
            {editing ? "Edit user" : "New user"}
          </h2>
          {(
            [
              ["fullName", "Full name"],
              ["surname", "Surname"],
              ["username", "Username"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                className={field}
                aria-label={`User ${label.toLowerCase()}`}
                type={key === "email" ? "email" : "text"}
                required
                value={draft[key]}
                onChange={(e) => change(key, e.target.value)}
              />
            </label>
          ))}
          <label className="text-sm font-bold">
            Role
            <select
              aria-label="User role"
              className={field}
              value={draft.role}
              onChange={(e) => change("role", e.target.value)}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty / Professor</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            {editing
              ? "Reset password (leave blank to keep current)"
              : "Initial password"}
            <input
              aria-label="User password"
              type="password"
              autoComplete="new-password"
              className={field}
              required={!editing}
              minLength={6}
              value={draft.password}
              onChange={(e) => change("password", e.target.value)}
            />
          </label>
          {draft.role === "student" && (
            <>
              <label className="text-sm font-bold">
                Year level
                <select
                  aria-label="User year level"
                  className={field}
                  value={draft.yearLevel}
                  onChange={(e) => change("yearLevel", e.target.value)}
                >
                  {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(
                    (year) => (
                      <option key={year}>{year}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="text-sm font-bold">
                Section
                <select
                  aria-label="User section"
                  className={field}
                  value={draft.section}
                  onChange={(e) => change("section", e.target.value)}
                >
                  {["Section A", "Section B", "Section C", "Section D"].map(
                    (section) => (
                      <option key={section}>{section}</option>
                    ),
                  )}
                </select>
              </label>
            </>
          )}
          {editing ? (
            <label className="sm:col-span-2 flex items-center gap-2">
              <input
                aria-label="Account active"
                type="checkbox"
                checked={draft.active}
                onChange={(e) => change("active", e.target.checked)}
              />
              Account active (disabled users cannot sign in or continue existing
              sessions)
            </label>
          ) : (
            <label className="sm:col-span-2 flex items-center gap-2">
              <input
                aria-label="Confirm user accepted terms"
                type="checkbox"
                required
                checked={draft.termsAccepted}
                onChange={(e) => change("termsAccepted", e.target.checked)}
              />
              I confirm this user has accepted the Terms and Academic Honor
              Code.
            </label>
          )}
          <p className="sm:col-span-2 text-sm text-slate-500">
            Disable accounts to preserve their course ownership and academic
            records. You cannot disable or demote your own administrator
            account.
          </p>
          <div className="sm:col-span-2 flex gap-3">
            <button
              disabled={busy}
              className="rounded-xl bg-[#4648d4] px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              Save user
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border px-4 py-2"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            aria-label="Search users"
            placeholder="Search name, username or email"
            className={field}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter users by role"
            className={field}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option value="admin">Administrator</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
          <select
            aria-label="Filter users by status"
            className={field}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All accounts</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        userId={u.id}
                        name={u.fullName}
                        url={u.avatarUrl}
                      />
                      <div className="font-bold">
                        {u.fullName}
                        <p className="font-normal text-slate-500">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="pr-3">{u.email}</td>
                  <td className="pr-3 capitalize">{u.role}</td>
                  <td className="pr-3">
                    {u.active === false ? "Disabled" : "Active"}
                  </td>
                  <td>
                    <button
                      aria-label={`Edit ${u.fullName}`}
                      className="rounded-lg border px-3 py-2"
                      onClick={() => {
                        setEditing(u.id);
                        setDraft({
                          ...blank,
                          ...u,
                          active: u.active !== false,
                          password: "",
                        });
                        setError("");
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.users.length && <p>No users match these filters.</p>}
        <div className="flex flex-wrap items-center gap-4">
          <span>
            {result.total} users · Page {page} of {result.pages}
          </span>
          <button
            className="rounded-xl border px-4 py-2 disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </button>
          <button
            className="rounded-xl border px-4 py-2 disabled:opacity-40"
            disabled={page >= result.pages}
            onClick={() => setPage(page + 1)}
          >
            Next page
          </button>
        </div>
      </section>
    </div>
  );
}

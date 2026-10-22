import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import { api } from "../../services/api.js";
import { User } from "../../types/auth.js";
import { Avatar } from "./Avatar.js";
const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2";
const button =
  "rounded-xl bg-[#4648d4] px-4 py-2 text-white font-bold disabled:opacity-50";
export function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [draft, setDraft] = useState({
    fullName: user!.fullName,
    surname: user!.surname,
    username: user!.username,
    email: user!.email,
    bio: user!.bio || "",
    yearLevel: user!.yearLevel || "1st Year",
    section: user!.section || "Section A",
  });
  const [file, setFile] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const change = (key: keyof typeof draft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-black text-[#070235]">My profile</h1>
        <p className="mt-2 text-slate-600">
          Update your account and the profile others see in Quikz.
        </p>
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
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <h2 className="text-xl font-bold">Profile avatar</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            userId={user!.id}
            name={user!.fullName}
            url={user!.avatarUrl}
            size="h-20 w-20"
          />
          <p className="text-sm text-slate-600">
            Visible to others in the people directory, courses and gradebooks.
            PNG, JPEG or WebP, up to 5 MB.
          </p>
        </div>
        <label className="block text-sm font-bold">
          Choose avatar
          <input
            aria-label="Choose avatar"
            className="mt-2 block max-w-full"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="flex gap-3">
          <button
            disabled={!file || busy}
            className={button}
            onClick={() =>
              void perform(async () => {
                const data = new FormData();
                data.append("avatar", file!);
                const result = await api.request<{ user: User }>(
                  "/users/me/avatar",
                  { method: "POST", body: data },
                );
                updateUser(result.user);
                setFile(null);
                setNotice("Avatar updated. Others can now see it.");
              })
            }
          >
            Upload avatar
          </button>
          {user?.avatarUrl && (
            <button
              disabled={busy}
              className="rounded-xl border px-4 py-2"
              onClick={() =>
                void perform(async () => {
                  const result = await api.request<{ user: User }>(
                    "/users/me/avatar",
                    { method: "DELETE" },
                  );
                  updateUser(result.user);
                  setNotice("Avatar removed.");
                })
              }
            >
              Remove avatar
            </button>
          )}
        </div>
      </section>
      <form
        className="rounded-2xl border bg-white p-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            const result = await api.request<{ user: User }>("/users/me", {
              method: "PATCH",
              body: JSON.stringify(draft),
            });
            updateUser(result.user);
            setNotice("Profile updated.");
          });
        }}
      >
        <h2 className="sm:col-span-2 text-xl font-bold">Account details</h2>
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
              aria-label={label}
              type={key === "email" ? "email" : "text"}
              value={draft[key]}
              required
              maxLength={key === "email" ? 254 : key === "username" ? 40 : 120}
              onChange={(e) => change(key, e.target.value)}
            />
          </label>
        ))}
        <label className="sm:col-span-2 text-sm font-bold">
          Public bio
          <textarea
            aria-label="Public bio"
            className={field}
            maxLength={500}
            value={draft.bio}
            onChange={(e) => change("bio", e.target.value)}
          />
          <span className="font-normal text-slate-500">
            Your name, username, role, bio and avatar are visible to signed-in
            users. Email is private.
          </span>
        </label>
        {user?.role === "student" && (
          <>
            <label className="text-sm font-bold">
              Year level
              <select
                aria-label="Profile year level"
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
                aria-label="Profile section"
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
        <div className="sm:col-span-2">
          <button disabled={busy} className={button}>
            Save profile
          </button>
        </div>
      </form>
      <form
        className="rounded-2xl border bg-white p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void perform(async () => {
            await api.request("/users/me/password", {
              method: "POST",
              body: JSON.stringify(passwords),
            });
            logout();
          });
        }}
      >
        <h2 className="text-xl font-bold">Change password</h2>
        <p className="text-sm text-slate-600">
          Changing your password signs out your sessions. Sign in again with the
          new password.
        </p>
        <label className="block text-sm font-bold">
          Current password
          <input
            aria-label="Current password"
            type="password"
            autoComplete="current-password"
            required
            className={field}
            value={passwords.currentPassword}
            onChange={(e) =>
              setPasswords({ ...passwords, currentPassword: e.target.value })
            }
          />
        </label>
        <label className="block text-sm font-bold">
          New password
          <input
            aria-label="New password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className={field}
            value={passwords.newPassword}
            onChange={(e) =>
              setPasswords({ ...passwords, newPassword: e.target.value })
            }
          />
        </label>
        <button disabled={busy} className={button}>
          Change password and sign out
        </button>
      </form>
    </div>
  );
}

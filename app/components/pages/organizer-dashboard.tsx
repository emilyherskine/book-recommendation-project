"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { BlindDateRecord } from "@/app/lib/request-store";

type ViewState = "loading" | "login" | "ready" | "error";

type Loaded =
  | { view: "login" }
  | { view: "ready"; requests: BlindDateRecord[] }
  | { view: "error"; message: string };

async function fetchRequests(): Promise<Loaded> {
  try {
    const response = await fetch("/api/organizer/requests");
    if (response.status === 401) return { view: "login" };
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load requests.");
    return { view: "ready", requests: result.requests };
  } catch (reason) {
    return {
      view: "error",
      message: reason instanceof Error ? reason.message : "Could not load requests.",
    };
  }
}

function applyLoaded(
  result: Loaded,
  set: {
    setView: (view: ViewState) => void;
    setRequests: (requests: BlindDateRecord[]) => void;
    setMessage: (message: string) => void;
  },
) {
  if (result.view === "ready") set.setRequests(result.requests);
  if (result.view === "error") set.setMessage(result.message);
  set.setView(result.view);
}

export function OrganizerDashboard() {
  const [view, setView] = useState<ViewState>("loading");
  const [requests, setRequests] = useState<BlindDateRecord[]>([]);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const refresh = () => fetchRequests().then((result) => applyLoaded(result, setters));
  const setters = { setView, setRequests, setMessage };

  useEffect(() => {
    let active = true;
    fetchRequests().then((result) => {
      if (active) applyLoaded(result, { setView, setRequests, setMessage });
    });
    return () => {
      active = false;
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/organizer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setMessage((await response.json()).error ?? "Could not sign in.");
      return;
    }
    setPassword("");
    await refresh();
  }

  async function signOut() {
    await fetch("/api/organizer/logout", { method: "POST" });
    setRequests([]);
    setView("login");
  }

  async function setStatus(requestId: string, status: BlindDateRecord["status"]) {
    const response = await fetch("/api/organizer/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    if (response.ok) {
      setRequests((current) =>
        current.map((item) => (item.requestId === requestId ? { ...item, status } : item)),
      );
    }
  }

  if (view === "loading") return <p aria-live="polite">Opening the organizer room…</p>;

  if (view === "login") {
    return (
      <form className="organizer-login" onSubmit={signIn}>
        <p className="eyebrow">THE ORGANIZER ROOM</p>
        <h1>Sign in to see the sealed picks</h1>
        <label htmlFor="organizer-password">Organizer password</label>
        <input
          autoComplete="current-password"
          id="organizer-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <button className="button button-primary" type="submit">
          Enter
        </button>
        {message && (
          <p aria-live="polite" className="form-error">
            {message}
          </p>
        )}
      </form>
    );
  }

  if (view === "error") return <p className="form-error">{message}</p>;

  const waiting = requests.filter((item) => item.status === "new").length;
  return (
    <section className="organizer-board">
      <header className="organizer-header">
        <div>
          <p className="eyebrow">BLIND DATES WITH A BOOK</p>
          <h1>Sealed picks</h1>
          <p>
            {requests.length
              ? `${waiting} waiting · ${requests.length - waiting} delivered`
              : "No requests yet."}
          </p>
        </div>
        <button className="button button-secondary" onClick={signOut} type="button">
          Sign out
        </button>
      </header>
      <ul className="organizer-list">
        {requests.map((item) => (
          <li className={`organizer-card organizer-${item.status}`} key={item.requestId}>
            <div>
              <h2>{item.selection.title}</h2>
              <p>
                {item.selection.authors.join(", ") || "Author unknown"}
                {item.selection.pageCount ? ` · ${item.selection.pageCount} pages` : ""}
              </p>
              {item.selection.preferenceMatch.length > 0 && (
                <ul className="organizer-reasons">
                  {item.selection.preferenceMatch.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
            <dl>
              <dt>For</dt>
              <dd>
                {item.recipient.name} ·{" "}
                <a href={`mailto:${item.recipient.email}`}>{item.recipient.email}</a>
              </dd>
              <dt>Delivery</dt>
              <dd>
                {item.recipient.fulfillment === "ship to me" ? "Ship" : "Club pickup"}
                {item.recipient.shippingAddress && (
                  <span className="organizer-address">{item.recipient.shippingAddress}</span>
                )}
              </dd>
              <dt>Wants</dt>
              <dd>
                {item.preferences.mode} · {item.preferences.readingFormat} ·{" "}
                {item.preferences.bookLength} · {"🌶".repeat(item.preferences.spiceLevel)}
                {item.preferences.genres.length > 0 && ` · ${item.preferences.genres.join(", ")}`}
              </dd>
              <dt>Sent</dt>
              <dd>{new Date(item.createdAt).toLocaleString()}</dd>
            </dl>
            <button
              className="button button-secondary"
              onClick={() => setStatus(item.requestId, item.status === "new" ? "fulfilled" : "new")}
              type="button"
            >
              {item.status === "new" ? "Mark delivered" : "Undo delivered"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

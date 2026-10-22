import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
export const telemetry = {
  mode: "disconnected",
  connectedAt: null as string | null,
  lastTopologyChange: null as string | null,
  topologyChanges: 0,
  poolClears: 0,
  checkoutFailures: 0,
  checkedOut: 0,
  observedConnectionsOpened: 0,
  observedConnectionsClosed: 0,
  auditFailures: 0,
  auditWriteHealthy: true,
};
let monitored: unknown;
export function monitorDatabase(mode: string) {
  telemetry.mode = mode;
  telemetry.connectedAt = new Date().toISOString();
  const client = mongoose.connection.getClient();
  if (monitored === client) return;
  monitored = client;
  client.on("connectionCreated", () => {
    telemetry.observedConnectionsOpened++;
  });
  client.on("connectionClosed", () => {
    telemetry.observedConnectionsClosed++;
  });
  client.on("connectionCheckedOut", () => {
    telemetry.checkedOut++;
  });
  client.on("connectionCheckedIn", () => {
    telemetry.checkedOut = Math.max(0, telemetry.checkedOut - 1);
  });
  client.on("connectionCheckOutFailed", () => {
    telemetry.checkoutFailures++;
  });
  client.on("connectionPoolCleared", () => {
    telemetry.poolClears++;
  });
  client.on("topologyDescriptionChanged", () => {
    telemetry.topologyChanges++;
    telemetry.lastTopologyChange = new Date().toISOString();
  });
}
export async function databaseHealth() {
  const started = performance.now();
  const database = mongoose.connection.db;
  const base = {
    ...telemetry,
    readyState: mongoose.connection.readyState,
    persistent: telemetry.mode === "mongodb",
    checkedAt: new Date().toISOString(),
  };
  if (mongoose.connection.readyState !== 1 || !database)
    return {
      ...base,
      status: "unavailable",
      pingMs: null,
      writeReadVerified: false,
    };
  try {
    const pingStart = performance.now();
    await database.command({ ping: 1 }, { timeoutMS: 3000 });
    const pingMs = Math.round((performance.now() - pingStart) * 100) / 100;
    const nonce = randomUUID();
    const probes = database.collection<{ _id: string; nonce: string }>(
      "system_sync_probes",
    );
    try {
      await probes.insertOne({ _id: nonce, nonce }, { timeoutMS: 3000 });
      const saved = await probes.findOne({ _id: nonce }, { timeoutMS: 3000 });
      if (saved?.nonce !== nonce)
        throw new Error("Write/read verification failed.");
    } finally {
      await probes.deleteOne({ _id: nonce }, { timeoutMS: 3000 });
    }
    return {
      ...base,
      status: telemetry.auditWriteHealthy ? "ok" : "degraded",
      pingMs,
      writeReadVerified: true,
      syncCheckMs: Math.round(performance.now() - started),
    };
  } catch {
    return {
      ...base,
      status: "degraded",
      pingMs: null,
      writeReadVerified: false,
    };
  }
}

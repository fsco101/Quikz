import mongoose from "mongoose";
import net from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import { monitorDatabase, telemetry } from "../services/telemetry.js";

let mongod: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== "") {
    try {
      console.log("Connecting to MongoDB Atlas at provided URI...");
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      monitorDatabase("mongodb");
      console.log("MongoDB Atlas Connected Successfully!");
      return mongoose;
    } catch (err: any) {
      throw new Error(
        "Configured MongoDB connection failed. Check connectivity and credentials. Ephemeral fallback is disabled when MONGODB_URI is set.",
      );
    }
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("MONGODB_URI is required in production.");

  console.log("Starting resilient In-Memory MongoDB Server...");
  // Ask the OS for an available port to avoid Windows excluded port ranges.
  const port = await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = (probe.address() as net.AddressInfo).port;
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
  mongod = await MongoMemoryServer.create({
    instance: { port, ip: "127.0.0.1" },
  });
  const memoryUri = mongod.getUri();
  await mongoose.connect(memoryUri);
  monitorDatabase("ephemeral");
  console.log(`Connected to In-Memory MongoDB at: ${memoryUri}`);
  return mongoose;
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  telemetry.mode = "disconnected";
  if (mongod) {
    await mongod.stop();
  }
};

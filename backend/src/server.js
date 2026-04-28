import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  getAllBuses,
  getAlternativeForUser,
  getDestination,
  getEtaByBusId,
  upsertBusLocation,
} from "./data/store.js";
import { startBusSimulator } from "./simulator/busSimulator.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.use(express.json());

function validateLocationPayload(body) {
  const required = ["bus_id", "lat", "lng", "speed", "timestamp"];
  const missing = required.filter((key) => body[key] === undefined || body[key] === null);

  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (!Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lng))) {
    return "lat and lng must be valid numbers";
  }

  if (!Number.isFinite(Number(body.speed))) {
    return "speed must be a valid number";
  }

  return null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "smart-bus-backend" });
});

app.post("/api/location", (req, res) => {
  const error = validateLocationPayload(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  const bus = upsertBusLocation(req.body);
  io.emit("bus-location", bus);
  return res.status(200).json({ success: true, bus });
});

app.get("/api/buses", (_req, res) => {
  res.json({
    destination: getDestination(),
    buses: getAllBuses(),
  });
});

app.get("/api/eta/:bus_id", (req, res) => {
  const eta = getEtaByBusId(req.params.bus_id);
  if (!eta) {
    return res.status(404).json({ error: "Bus not found" });
  }

  return res.json(eta);
});

app.get("/api/alternatives", (req, res) => {
  const { lat, lng } = req.query;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return res.status(400).json({ error: "lat and lng query params are required" });
  }

  const alternatives = getAlternativeForUser(lat, lng);
  return res.json(alternatives);
});

io.on("connection", (socket) => {
  socket.emit("init-buses", getAllBuses());
});

const stopSimulator = startBusSimulator({
  onTick: (payload) => {
    const bus = upsertBusLocation(payload);
    io.emit("bus-location", bus);
  },
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  stopSimulator();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopSimulator();
  process.exit(0);
});

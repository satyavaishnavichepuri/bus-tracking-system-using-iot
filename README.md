# VCE BusTrack Architecture (Production Design)

This document describes the intended production architecture for a real-time college bus tracking platform powered by on-vehicle IoT telemetry.

Scope of this README:
- Real hardware data ingestion (ESP32 + GPS)
- Real-time transport and state updates
- ETA and missed-bus decisioning
- Student and admin application behavior
- Deployment and operational model

No simulation or fallback assumptions are used in this architecture document.

## Goals

- Deliver live fleet visibility for students and transport administrators.
- Predict practical ETA to destination and boarding points.
- Provide actionable alternatives when a bus is missed.
- Keep latency low from device publish to user UI update.
- Support secure device onboarding and production-scale operations.

## System Overview

The platform has four major layers:

1. `Edge / Device Layer`
- ESP32 devices installed in buses read GNSS coordinates and speed.
- Each device publishes signed telemetry packets at fixed intervals.

2. `Ingestion + API Layer`
- Node.js backend accepts telemetry through authenticated REST endpoints.
- Payloads are validated, normalized, enriched, and stored.

3. `Realtime + Decision Layer`
- Location updates are broadcast over Socket.io.
- ETA engine computes route-aware estimates.
- Alternate-bus engine computes area-based rescue options.

4. `Experience Layer`
- React frontend renders student and admin workflows.
- Live map, stop progression, alerts, and route alternatives are presented in real time.

## Architecture Diagram

```text
ESP32 + GPS (Bus Devices)
				|
				| HTTPS POST /api/location (signed payload)
				v
Backend Ingestion (Express)
	- schema validation
	- auth verification
	- enrichment (distance, ETA)
	- persistence
				|
				+--> REST APIs (/api/buses, /api/eta/:id, /api/alternatives)
				|
				+--> Socket.io Events (init-buses, bus-location)
								|
								v
				 React Frontend (Student/Admin)
```

## Repository Structure

```text
bus-tracking-system-using-iot-main/
	src/                      # Frontend (React + Vite)
		App.jsx
		App.css
		main.jsx
	backend/                  # Backend (Node + Express + Socket.io)
		src/
			server.js
			data/store.js
			utils/geo.js
			simulator/            # kept in repo; not part of production architecture
		models/
		package.json
	README.md
```

## Core Backend Modules

### 1) Telemetry Ingestion

Endpoint: `POST /api/location`

Responsibilities:
- Authenticate device request.
- Validate payload fields and value ranges.
- Normalize data types.
- Enrich with derived fields:
	- `distance_km`
	- `eta_minutes`
	- `updated_at`
- Publish update to realtime channel.

Required payload:

```json
{
	"bus_id": "BUS_2",
	"lat": 17.3956,
	"lng": 78.4341,
	"speed": 31,
	"timestamp": "2026-04-24T08:15:22.000Z"
}
```

### 2) Realtime Distribution

Socket events:
- `init-buses`: full latest fleet snapshot at connect time.
- `bus-location`: incremental bus update pushed per telemetry packet.

Design intent:
- Keep client state near-real-time.
- Avoid polling pressure for live motion.

### 3) ETA Engine (Classical)

Current production-default design uses a deterministic ETA method in `backend/src/utils/geo.js`:
- Haversine distance between current position and destination.
- Effective speed normalization.
- Time-of-day traffic multiplier.
- Operational buffer to avoid over-optimistic estimates.

Output:
- `eta_minutes` as user-facing estimate.

### 4) Alternate Bus Engine

Endpoint: `GET /api/alternatives?lat=...&lng=...`

Decision policy:
- Find buses crossing the user’s local stop area.
- Exclude buses that already passed that area stop.
- Exclude destination-only boarding points.
- Rank by practical catchability (`walk time`, `bus ETA`, `distance`).

## Frontend Architecture

### Student Experience

Primary workflows:
- Real-time current bus tracking
- Boarding stop recommendation
- Leave-now alerting
- Missed-bus alternatives with route option

Key states:
- live bus telemetry
- user geolocation
- alert permission state
- stop progression and ETA

### Admin Experience

Primary workflows:
- Fleet health overview
- bus availability and status
- route/stops visibility

## API Surface

### `GET /health`
Backend health probe.

### `POST /api/location`
Ingests device telemetry and emits realtime update.

### `GET /api/buses`
Returns current destination + latest bus records.

### `GET /api/eta/:bus_id`
Returns ETA details for a single bus.

### `GET /api/alternatives?lat=...&lng=...`
Returns nearby alternate options for missed-bus recovery.

## Data Model (Operational)

Bus state record:

```json
{
	"bus_id": "BUS_2",
	"lat": 17.3956,
	"lng": 78.4341,
	"speed": 31,
	"timestamp": "2026-04-24T08:15:22.000Z",
	"distance_km": 0.82,
	"eta_minutes": 3,
	"updated_at": "2026-04-24T08:15:22.142Z"
}
```

## Security Model

Recommended production controls:
- Per-device credentials or signed token (`API_KEY` + signature).
- Rate limiting per `bus_id` and IP.
- Payload sanity checks (geo bounds, speed caps, timestamp skew).
- CORS lock-down to trusted frontend origins.

## Deployment Model

### Backend

- Runtime: Node.js 18+
- Process: `npm start`
- Required env:
	- `PORT`
	- `FRONTEND_URL`
	- `API_KEY`
	- `DESTINATION_LAT`
	- `DESTINATION_LNG`

### Frontend

- Runtime: Vite build output
- Required env:
	- `VITE_BACKEND_URL`

## Runbook (Development)

### Backend
=======
# Smart Bus Tracking System (College Fleet MVP)

This project is a Smart Vehicle Monitoring System for college buses.

Students often face three practical transport issues:
- No real-time visibility of where the assigned bus currently is.
- Uncertain ETA at their boarding point and destination.
- No quick decision support when they miss their primary bus.

This MVP solves those with a live frontend, backend APIs, real-time socket streaming, ETA calculation, and a simulator (temporary replacement for ESP32 hardware).

## Objectives

- Provide live bus location updates for student and admin-facing views.
- Estimate bus arrival time using distance/speed (no paid external APIs).
- Support missed-bus recovery with nearest alternate suggestion.
- Keep the existing frontend UI and flow intact while integrating backend data.
- Keep architecture simple now, but extensible for production.

## Current Project Structure

```text
bus-tracking-system-using-iot/
	src/                    # Existing frontend (React + Vite)
	backend/                # New backend (Node + Express + Socket.io)
		src/
			data/
			simulator/
			utils/
			server.js
		package.json
	.env.example
	package.json
	README.md
```

Note: The frontend currently lives at repo root (`src/`). The backend is added in `backend/`.

## Architecture

### MVP Flow

1. Backend simulator generates 20 bus telemetry packets every 3 seconds.
2. Telemetry is normalized and stored in in-memory store.
3. Backend computes distance and ETA to destination using Haversine + speed.
4. Backend emits updates over Socket.io event `bus-location`.
5. Frontend subscribes to socket and updates existing dashboard/map state.
6. Frontend falls back to existing local simulation if backend is unavailable.

### Production Direction

- Replace simulator with ESP32 devices posting GPS payloads to `POST /api/location`.
- Add auth for devices using `API_KEY` and per-device signatures.
- Persist data in a time-series store (PostgreSQL/Timescale/InfluxDB).
- Use queue/stream processing for scale.

## Modules

### 1) GPS Tracking Module

- Ingest endpoint: `POST /api/location`.
- Payload: `bus_id`, `lat`, `lng`, `speed`, `timestamp`.
- Broadcast channel: Socket.io `bus-location`.
- Frontend integration point: existing `StudentDashboard` + `LiveMap` in `src/App.jsx`.

### 2) ETA Prediction Module

- Formula: `ETA = distance / speed`.
- Distance via Haversine formula.
- Backend utility: `backend/src/utils/geo.js`.
- Destination defaults to VCE coordinates (can be moved to env later).
- API: `GET /api/eta/:bus_id`.

### 3) Missed Bus Module (Basic)

- Endpoint: `GET /api/alternatives?lat=...&lng=...`.
- Logic:
- Find nearest active bus to user location.
- Suggest next nearest bus as alternate.
- Return simple recommendation message.

### 4) Admin Dashboard (Existing Frontend)

- Existing UI preserved.
- Uses existing fleet cards and statuses.
- Backend integration is additive and does not redesign interface.

## Simulator (Hardware Replacement for MVP)

- Location: `backend/src/simulator/busSimulator.js`.
- Simulates `BUS_1` to `BUS_20`.
- Emits updated coordinates every 3 seconds.
- Simulates slight movement/jitter + speed variation.
- Easily removable by stopping `startBusSimulator(...)` in `backend/src/server.js`.

## API Documentation

### `POST /api/location`

Request:

```json
{
	"bus_id": "BUS_1",
	"lat": 17.4012,
	"lng": 78.4761,
	"speed": 34,
	"timestamp": "2026-04-09T09:10:00.000Z"
}
```

Response:

```json
{
	"success": true,
	"bus": {
		"bus_id": "BUS_1",
		"lat": 17.4012,
		"lng": 78.4761,
		"speed": 34,
		"timestamp": "2026-04-09T09:10:00.000Z",
		"distance_km": 2.3,
		"eta_minutes": 4,
		"updated_at": "2026-04-09T09:10:00.100Z"
	}
}
```

### `GET /api/buses`

Returns all current buses from in-memory store.

### `GET /api/eta/:bus_id`

Returns ETA details for one bus.

### `GET /api/alternatives?lat=...&lng=...`

Returns nearest bus and next-best alternate for a user location.

## WebSocket Events

- Server -> Client: `init-buses`
- Payload: full array of bus records at connection time.

- Server -> Client: `bus-location`
- Payload: one bus record whenever location updates.

Frontend listener integration is in `src/App.jsx` and updates existing state without replacing current UI logic.

## Environment Variables

Use `.env.example` as template:

- `PORT`: backend port (default typically `4000`).
- `FRONTEND_URL`: allowed origin for CORS/Socket.io (example `http://localhost:5173`).
- `API_KEY`: reserved for future ESP32 device authentication.

## Local Development

### Prerequisites

- Node.js LTS (18+ recommended)
- npm

### 1) Run Backend
>>>>>>> 8624c134b4530160a2ed5447eb7a554ae29eeebd

```bash
cd backend
npm install
npm start
```

<<<<<<< HEAD
### Frontend
=======
Backend starts at `http://localhost:4000` by default.

### 2) Run Frontend

From repo root:
>>>>>>> 8624c134b4530160a2ed5447eb7a554ae29eeebd

```bash
npm install
npm run dev
```

<<<<<<< HEAD
## Scalability Plan

Planned production upgrades:
- Persistent store (PostgreSQL/TimescaleDB).
- Message broker for ingestion fan-out (Kafka/RabbitMQ).
- Streamed analytics for fleet performance and delay hotspots.
- Optional ML ETA service behind feature flag.

## Observability

Minimum telemetry to log/monitor:
- ingestion success/error rates
- per-bus heartbeat freshness
- socket connected clients
- ETA error distribution (predicted vs actual)
- alert trigger counts and misses

## Product Assumptions

- Every bus has a unique persistent `bus_id`.
- Destination for each active route terminates at VCE.
- Student decisions are made from live location + upcoming stop availability.
- Map routes are rendered from authoritative stop coordinates.
=======
Optional frontend env variable:

```bash
VITE_BACKEND_URL=http://localhost:4000
```

## Deployment

### Backend -> Render

1. Create a new Web Service from the repository.
2. Set root directory to `backend`.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add env vars: `PORT`, `FRONTEND_URL`, `API_KEY`.

### Frontend -> Vercel

1. Import repository into Vercel.
2. Keep root project settings for Vite frontend.
3. Set `VITE_BACKEND_URL` to Render backend URL.
4. Deploy.

## Replacing Simulator with ESP32

1. Keep backend endpoints unchanged.
2. Disable/remove `startBusSimulator(...)` call in `backend/src/server.js`.
3. Configure ESP32 firmware to POST to `/api/location` at fixed intervals.
4. Add authentication check using `API_KEY` in request headers/body.
5. Keep socket broadcast as-is so frontend requires no redesign.

## Future Scope

- MQTT ingestion layer for lightweight IoT transport.
- Kafka for high-throughput streaming and replay.
- ML-based ETA prediction using traffic + historical patterns.
- LoRa communication for low-power long-range telemetry.
- Persistent trip analytics and attendance insights.

## Notes on Non-Breaking Integration

- Existing frontend styling, component structure, and navigation are preserved.
- Real-time backend data is integrated as additive enhancement.
- Existing in-frontend simulation/timing remains as fallback if backend is unavailable.
>>>>>>> 8624c134b4530160a2ed5447eb7a554ae29eeebd

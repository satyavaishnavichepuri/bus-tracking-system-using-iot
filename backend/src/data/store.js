import { calculateEtaMinutes, haversineKm } from "../utils/geo.js";

const DEFAULT_DESTINATION = {
  lat: Number.parseFloat(process.env.DESTINATION_LAT ?? "17.3910"),
  lng: Number.parseFloat(process.env.DESTINATION_LNG ?? "78.4400"),
};

const buses = new Map();

export function getDestination() {
  return DEFAULT_DESTINATION;
}

export function upsertBusLocation(payload) {
  const normalized = {
    bus_id: String(payload.bus_id),
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    speed: Number(payload.speed),
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  const destination = getDestination();
  const distance_km = haversineKm(
    normalized.lat,
    normalized.lng,
    destination.lat,
    destination.lng,
  );

  const eta_minutes = calculateEtaMinutes(distance_km, normalized.speed, normalized.timestamp);

  const record = {
    ...normalized,
    distance_km,
    eta_minutes,
    updated_at: new Date().toISOString(),
  };

  buses.set(normalized.bus_id, record);
  return record;
}

export function getAllBuses() {
  return [...buses.values()];
}

export function getBusById(busId) {
  return buses.get(String(busId)) ?? null;
}

export function getEtaByBusId(busId) {
  const bus = getBusById(busId);
  if (!bus) {
    return null;
  }

  return {
    bus_id: bus.bus_id,
    eta_minutes: bus.eta_minutes,
    distance_km: bus.distance_km,
    speed: bus.speed,
    destination: getDestination(),
    timestamp: bus.timestamp,
  };
}

export function getAlternativeForUser(lat, lng) {
  const userLat = Number(lat);
  const userLng = Number(lng);

  const ranked = getAllBuses()
    .map((bus) => {
      const distanceToUserKm = haversineKm(userLat, userLng, bus.lat, bus.lng);
      return {
        ...bus,
        distance_to_user_km: distanceToUserKm,
      };
    })
    .sort((a, b) => a.distance_to_user_km - b.distance_to_user_km);

  if (!ranked.length) {
    return {
      nearest_bus: null,
      alternative: null,
      message: "No buses available right now",
    };
  }

  return {
    nearest_bus: ranked[0],
    alternative: ranked[1] ?? null,
    message: ranked[1]
      ? `Take ${ranked[1].bus_id} as an alternate option`
      : "No alternate bus is currently available",
  };
}

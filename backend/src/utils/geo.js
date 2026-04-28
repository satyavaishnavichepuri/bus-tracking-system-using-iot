const EARTH_RADIUS_KM = 6371;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTrafficMultiplier(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const hour = Number.isNaN(date.getTime()) ? new Date().getHours() : date.getHours();

  // Hyderabad-like traffic profile for classroom-level ETA simulation.
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    return 1.35;
  }

  if ((hour >= 7 && hour < 8) || (hour > 10 && hour <= 12) || (hour >= 15 && hour < 17)) {
    return 1.15;
  }

  if (hour >= 22 || hour <= 5) {
    return 0.9;
  }

  return 1;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function calculateEtaMinutes(distanceKm, speedKmh, timestamp) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return null;
  }

  if (!Number.isFinite(speedKmh) || speedKmh <= 0) {
    return null;
  }

  const trafficMultiplier = getTrafficMultiplier(timestamp);
  const effectiveSpeed = clamp(speedKmh * 0.82, 8, 55);

  // Add small operational buffers so ETA doesn't feel too optimistic.
  const operationalBufferMinutes = 0.8 + Math.min(2.2, distanceKm * 0.22);
  const etaMinutes = ((distanceKm / effectiveSpeed) * 60 * trafficMultiplier) + operationalBufferMinutes;

  return Math.max(1, Math.round(etaMinutes));
}

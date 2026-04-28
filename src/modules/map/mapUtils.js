const ROAD_ROUTE_CACHE = new Map();
const ROAD_SEGMENT_CACHE = new Map();

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getSimulatedBusProgress(bus, nowMs = Date.now()) {
  const cycleMs = 22 * 60 * 1000;
  const offset = (Number.parseInt(bus.num, 10) % 17) * 0.043;
  return (((nowMs / cycleMs) + offset) % 1 + 1) % 1;
}

export function getBusPositionAtT(bus, t) {
  const stops = bus.stops;
  const total = stops.length - 1;
  const rawSeg = t * total;
  const seg = Math.min(Math.floor(rawSeg), total - 1);
  const segT = rawSeg - seg;
  const easedT = segT < 0.5 ? 2 * segT * segT : -1 + (4 - 2 * segT) * segT;
  return [
    stops[seg].coords[0] + (stops[seg + 1].coords[0] - stops[seg].coords[0]) * easedT,
    stops[seg].coords[1] + (stops[seg + 1].coords[1] - stops[seg].coords[1]) * easedT,
  ];
}

export async function fetchRoadRouteCoords(stops) {
  const routeKey = stops.map((s) => `${s.coords[0]},${s.coords[1]}`).join("|");
  if (ROAD_ROUTE_CACHE.has(routeKey)) {
    return ROAD_ROUTE_CACHE.get(routeKey);
  }

  const stitchedRoute = [];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const from = stops[i].coords;
    const to = stops[i + 1].coords;
    const segmentKey = `${from[0]},${from[1]}->${to[0]},${to[1]}`;

    let segmentPath = ROAD_SEGMENT_CACHE.has(segmentKey)
      ? ROAD_SEGMENT_CACHE.get(segmentKey)
      : undefined;

    if (segmentPath === undefined) {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=false`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Road segment lookup failed");
        }

        const data = await response.json();
        const geometry = data?.routes?.[0]?.geometry?.coordinates;

        if (!Array.isArray(geometry) || geometry.length < 2) {
          throw new Error("No segment geometry returned");
        }

        const roadPath = geometry.map(([lng, lat]) => [lat, lng]);
        const directKm = haversineKm(from[0], from[1], to[0], to[1]);
        const roadKm = roadPath.slice(1).reduce((sum, point, idx) => {
          const prev = roadPath[idx];
          return sum + haversineKm(prev[0], prev[1], point[0], point[1]);
        }, 0);

        const detourRatio = roadKm / Math.max(directKm, 0.05);
        const isReasonableDetour = detourRatio <= 2.8;
        segmentPath = isReasonableDetour ? roadPath : [];
      } catch {
        segmentPath = [];
      }

      ROAD_SEGMENT_CACHE.set(segmentKey, segmentPath);
    }

    if (!Array.isArray(segmentPath) || segmentPath.length < 2) {
      continue;
    }

    if (!stitchedRoute.length) {
      stitchedRoute.push(...segmentPath);
    } else {
      stitchedRoute.push(...segmentPath.slice(1));
    }
  }

  const finalStop = stops[stops.length - 1]?.coords;
  if (stitchedRoute.length >= 1 && Array.isArray(finalStop)) {
    const tail = stitchedRoute[stitchedRoute.length - 1];
    const tailToDestinationKm = haversineKm(tail[0], tail[1], finalStop[0], finalStop[1]);

    if (tailToDestinationKm > 0.25) {
      const tailKey = `${tail[0]},${tail[1]}->${finalStop[0]},${finalStop[1]}`;
      let tailPath = ROAD_SEGMENT_CACHE.has(tailKey)
        ? ROAD_SEGMENT_CACHE.get(tailKey)
        : undefined;

      if (tailPath === undefined) {
        const tailUrl = `https://router.project-osrm.org/route/v1/driving/${tail[1]},${tail[0]};${finalStop[1]},${finalStop[0]}?overview=full&geometries=geojson&steps=false`;
        try {
          const response = await fetch(tailUrl);
          if (!response.ok) {
            throw new Error("Tail segment lookup failed");
          }

          const data = await response.json();
          const geometry = data?.routes?.[0]?.geometry?.coordinates;
          tailPath = Array.isArray(geometry) && geometry.length > 1
            ? geometry.map(([lng, lat]) => [lat, lng])
            : [];
        } catch {
          tailPath = [];
        }

        ROAD_SEGMENT_CACHE.set(tailKey, tailPath);
      }

      if (Array.isArray(tailPath) && tailPath.length > 1) {
        stitchedRoute.push(...tailPath.slice(1));
      }
    }
  }

  ROAD_ROUTE_CACHE.set(routeKey, stitchedRoute);
  return stitchedRoute;
}

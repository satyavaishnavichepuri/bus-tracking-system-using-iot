const BUS_COUNT = 20;
const UPDATE_INTERVAL_MS = 3000;
const ORBIT_RADIUS = 0.01;
const CENTER = { lat: 17.391, lng: 78.44 };

function createSeedState() {
  return Array.from({ length: BUS_COUNT }, (_, index) => {
    const angle = (index / BUS_COUNT) * Math.PI * 2;
    return {
      bus_id: `BUS_${index + 1}`,
      phase: angle,
      speed: 20 + ((index % 8) * 1.5),
    };
  });
}

export function startBusSimulator({ onTick }) {
  const state = createSeedState();

  const timer = setInterval(() => {
    state.forEach((bus, index) => {
      bus.phase += 0.015 + ((index % 3) * 0.0025);

      const latJitter = Math.sin(bus.phase * 1.7) * 0.0012;
      const lngJitter = Math.cos(bus.phase * 1.3) * 0.0012;
      const lat = CENTER.lat + Math.sin(bus.phase) * ORBIT_RADIUS + latJitter;
      const lng = CENTER.lng + Math.cos(bus.phase) * ORBIT_RADIUS + lngJitter;

      const speedVariance = (Math.sin(bus.phase * 2.2) + 1) * 2.5;
      const speed = Math.max(8, Math.round(bus.speed + speedVariance));

      onTick({
        bus_id: bus.bus_id,
        lat,
        lng,
        speed,
        timestamp: new Date().toISOString(),
      });
    });
  }, UPDATE_INTERVAL_MS);

  return () => clearInterval(timer);
}

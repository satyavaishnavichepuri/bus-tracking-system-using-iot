import { useEffect, useRef } from "react";
import { fetchRoadRouteCoords, getBusPositionAtT } from "./mapUtils";

function buildBusPopup(bus, liveMeta) {
  const speed = liveMeta?.speed ?? "--";
  const eta = liveMeta?.eta_minutes ?? "--";
  return `<strong>Bus B${bus.num}</strong><br><span style="color:#6b7a96">${bus.name}</span><br><span style="color:#9fb1cc;font-size:11px">Speed: ${speed} km/h · ETA: ${eta} min</span>`;
}

function LiveMap({
  bus,
  studentLocation,
  nearestStop,
  busProgress,
  liveBusPosition,
  liveMeta,
  onMapReady,
}) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const routeLine = useRef(null);
  const busMarker = useRef(null);
  const stuMarker = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current || !bus?.stops?.length) {
      return undefined;
    }

    const L = window.L;
    if (mapInst.current) {
      mapInst.current.remove();
      mapInst.current = null;
    }

    const mid = bus.stops[Math.floor(bus.stops.length / 2)].coords;
    const map = L.map(mapRef.current, { center: mid, zoom: 12, attributionControl: false });
    mapInst.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const stopPath = bus.stops.map((stop) => stop.coords);
    routeLine.current = L.polyline([], { color: "#00e5ff", weight: 3, opacity: 0.7, dashArray: "8,6" }).addTo(map);
    map.fitBounds(L.latLngBounds(stopPath), { padding: [50, 50] });

    let cancelled = false;
    fetchRoadRouteCoords(bus.stops)
      .then((roadPath) => {
        if (cancelled || !routeLine.current || !mapInst.current || roadPath.length < 2) {
          return;
        }
        routeLine.current.setLatLngs(roadPath);
        map.fitBounds(L.latLngBounds(roadPath), { padding: [50, 50] });
      })
      .catch(() => {
        // Keep route hidden when road matching fails to avoid straight-line artifacts.
      });

    bus.stops.forEach((stop, i) => {
      const isMine = stop.name === nearestStop?.name;
      const isLast = i === bus.stops.length - 1;
      const size = isLast || isMine ? 18 : 9;
      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;background:${isLast ? "#ff4444" : isMine ? "#00e5ff" : "rgba(255,255,255,0.35)"};border-radius:50%;border:2px solid ${isLast ? "#ff4444" : isMine ? "#00e5ff" : "rgba(255,255,255,0.2)"};box-shadow:${isLast ? "0 0 14px rgba(255,68,68,0.75)" : isMine ? "0 0 12px rgba(0,229,255,0.7)" : "none"}"></div>`,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker(stop.coords, { icon })
        .addTo(map)
        .bindPopup(`<strong>${stop.name}</strong><br><span style="color:#6b7a96;font-size:11px">${stop.time}${isLast ? " · <span style='color:#ff4444'>Final Destination</span>" : ""}${isMine ? " · <span style='color:#00e5ff'>Your Stop</span>" : ""}</span>`);
    });

    if (studentLocation?.lat && studentLocation?.lng) {
      const icon = L.divIcon({
        html: `<div style="position:relative;width:34px;height:44px;display:flex;align-items:flex-start;justify-content:center">
          <div style="position:absolute;top:4px;width:18px;height:18px;background:#ff4444;border-radius:50%;border:2px solid #ffd0d0;box-shadow:0 0 0 4px rgba(255,68,68,.25)"></div>
          <div style="position:absolute;top:22px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #ff4444"></div>
        </div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      stuMarker.current = L.marker([studentLocation.lat, studentLocation.lng], { icon })
        .addTo(map)
        .bindPopup("<strong>You</strong><br><span style=\"color:#6b7a96;font-size:11px\">Live Location</span>");
    }

    const busPosition = liveBusPosition || getBusPositionAtT(bus, busProgress);
    const busIcon = L.divIcon({
      html: `<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;background:rgba(0,229,255,.15);border-radius:50%;animation:trailPulse 2s ease-out infinite"></div>
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#7b61ff,#00e5ff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 0 3px rgba(0,229,255,.3),0 6px 16px rgba(0,229,255,.25);z-index:1;animation:busFloat 2s ease-in-out infinite">🚌</div>
      </div>`,
      className: "",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    busMarker.current = L.marker(busPosition, { icon: busIcon })
      .addTo(map)
      .bindPopup(buildBusPopup(bus, liveMeta));

    if (typeof onMapReady === "function") {
      onMapReady(map);
    }

    return () => {
      cancelled = true;
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, [bus, nearestStop]);

  useEffect(() => {
    if (!mapInst.current || !studentLocation?.lat || !studentLocation?.lng) {
      return;
    }

    if (!stuMarker.current) {
      const L = window.L;
      const icon = L.divIcon({
        html: `<div style="position:relative;width:34px;height:44px;display:flex;align-items:flex-start;justify-content:center">
          <div style="position:absolute;top:4px;width:18px;height:18px;background:#ff4444;border-radius:50%;border:2px solid #ffd0d0;box-shadow:0 0 0 4px rgba(255,68,68,.25)"></div>
          <div style="position:absolute;top:22px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #ff4444"></div>
        </div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      stuMarker.current = L.marker([studentLocation.lat, studentLocation.lng], { icon })
        .addTo(mapInst.current)
        .bindPopup("<strong>You</strong><br><span style=\"color:#6b7a96;font-size:11px\">Live Location</span>");
      return;
    }

    stuMarker.current.setLatLng([studentLocation.lat, studentLocation.lng]);
  }, [studentLocation]);

  useEffect(() => {
    if (!busMarker.current) {
      return;
    }

    busMarker.current.setLatLng(liveBusPosition || getBusPositionAtT(bus, busProgress));
    busMarker.current.setPopupContent(buildBusPopup(bus, liveMeta));
  }, [busProgress, bus, liveBusPosition, liveMeta]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#0a1220" }} />;
}

export default LiveMap;

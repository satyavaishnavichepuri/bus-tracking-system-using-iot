import { useEffect, useRef, useState } from "react";
import ETABox from "./ETABox";
import { getETA } from "./etaService";
import { fetchRoadRouteCoords, getBusPositionAtT, haversineKm } from "./mapUtils";

function buildBusPopup(bus, liveMeta) {

  const speed =
    liveMeta?.speed ?? "--";

  const eta =
    liveMeta?.eta_minutes ?? "--";


  return `
    <strong>
      Bus B${bus.num}
    </strong><br>

    <span style="color:#6b7a96">
      ${bus.name}
    </span><br>

    <span
      style="
        color:#9fb1cc;
        font-size:11px
      "
    >
      Speed: ${speed} km/h ·
      ETA: ${eta} min
    </span>
  `;
}

function LiveMap({
  bus,
  studentLocation,
  nearestStop,
  liveMeta,
  busProgress,
  onMapReady,
}) {

  const mapRef =
    useRef(null);

  const mapInst =
    useRef(null);

  const routeLine =
    useRef(null);

  const busMarker =
    useRef(null);

  const stuMarker =
    useRef(null);

  const [eta, setEta] =
    useState("--");

  const [
    distance,
    setDistance
  ] = useState("--");

  const [routePath, setRoutePath] = useState([]);

  const isValidCoords = (coords) =>
    Array.isArray(coords) && coords.length === 2 &&
    Number.isFinite(coords[0]) && Number.isFinite(coords[1]);

  const liveBusPosition =
    liveMeta?.lat && liveMeta?.lng
      ? [Number(liveMeta.lat), Number(liveMeta.lng)]
      : null;

  const initialBusPosition =
    bus?.stops?.length
      ? getBusPositionAtT(bus, busProgress || 0)
      : null;

  const busPosition =
    isValidCoords(liveBusPosition)
      ? liveBusPosition
      : isValidCoords(initialBusPosition)
        ? initialBusPosition
        : [17.391, 78.44];

  const routePoints =
    routePath.length > 1
      ? routePath.filter(isValidCoords)
      : (bus?.stops?.map((stop) => stop.coords).filter(isValidCoords) ?? []);

  useEffect(() => {
    if (!bus?.stops?.length) {
      setRoutePath([]);
      return;
    }

    let active = true;

    fetchRoadRouteCoords(bus.stops)
      .then((coords) => {
        if (!active) return;
        setRoutePath(coords.length > 1 ? coords : bus.stops.map((stop) => stop.coords));
      })
      .catch(() => {
        if (!active) return;
        setRoutePath(bus.stops.map((stop) => stop.coords));
      });

    return () => {
      active = false;
    };
  }, [bus]);

  // =========================
  // MAP INITIALIZATION
  // =========================

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!window.L || !mapRef.current) {
      return undefined;
    }

    const L = window.L;

    if (mapInst.current) {
      return undefined;
    }

    const map =
      L.map(
        mapRef.current,
        {
          center: busPosition,
          zoom: 13,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: true,
          zoomControl: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true
        }
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19
      }
    ).addTo(map);

    mapInst.current = map;
    setMapReady(true);

    if (typeof onMapReady === "function") {
      onMapReady(map);
    }

    // Force map to recalculate its size after initialization
    setTimeout(() => {
      if (mapInst.current) {
        mapInst.current.invalidateSize();
      }
    }, 100);

    // Handle window resize
    const handleResize = () => {
      if (mapInst.current) {
        mapInst.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };

  }, []);

  useEffect(() => {
    if (!window.L || !mapReady || !mapInst.current) {
      return;
    }

    const L = window.L;
    const map = mapInst.current;

    if (routeLine.current) {
      routeLine.current.remove();
      routeLine.current = null;
    }

    if (routePoints.length > 1) {
      routeLine.current =
        L.polyline(
          routePoints,
          {
            color: "#00e5ff",
            weight: 5,
            opacity: 0.8
          }
        ).addTo(map);

      map.fitBounds(
        L.latLngBounds(routePoints),
        { padding: [50, 50] }
      );
    }

  }, [mapReady, routePoints]);

  useEffect(() => {
    if (!window.L || !mapReady || !mapInst.current) {
      return;
    }

    const L = window.L;
    const map = mapInst.current;

    if (stuMarker.current) {
      stuMarker.current.remove();
      stuMarker.current = null;
    }

    if (
      studentLocation?.lat &&
      studentLocation?.lng
    ) {
      const icon =
        L.divIcon({
          html: `
            <div
              style="
                width:18px;
                height:18px;
                background:#ff4444;
                border-radius:50%;
                border:2px solid white;
              "
            ></div>
          `,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      stuMarker.current =
        L.marker(
          [studentLocation.lat, studentLocation.lng],
          { icon }
        )
          .addTo(map)
          .bindPopup("You");
    }

    if (busMarker.current) {
      busMarker.current.remove();
      busMarker.current = null;
    }

  }, [mapReady, studentLocation]);

  // =========================
  // UPDATE BUS POSITION
  // =========================

  useEffect(() => {
    if (!window.L || !mapReady || !mapInst.current) {
      return;
    }

    if (!isValidCoords(busPosition)) {
      return;
    }

    const L = window.L;
    const map = mapInst.current;

    if (!busMarker.current) {
      const busIcon =
        L.divIcon({
          html: `
            <div
              style="
                width:40px;
                height:40px;
                border-radius:50%;
                background:linear-gradient(135deg,#7b61ff,#00e5ff);
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:20px;
              "
            >
              🚌
            </div>
          `,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

      busMarker.current =
        L.marker(busPosition, { icon: busIcon })
          .addTo(map)
          .bindPopup(buildBusPopup(bus, liveMeta));

      return;
    }

    busMarker.current.setLatLng(busPosition);
    busMarker.current.setPopupContent(buildBusPopup(bus, liveMeta));

  }, [
    mapReady,
    busPosition,
    bus,
    liveMeta
  ]);

  // =========================
  // ETA CALCULATION
  // =========================

  useEffect(() => {

    async function fetchETA() {

      if (
        !busPosition ||
        !nearestStop?.coords
      ) {
        return;
      }

      try {

        const result =
          await getETA(

            busPosition[0],
            busPosition[1],

            nearestStop.coords[0],
            nearestStop.coords[1]
          );

        setEta(result.eta);

        setDistance(
          result.distance
        );

      } catch (err) {

        console.error(err);
      }
    }

    fetchETA();

    const interval =
      setInterval(
        fetchETA,
        5000
      );

    return () =>
      clearInterval(interval);

  }, [
    busPosition,
    nearestStop
  ]);

  // =========================
  // RENDER
  // =========================

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#0a1220",
        pointerEvents: "auto"
      }}
    />
  );
}

export default LiveMap;
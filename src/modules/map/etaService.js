import axios from "axios";

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU2N2NkZjZjYTk3NDQxMzliYWFiYjYzZmFiZGUyNmY3IiwiaCI6Im11cm11cjY0In0=";

export async function getETA(
    busLat,
    busLng,
    stopLat,
    stopLng
) {

    const url =
        `https://api.openrouteservice.org/v2/directions/driving-car` +
        `?api_key=${API_KEY}` +
        `&start=${busLng},${busLat}` +
        `&end=${stopLng},${stopLat}`;

    try {

        const response = await axios.get(url);

        const route =
            response.data.features[0];

        const duration =
            route.properties.summary.duration;

        const distance =
            route.properties.summary.distance;

        return {
            eta: Math.round(duration / 60),
            distance: (distance / 1000).toFixed(2)
        };

    } catch (error) {

        console.error("ETA Error:", error);

        return {
            eta: "--",
            distance: "--"
        };
    }
}
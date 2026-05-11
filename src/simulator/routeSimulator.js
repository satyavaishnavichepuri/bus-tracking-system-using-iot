import routeData from "./routeData.json";

let index = 0;

export function getNextBusLocation() {

    const point = routeData[index];

    index++;

    if (index >= routeData.length) {
        index = 0;
    }

    return [
        point.lat,
        point.lng
    ];
}
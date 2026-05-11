import XLSX from "xlsx";
import fs from "fs";

const workbook =
  XLSX.readFile(
    "./gps_training_data.xlsx"
  );

const sheetName =
  workbook.SheetNames[0];

const sheet =
  workbook.Sheets[sheetName];

const data =
  XLSX.utils.sheet_to_json(sheet);

const coords =
  data

    .filter((_, index) =>
      index % 5 === 0
    )

    .map((row) => ({

      lat: Number(row.latitude),

      lng: Number(row.longitude),

      time: row.time
    }))

    .filter(point =>

      !isNaN(point.lat) &&
      !isNaN(point.lng)
    );

fs.writeFileSync(

  "routeData.json",

  JSON.stringify(
    coords,
    null,
    2
  )
);

console.log(
  "GPS route optimized"
);
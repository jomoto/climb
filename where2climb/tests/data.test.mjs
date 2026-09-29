import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DESTINATIONS,
  MONTHS,
  MONTH_LABELS,
  destinationStyle,
  getDestinationById,
  getGoodMonths,
  rockTypeMatches,
  styleMatches,
} from "../data.js";
import { destinationLocation } from "../locations.js";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

test("destination records have stable IDs, coordinates, and season data", () => {
  assert.equal(new Set(DESTINATIONS.map((destination) => destination.id)).size, DESTINATIONS.length);

  for (const destination of DESTINATIONS) {
    assert.match(destination.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(Number.isFinite(destination.lat) && destination.lat >= -90 && destination.lat <= 90);
    assert.ok(Number.isFinite(destination.lng) && destination.lng >= -180 && destination.lng <= 180);
    assert.equal(destination.primeMonths.length, 2, `${destination.id} must have two peak months`);

    for (const month of MONTHS) {
      assert.ok(
        Number.isFinite(destination.seasonValues[month.key]),
        `${destination.id} is missing ${month.key} season data`
      );
    }
  }
});

test("Sport & Trad requires meaningful data for both styles", () => {
  const matches = DESTINATIONS.filter((destination) => styleMatches(destination, "mixed"));

  assert.ok(matches.length > 0);
  assert.ok(matches.length < DESTINATIONS.length);

  for (const destination of matches) {
    assert.ok(destination.styles.includes("sport"));
    assert.ok(destination.styles.includes("trad"));
    if (destination.routeCountsUnknown) {
      assert.deepEqual(destination.routeCounts, {});
      continue;
    }
    assert.ok((destination.routeCounts?.sport || 0) > 0);
    assert.ok((destination.routeCounts?.trad || 0) > 0);
  }
});

test("every destination has one canonical map and filter style", () => {
  const styles = ["sport", "trad", "boulder", "mixed"];

  for (const destination of DESTINATIONS) {
    const matches = styles.filter((style) => styleMatches(destination, style));
    assert.deepEqual(matches, [destinationStyle(destination)], destination.id);
  }
});

test("bouldering classification is shared by labels and filters", () => {
  const fontainebleau = getDestinationById("fontainebleau");

  assert.ok(fontainebleau);
  assert.equal(destinationStyle(fontainebleau), "boulder");
  assert.equal(styleMatches(fontainebleau, "boulder"), true);
  assert.equal(styleMatches(fontainebleau, "sport"), false);
});

test("multi-rock destinations match every named rock family", () => {
  const bishop = getDestinationById("bishop-area");

  assert.ok(bishop);
  assert.equal(rockTypeMatches(bishop, "granite"), true);
  assert.equal(rockTypeMatches(bishop, "volcanic"), true);
});

test("destination lookup rejects partial and malformed IDs", () => {
  assert.equal(getDestinationById("!!!"), undefined);
  assert.equal(getDestinationById("rock"), undefined);
  assert.equal(getDestinationById("valley"), undefined);
  assert.equal(getDestinationById("taghia-gorge")?.id, "taghia");
});

test("international destinations have searchable country labels", () => {
  const international = DESTINATIONS.filter(
    (destination) => destination.region.toLowerCase() === "international"
  );

  assert.ok(international.length > 0);
  for (const destination of international) {
    assert.notEqual(destinationLocation(destination), "International", destination.id);
    assert.notEqual(destinationLocation(destination), "Location unavailable", destination.id);
  }

  assert.equal(destinationLocation(getDestinationById("fontainebleau")), "France");
});

test("requested Mountain Project areas are available with canonical source links", () => {
  const requestedAreas = [
    {
      id: "bubbs-creek-wall",
      url: "https://www.mountainproject.com/area/109056973/bubbs-creek-wall",
      style: "trad",
    },
    {
      id: "patterson-left",
      url: "https://www.mountainproject.com/area/114373736/patterson-left",
      style: "trad",
    },
    {
      id: "trout-creek",
      url: "https://www.mountainproject.com/area/106505473/trout-creek",
      style: "trad",
    },
    {
      id: "the-grail",
      url: "https://www.mountainproject.com/area/111372538/the-grail",
      style: "sport",
    },
  ];

  for (const expected of requestedAreas) {
    const destination = getDestinationById(expected.id);
    assert.ok(destination, expected.id);
    assert.equal(destination.mpAreaUrl, expected.url);
    assert.equal(destinationStyle(destination), expected.style);
  }
});

test("regional umbrella records are not exposed as destinations", () => {
  const removedRegionalIds = [
    "oman-climbing",
    "southern-arizona",
    "eastern-sierra",
    "ct-bouldering",
    "central-valley",
    "western-mountains",
    "eastern-ma",
    "western-nevada",
    "northwest",
    "north-central",
    "southern-mountains-region",
    "piedmont-region",
    "south-central-pa",
    "southeastern-lowlands",
    "wasatch-range",
    "southeast-utah",
    "central-west-cascades-seattle",
    "central-east-cascades-wenatchee-leavenworth",
  ];

  for (const id of removedRegionalIds) {
    assert.equal(getDestinationById(id), undefined, id);
  }
});

test("approved world-class destinations are present without excluded or duplicate areas", () => {
  const approvedIds = [
    "leavenworth",
    "little-cottonwood-canyon",
    "devils-lake",
    "vedauwoo",
    "horseshoe-canyon-ranch",
    "obed-clear-creek",
    "american-fork-canyon",
    "stone-fort",
    "boulder-canyon",
    "mount-charleston",
    "seneca-rocks",
    "donner-summit",
    "lovers-leap",
    "clear-creek-canyon",
    "flatirons",
    "big-cottonwood-canyon",
    "rocktown",
    "tennessee-wall",
    "jackson-falls",
    "holy-boulders",
    "moes-valley",
    "saxon-switzerland",
    "montserrat",
    "la-pedriza",
    "zillertal",
    "chironico",
    "cresciano",
    "brione-verzasca",
    "mallorca",
    "el-chorro",
    "chulilla",
    "san-vito-lo-capo",
    "gastlosen",
    "varazze",
    "riglos",
    "railay-tonsai",
    "thakhek-pha-tam-kam",
    "serra-do-cipo",
    "frey",
    "valle-cochamo",
    "chalten-massif",
    "hampi",
    "darran-mountains",
    "valle-de-los-condores",
    "los-arenales",
    "la-huasteca",
    "suesca",
    "piedra-parada",
  ];
  const excludedIds = [
    "point-perpendicular",
    "moonarie",
    "paines-ford",
    "paynes-ford",
    "fair-head",
    "adrspach-teplice",
    "pembroke",
    "long-dong",
    "longdong",
    "table-mountain",
  ];

  assert.equal(approvedIds.length, 48);
  for (const id of approvedIds) {
    const destination = getDestinationById(id);
    assert.ok(destination, id);
    assert.ok(destination.mpAreaUrl, `${id} needs a reference guide`);
  }
  for (const id of excludedIds) assert.equal(getDestinationById(id), undefined, id);

  assert.equal(DESTINATIONS.filter(({ id }) => id === "waterval-boven").length, 1);
  assert.equal(DESTINATIONS.filter(({ id }) => id === "rocklands").length, 1);
  assert.equal(destinationLocation(getDestinationById("valle-de-los-condores")), "Chile");
});

test("CSV export stays in exact destination order and schema parity", () => {
  const rows = parseCsv(readFileSync(new URL("../destinations.csv", import.meta.url), "utf8"));
  const [header, ...destinations] = rows;

  assert.equal(header.length, 43);
  assert.equal(destinations.length, DESTINATIONS.length);
  assert.ok(destinations.every((row) => row.length === header.length));
  assert.deepEqual(
    destinations.map((row) => row[0]),
    DESTINATIONS.map((destination) => destination.id)
  );

  const index = Object.fromEntries(header.map((column, columnIndex) => [column, columnIndex]));
  for (let rowIndex = 0; rowIndex < DESTINATIONS.length; rowIndex += 1) {
    const destination = DESTINATIONS[rowIndex];
    const row = destinations[rowIndex];
    assert.equal(row[index.name], destination.name, destination.id);
    assert.equal(row[index.location], destinationLocation(destination), destination.id);
    assert.equal(Number(row[index.latitude]), destination.lat, destination.id);
    assert.equal(Number(row[index.longitude]), destination.lng, destination.id);
    assert.equal(row[index.route_volume], destination.routeVolume, destination.id);
  }

  const styleLabels = { boulder: "Bouldering", mixed: "Sport & Trad", sport: "Sport", trad: "Trad" };
  const listedStyleLabels = { boulder: "Bouldering", sport: "Sport", trad: "Trad" };
  const pitchLabels = { both: "Single + Multi", multi: "Multi-pitch", single: "Single-pitch" };

  for (const destination of DESTINATIONS.slice(-48)) {
    const row = destinations.find((candidate) => candidate[index.id] === destination.id);
    const counts = destination.routeCounts || {};
    const hasCounts = Object.keys(counts).length > 0;
    const count = (style) => hasCounts ? String(counts[style] || 0) : "";
    const countBasis = !hasCounts || destination.routeCountsUnknown
      ? "unavailable"
      : destination.routeCountsPartial
        ? "reference subset"
        : destination.routeCountsEstimated
          ? "estimated split"
          : "listed inventory";
    const monthlyNotes = Object.entries(destination.monthlyNotes || {})
      .map(([month, note]) => `${MONTH_LABELS[month] || month}: ${note}`)
      .join(" | ");
    const classicRoutes = (destination.classicRoutes || [])
      .map(({ name, grade, type }) => `${name} (${grade}, ${type})`)
      .join(" | ");
    const expected = {
      id: destination.id,
      name: destination.name,
      location: destinationLocation(destination),
      region: destination.region,
      latitude: String(destination.lat),
      longitude: String(destination.lng),
      climbing_type: styleLabels[destinationStyle(destination)],
      listed_styles: destination.styles.map((style) => listedStyleLabels[style] || style).join(" | "),
      rock_type: destination.rockType,
      pitch_type: pitchLabels[destination.pitchType],
      peak_months: destination.primeMonths.map((month) => MONTH_LABELS[month]).join(" | "),
      good_months: getGoodMonths(destination).map((month) => MONTH_LABELS[month]).join(" | "),
      route_volume: destination.routeVolume,
      listed_sport_routes: count("sport"),
      listed_trad_routes: count("trad"),
      listed_boulder_problems: count("boulder"),
      listed_dws_routes: count("dws"),
      listed_top_rope_routes: count("toprope"),
      listed_alpine_routes: count("alpine"),
      listed_ice_routes: count("ice"),
      listed_aid_routes: count("aid"),
      listed_mixed_routes: count("mixed"),
      route_count_basis: countBasis,
      grade_range: destination.gradeRange,
      nearest_airport: destination.nearestAirport,
      reference_area: destination.mpAreaTitle,
      reference_url: destination.mpAreaUrl,
      data_source: destination.source,
      overview: destination.overview,
      monthly_notes: monthlyNotes,
      classic_routes: classicRoutes,
      ...Object.fromEntries(MONTHS.map(({ key }) => [`${key}_score`, String(destination.seasonValues[key])])),
    };

    for (const [column, value] of Object.entries(expected)) {
      assert.equal(row[index[column]], value, `${destination.id}:${column}`);
    }
  }
});

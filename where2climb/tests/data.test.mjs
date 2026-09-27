import test from "node:test";
import assert from "node:assert/strict";

import {
  DESTINATIONS,
  MONTHS,
  destinationStyle,
  getDestinationById,
  rockTypeMatches,
  styleMatches,
} from "../data.js";
import { destinationLocation } from "../locations.js";

test("destination records have stable IDs, coordinates, and season data", () => {
  assert.equal(new Set(DESTINATIONS.map((destination) => destination.id)).size, DESTINATIONS.length);

  for (const destination of DESTINATIONS) {
    assert.match(destination.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(Number.isFinite(destination.lat) && destination.lat >= -90 && destination.lat <= 90);
    assert.ok(Number.isFinite(destination.lng) && destination.lng >= -180 && destination.lng <= 180);

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

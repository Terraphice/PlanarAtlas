#!/usr/bin/env node

import { strict as assert } from "assert";
import test from "node:test";

import {
  getInferredType,
  getDisplayName,
  slugifyName,
  uniqueTags,
  mergeCardTags,
  getCanonicalAssetPaths,
  getUniqueSlug,
  parseCliOptions
} from "./generate-cards.js";

test("getInferredType supports plane/phenomenon filename prefixes", () => {
  assert.equal(getInferredType("Plane_Akoum.png"), "Plane");
  assert.equal(getInferredType("Phenomenon_Reality_Ripple.jpg"), "Phenomenon");
  assert.equal(getInferredType("custom-card.png"), null);
});

test("getDisplayName strips type prefixes and normalizes separators", () => {
  assert.equal(getDisplayName("Plane_The_Dark_Barony.png"), "The Dark Barony");
  assert.equal(getDisplayName("Phenomenon-Celestial-Drift.jpeg"), "Celestial Drift");
});

test("tag helpers normalize and preserve canonical type badge", () => {
  assert.deepEqual(uniqueTags(["Zendikar", "zendikar", " OPCA "]), ["Zendikar", "OPCA"]);
  assert.deepEqual(
    mergeCardTags(["Plane", ":top:badge:tr:green:Plane", "Zendikar"], "Plane"),
    ["Zendikar", ":top:badge:tr:green:Plane"]
  );
});

test("asset path and slug helpers are deterministic", () => {
  assert.deepEqual(getCanonicalAssetPaths("abc-123", ".jpg"), {
    image: "cards/images/abc-123.jpg",
    thumb: "cards/thumbs/abc-123.webp",
    transcript: "cards/transcripts/abc-123.md"
  });

  const tracker = new Map();
  assert.equal(getUniqueSlug("akoum", tracker), "akoum");
  assert.equal(getUniqueSlug("akoum", tracker), "akoum_2");
  assert.equal(slugifyName("The Æther Flue"), "the_ther_flue");
});

test("parseCliOptions accepts both inline and positional values", () => {
  assert.deepEqual(parseCliOptions(["--official", "--type", "plane", "--set", "OPCA"]), {
    classification: "official",
    type: "Plane",
    setCode: "OPCA"
  });

  assert.deepEqual(parseCliOptions(["--custom", "--type=phenomenon", "--set=PBT"]), {
    classification: "custom",
    type: "Phenomenon",
    setCode: "PBT"
  });
});

#!/usr/bin/env node

import { strict as assert } from "assert";
import test from "node:test";
import { parseReleaseOptions, releaseOptionsToArgs } from "./lib/cli-options.js";

test("parseReleaseOptions normalizes known options", () => {
  assert.deepEqual(parseReleaseOptions(["--official", "--type=plane", "--set", "OPCA"]), {
    classification: "official",
    type: "Plane",
    setCode: "OPCA"
  });
});

test("releaseOptionsToArgs round-trips parse output", () => {
  const parsed = parseReleaseOptions(["--custom", "--type", "phenomenon", "--set=PBT"]);
  assert.deepEqual(releaseOptionsToArgs(parsed), ["--type", "Phenomenon", "--custom", "--set", "PBT"]);
});

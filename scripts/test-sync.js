#!/usr/bin/env node

import { strict as assert } from "assert";
import test from "node:test";
import { getCardJsonFilename, getCardKey } from "./sync-cards.js";

test("getCardJsonFilename appends .json", () => {
  assert.equal(getCardJsonFilename("abc-123"), "abc-123.json");
});

test("getCardKey only accepts uid strings", () => {
  assert.equal(getCardKey({ uid: "uid-1" }), "uid-1");
  assert.equal(getCardKey({}), null);
  assert.equal(getCardKey(null), null);
});

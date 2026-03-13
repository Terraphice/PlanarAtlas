#!/usr/bin/env node
// scripts/test-sync.js
// Unit tests for sync-cards.js helper functions.
// Run with: node scripts/test-sync.js

import { getCardJsonFilename } from "./sync-cards.js";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// ── getCardJsonFilename ───────────────────────────────────────────────────────

section("getCardJsonFilename");
assert(getCardJsonFilename("akoum") === "akoum.json", "akoum → akoum.json");
assert(getCardJsonFilename("atlas_consultation") === "atlas_consultation.json", "phenomenon id → .json");
assert(getCardJsonFilename("the_library_of_leng") === "the_library_of_leng.json", "multi-word id");
assert(getCardJsonFilename("interplanar_tunnel") === "interplanar_tunnel.json", "phenomenon id");

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);

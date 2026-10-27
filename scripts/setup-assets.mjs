#!/usr/bin/env node
/**
 * AI Poker Face — local asset setup.
 *
 * 1. Copies the MediaPipe Tasks Vision WASM runtime from
 *    node_modules/@mediapipe/tasks-vision/wasm into public/mediapipe/wasm so
 *    the browser loads it from localhost (never from a CDN). Copying from the
 *    installed package guarantees the WASM matches the JS API version.
 * 2. Verifies the Face Landmarker model at public/models/face_landmarker.task.
 *    If it is missing (and --verify-only was not passed) it is downloaded once
 *    from the official MediaPipe model storage.
 *
 * Usage:
 *   node scripts/setup-assets.mjs                full setup (may download the model)
 *   node scripts/setup-assets.mjs --verify-only  never touches the network
 *
 * Works on Windows, macOS and Linux (Node.js >= 20).
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERIFY_ONLY = process.argv.includes('--verify-only');

const PACKAGE_DIR = join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision');
const WASM_SOURCE_DIR = join(PACKAGE_DIR, 'wasm');
const WASM_TARGET_DIR = join(ROOT, 'public', 'mediapipe', 'wasm');
const WASM_STAMP = join(WASM_TARGET_DIR, 'VERSION.txt');
const REQUIRED_WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

const MODEL_PATH = join(ROOT, 'public', 'models', 'face_landmarker.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const MODEL_SHA256 = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
const MODEL_MIN_BYTES = 1_000_000;

const ok = (msg) => console.log(`  [ok]   ${msg}`);
const info = (msg) => console.log(`  [..]   ${msg}`);
const warn = (msg) => console.warn(`  [warn] ${msg}`);

function fail(msg, hints = []) {
  console.error(`\n  [error] ${msg}`);
  for (const hint of hints) console.error(`          ${hint}`);
  console.error('');
  process.exit(1);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function setupWasm() {
  if (!existsSync(PACKAGE_DIR)) {
    fail('@mediapipe/tasks-vision is not installed.', ['Run "npm install" in the project folder first.']);
  }
  const pkg = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'));
  const version = String(pkg.version);

  const missing = REQUIRED_WASM_FILES.filter((f) => !existsSync(join(WASM_TARGET_DIR, f)));
  const stamped = existsSync(WASM_STAMP) ? readFileSync(WASM_STAMP, 'utf8').trim() : '';
  if (missing.length === 0 && stamped === version) {
    ok(`MediaPipe WASM runtime ${version} present in public/mediapipe/wasm`);
    return;
  }

  if (!existsSync(WASM_SOURCE_DIR)) {
    fail(`WASM folder not found inside @mediapipe/tasks-vision ${version}.`, [
      'Delete node_modules and run "npm install" again.',
    ]);
  }
  info(`Copying MediaPipe WASM runtime ${version} into public/mediapipe/wasm ...`);
  rmSync(WASM_TARGET_DIR, { recursive: true, force: true });
  mkdirSync(WASM_TARGET_DIR, { recursive: true });
  // Only the classic (non-ES-module) loaders are used: SIMD and the no-SIMD fallback.
  const available = new Set(readdirSync(WASM_SOURCE_DIR));
  for (const file of REQUIRED_WASM_FILES) {
    if (available.has(file)) copyFileSync(join(WASM_SOURCE_DIR, file), join(WASM_TARGET_DIR, file));
  }
  const stillMissing = REQUIRED_WASM_FILES.filter((f) => !existsSync(join(WASM_TARGET_DIR, f)));
  if (stillMissing.length > 0) {
    fail(`The installed package does not contain: ${stillMissing.join(', ')}`);
  }
  writeFileSync(WASM_STAMP, `${version}\n`);
  ok(`MediaPipe WASM runtime ${version} copied`);
}

function checkModel() {
  if (!existsSync(MODEL_PATH)) return 'missing';
  const size = statSync(MODEL_PATH).size;
  if (size < MODEL_MIN_BYTES) return 'corrupt';
  const hash = sha256(readFileSync(MODEL_PATH));
  return hash === MODEL_SHA256 ? 'verified' : 'unverified';
}

async function downloadModel() {
  info('Downloading the official MediaPipe Face Landmarker model (about 3.7 MB) ...');
  info(MODEL_URL);
  let response;
  try {
    response = await fetch(MODEL_URL);
  } catch (error) {
    fail('Could not download the Face Landmarker model.', [
      `Reason: ${error instanceof Error ? error.message : String(error)}`,
      'Check your internet connection (only needed once), then run: npm run setup-assets',
      `Or download it manually from ${MODEL_URL}`,
      'and save it as public/models/face_landmarker.task',
    ]);
  }
  if (!response.ok) {
    fail(`Model download failed with HTTP ${response.status}.`, [
      `Download it manually from ${MODEL_URL}`,
      'and save it as public/models/face_landmarker.task',
    ]);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const hash = sha256(buffer);
  if (buffer.length < MODEL_MIN_BYTES) {
    fail(`Downloaded model is too small (${buffer.length} bytes); refusing to install it.`);
  }
  if (hash !== MODEL_SHA256) {
    warn(`Downloaded model checksum ${hash} differs from the tested version.`);
    warn('It is an official file, so it is installed, but behaviour may differ slightly.');
  }
  mkdirSync(dirname(MODEL_PATH), { recursive: true });
  const tmp = `${MODEL_PATH}.download`;
  writeFileSync(tmp, buffer);
  renameSync(tmp, MODEL_PATH);
  ok('Face Landmarker model saved to public/models/face_landmarker.task');
}

async function setupModel() {
  const state = checkModel();
  if (state === 'verified') {
    ok('Face Landmarker model present and checksum verified (public/models/face_landmarker.task)');
    return;
  }
  if (state === 'unverified') {
    warn('Face Landmarker model present but its checksum differs from the tested version.');
    warn('The game will still try to use it. Delete the file and run "npm run setup-assets" to restore the tested model.');
    return;
  }
  if (VERIFY_ONLY) {
    fail(
      state === 'missing'
        ? 'The Face Landmarker model is missing: public/models/face_landmarker.task'
        : 'The Face Landmarker model file is incomplete or corrupt: public/models/face_landmarker.task',
      ['Run "npm run setup-assets" once while online to download it,', `or download ${MODEL_URL}`, 'and save it as public/models/face_landmarker.task'],
    );
  }
  await downloadModel();
}

console.log('\nAI Poker Face — checking local AI assets');
setupWasm();
await setupModel();
console.log('  All AI assets are stored locally. The game runs offline from here.\n');

import test from 'node:test';
import assert from 'node:assert/strict';
import { readProject, createBackup, projects, SOURCE_ORIGIN } from '../src/backup.js';
import { locales } from '../src/i18n.js';
import { readPreferences } from '../src/preferences.js';

const storage = values => ({ getItem: key => Object.hasOwn(values, key) ? values[key] : null });

test('workshop data survives JSON round trip exactly, without unrelated keys', () => {
  const values = {
    'frozen-rabbit-favorites-data': '[ {"id":"收藏", "name":"<script>"}, {"id":"2"} ]',
    'frozen-rabbit-notes': '[]',
    'frozen-rabbit-lang': 'tw',
    'frozen-rabbit-dark-mode': 'false',
    'frozen-rabbit-market-dc': '陸行鳥',
    'frozen-rabbit-debug-mode': 'true',
    'frozen-rabbit-initialized': 'true',
    'frozen-rabbit-tome-library': '[{}]',
    'analytics-consent': 'accepted',
    unrelated: 'private',
  };
  const snapshot = readProject(storage(values), 'workshop');
  assert.deepEqual(snapshot.counts, { favorites: 2, notes: 0, settings: 3 });
  const backup = JSON.parse(JSON.stringify(createBackup('workshop', snapshot, SOURCE_ORIGIN, new Date('2026-09-07T00:00:00Z'))));
  assert.equal(backup.format, 'frozen-rabbit-workshop-backup');
  assert.equal(backup.version, 1);
  assert.equal(backup.sourceOrigin, SOURCE_ORIGIN);
  assert.equal(backup.exportedAt, '2026-09-07T00:00:00.000Z');
  assert.equal(Object.keys(backup.data).length, 5);
  for (const [key, value] of Object.entries(backup.data)) assert.equal(value, values[key]);
});

test('tome includes each collection, legacy gear data, and saved preferences independently', () => {
  const values = Object.fromEntries(projects.tome.map(({ key, kind }) => [key, kind === 'array' ? '[{},{}]' : kind === 'string' ? 'en' : kind === 'boolean' ? 'true' : '{}']));
  const snapshot = readProject(storage(values), 'tome');
  assert.deepEqual(snapshot.invalidKeys, []);
  assert.equal(snapshot.counts.favorites, 2);
  assert.equal(snapshot.counts.gear, 2);
  assert.equal(snapshot.counts.library, 2);
  assert.equal(snapshot.counts.experiments, 2);
  assert.equal(snapshot.counts.studies, 2);
  assert.equal(snapshot.counts.settings, 14);
  assert.deepEqual(createBackup('tome', snapshot, SOURCE_ORIGIN).data, values);
});

test('empty origin does not invent defaults or offer an empty backup', () => {
  const snapshot = readProject(storage({}), 'workshop');
  assert.equal(snapshot.status, 'empty');
  assert.deepEqual(snapshot.counts, { favorites: 0, notes: 0, settings: 0 });
  assert.throws(() => createBackup('workshop', snapshot, SOURCE_ORIGIN));
});

test('malformed collections remain lossless and never appear as zero', () => {
  const values = { 'frozen-rabbit-notes': '{broken', 'frozen-rabbit-favorites-data': '{}' };
  const snapshot = readProject(storage(values), 'workshop');
  assert.equal(snapshot.status, 'ready');
  assert.equal(snapshot.counts.notes, null);
  assert.equal(snapshot.counts.favorites, null);
  assert.equal(snapshot.invalidKeys.length, 2);
  assert.deepEqual(createBackup('workshop', snapshot, SOURCE_ORIGIN).data, values);
});

test('malformed settings make the total unknown even when valid settings follow', () => {
  const snapshot = readProject(storage({ 'frozen-rabbit-tome-macro-settings': 'bad', 'frozen-rabbit-tome-solver-settings': '{}' }), 'tome');
  assert.equal(snapshot.counts.settings, null);
});

test('storage failures discard partial results and cannot produce a partial backup', () => {
  let reads = 0;
  const snapshot = readProject({ getItem() { if (++reads > 1) throw new Error('SecurityError'); return '[{}]'; } }, 'workshop');
  assert.equal(snapshot.status, 'blocked');
  assert.deepEqual(snapshot.data, {});
  assert.throws(() => createBackup('workshop', snapshot, SOURCE_ORIGIN));
  assert.equal(readProject(undefined, 'tome').status, 'blocked');
});

test('preferences prioritize workshop over tome, including explicit light mode', () => {
  assert.deepEqual(readPreferences(storage({ 'frozen-rabbit-lang': 'ja', 'frozen-rabbit-tome-lang': 'en', 'frozen-rabbit-dark-mode': 'false', 'frozen-rabbit-tome-dark-mode': 'true' }), true), { language: 'ja', dark: false });
});

test('missing or invalid preferences fall back independently to tome then system/Traditional Chinese', () => {
  assert.deepEqual(readPreferences(storage({ 'frozen-rabbit-lang': 'invalid', 'frozen-rabbit-dark-mode': 'broken', 'frozen-rabbit-tome-lang': 'cn', 'frozen-rabbit-tome-dark-mode': 'true' })), { language: 'cn', dark: true });
  assert.deepEqual(readPreferences(storage({ 'frozen-rabbit-lang': 'en' }), true), { language: 'en', dark: true });
  assert.deepEqual(readPreferences(storage({}), false), { language: 'tw', dark: false });
  assert.deepEqual(readPreferences(storage({}), true), { language: 'tw', dark: true });
  assert.deepEqual(readPreferences({ getItem() { throw new Error('Blocked'); } }, true), { language: 'tw', dark: true });
});

test('every locale provides all UI labels and each project has a disjoint allowlist', () => {
  for (const locale of Object.values(locales)) {
    assert.deepEqual(Object.keys(locale).sort(), Object.keys(locales.tw).sort());
    for (const label of Object.values(locale)) assert.ok(typeof label === 'string' && label.length);
  }
  const allKeys = Object.values(projects).flat().map(entry => entry.key);
  assert.equal(new Set(allKeys).size, allKeys.length);
});

export const SOURCE_ORIGIN = 'https://emu-rabbit.github.io';

// Explicit inventory, verified against both sibling repositories. Never scan by prefix.
const entry = (prefix, suffix, group, kind = 'json') => ({ key: prefix + suffix, group, kind });
const workshop = (suffix, group, kind) => entry('frozen-rabbit-', suffix, group, kind);
const tome = (suffix, group, kind) => entry('frozen-rabbit-tome-', suffix, group, kind);
export const projects = {
  workshop: [
    workshop('favorites-data', 'favorites', 'array'),
    workshop('notes', 'notes', 'array'),
    ...['lang', 'market-region', 'market-dc', 'market-strategy'].map(key => workshop(key, 'settings', 'string')),
    workshop('dark-mode', 'settings', 'boolean'),
  ],
  tome: [
    tome('favorite-items', 'favorites', 'array'),
    tome('library', 'library', 'array'),
    tome('experiments', 'experiments', 'array'),
    tome('frontier-studies', 'studies', 'array'),
    tome('gear-profiles', 'gear', 'array'),
    ...['lang', 'library-display-mode', 'experiment-database-display-mode', 'frontier-studies-display-mode'].map(key => tome(key, 'settings', 'string')),
    tome('dark-mode', 'settings', 'boolean'),
    ...['macro-settings', 'solver-settings', 'frontier-settings', 'favorite-item-filters', 'solver-stats', 'selected-food', 'node-bonuses', 'active-item', 'user-stats'].map(key => tome(key, 'settings')),
  ],
};

export function readProject(storage, project) {
  const entries = projects[project];
  if (!entries) throw new Error('Unknown project');
  const data = {};
  const counts = Object.fromEntries(entries.map(({ group }) => [group, 0]));
  const invalidKeys = [];
  try {
    for (const { key, group, kind } of entries) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      data[key] = raw;
      try {
        const value = kind === 'string' ? raw : JSON.parse(raw);
        if (kind === 'array' && !Array.isArray(value)) throw new Error('Expected array');
        if (kind === 'boolean' && typeof value !== 'boolean') throw new Error('Expected boolean');
        if (kind === 'json' && (value === null || typeof value !== 'object' || Array.isArray(value))) throw new Error('Expected object');
        if (kind === 'string' && !value.length) throw new Error('Expected string');
        counts[group] += kind === 'array' ? value.length : 1;
      } catch {
        invalidKeys.push(key);
        // Unknown counts must not look like confirmed zero or partial totals.
        counts[group] = null;
      }
    }
  } catch {
    // A partial read is not a complete backup.
    return { data: {}, counts: {}, invalidKeys: [], status: 'blocked' };
  }
  for (const key of invalidKeys) counts[entries.find(entry => entry.key === key).group] = null;
  return { data, counts, invalidKeys, status: Object.keys(data).length ? 'ready' : 'empty' };
}

export function createBackup(project, snapshot, sourceOrigin, date = new Date()) {
  if (snapshot.status !== 'ready') throw new Error('No complete snapshot available');
  return {
    format: `frozen-rabbit-${project}-backup`,
    version: 1,
    exportedAt: date.toISOString(),
    sourceOrigin,
    data: snapshot.data,
  };
}

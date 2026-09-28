import test from 'node:test';
import assert from 'node:assert/strict';
import * as launches from '../../src/lib/ronsasApps.ts';
const { resolveRonsasLaunch } = launches;

test('known static aliases use the DataNest app path', () => {
  assert.deepEqual(resolveRonsasLaunch('SyncVision', '/DataNest', {}), {
    slug: 'syncvision', name: 'Sync Vision', kind: 'static',
    href: '/DataNest/apps/syncvision/', availability: 'ready',
  });
  assert.equal(resolveRonsasLaunch('unknown app', '/DataNest', {}), null);
});

test('server and operations launches remain unavailable without verified runtime', () => {
  const youtube = resolveRonsasLaunch('YouTube Optimizer', '/DataNest', {});
  assert.equal(youtube?.kind, 'server');
  assert.equal(youtube?.href, null);
  assert.equal(youtube?.availability, 'unavailable');
  const control = resolveRonsasLaunch('RONS Control Center', '/DataNest', {});
  assert.equal(control?.kind, 'operations');
  assert.equal(control?.href, null);
});

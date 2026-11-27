import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildModernizedStacks,
  MODERNIZED_STACKS,
  type ModernizedStacksManifest,
} from './modernize-catalog.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const ociCatalogPath = path.join(__dirname, 'oci-catalog.json');
const modernizedPath = path.join(__dirname, 'modernized-stacks.json');

const LEGACY_BOILERPLATE_MARKERS = [
  'supervisord',
  'ubuntu:14.04',
  '/etc/service',
  'runit',
  'upstart',
];

test('modernize-catalog classifies all 138 dockerimages + 19 sameersbn entries deterministically', () => {
  const generated = buildModernizedStacks(ociCatalogPath);

  assert.equal(generated.schema, 'awesome-os.modernized-stacks.v1');
  assert.equal(generated.abiMagic, '0x33564742');
  assert.equal(generated.casProtocol, 'holo-v11');

  assert.equal(generated.summary.dockerimagesOrgRepos, 138);
  assert.equal(generated.summary.sameersbnSuccessors, 19);
  assert.equal(generated.summary.totalLegacyEntries, 157);
  assert.equal(generated.summary.modernizedStackImages, 16);
  assert.equal(generated.entries.length, 157);

  const uniqueIds = new Set(generated.entries.map((entry) => entry.id));
  assert.equal(uniqueIds.size, 157, 'all legacy entry IDs must be unique');

  const dispositionSum = Object.values(generated.summary.byDisposition).reduce(
    (acc, n) => acc + n,
    0,
  );
  assert.equal(dispositionSum, 157, 'disposition tallies must sum to 157');
  assert.ok(generated.summary.byDisposition['modernized-stack'] > 0);
  assert.ok(generated.summary.byDisposition['consolidated-into-base'] > 0);
  assert.ok(generated.summary.byDisposition['superseded-by-awesome-os'] > 0);
  assert.ok(generated.summary.byDisposition['archived-obsolete'] > 0);

  for (const entry of generated.entries) {
    assert.ok(entry.targetImage.startsWith('ghcr.io/awesome-os/'), `${entry.id} targetImage`);
    assert.ok(entry.targetImage.endsWith(':latest'), `${entry.id} :latest tag`);
    assert.ok(entry.upstreamBase.length > 0, `${entry.id} upstreamBase`);
    assert.ok(entry.eliminatedBoilerplate.length > 0, `${entry.id} eliminatedBoilerplate`);
  }
});

test('catalog/modernized-stacks.json on disk is in sync with modernize-catalog.mts', () => {
  assert.equal(fs.existsSync(modernizedPath), true, 'missing catalog/modernized-stacks.json');
  const raw = fs.readFileSync(modernizedPath, 'utf8');
  assert.equal(/\bb8g-ghost\b/i.test(raw), false, 'must not reference legacy b8g-ghost');
  assert.equal(/\bghost-(node|py|cpp|jvm|php|ruby)\b/i.test(raw), false);

  const onDisk = JSON.parse(raw) as ModernizedStacksManifest;
  const generated = buildModernizedStacks(ociCatalogPath);
  assert.deepEqual(onDisk, generated);
});

test('all 16 modernized stack Dockerfiles exist, inject SHA-512 holo-pm, and have zero legacy boilerplate', () => {
  assert.equal(MODERNIZED_STACKS.length, 16);

  const manifest = JSON.parse(fs.readFileSync(modernizedPath, 'utf8')) as ModernizedStacksManifest;
  for (const stack of manifest.stacks) {
    assert.ok(
      stack.legacySourcesCount >= 1,
      `${stack.name} must modernize at least 1 legacy source`,
    );

    const dfPath = path.join(repoRoot, stack.dockerfile);
    assert.equal(fs.existsSync(dfPath), true, `missing ${stack.dockerfile}`);
    const content = fs.readFileSync(dfPath, 'utf8');

    assert.equal(
      content.includes('AS holo-fetch'),
      true,
      `${stack.dockerfile} must use holo-fetch stage`,
    );
    assert.equal(
      content.includes('sha512sum -c -'),
      true,
      `${stack.dockerfile} must verify holo-pm with sha512sum`,
    );
    assert.equal(
      content.includes('COPY --from=holo-fetch /tmp/holo-pm /bin/holo-pm'),
      true,
      `${stack.dockerfile} must install /bin/holo-pm`,
    );
    assert.equal(
      content.includes('B8G_CAS_V11_ROOT="/var/lib/b8g/cas/v11"'),
      true,
      `${stack.dockerfile} must set B8G_CAS_V11_ROOT`,
    );
    assert.equal(
      content.includes('VOLUME ["/var/lib/b8g/cas"]'),
      true,
      `${stack.dockerfile} must declare shared CAS volume`,
    );
    assert.equal(
      /\bb8g-ghost\b/i.test(content),
      false,
      `${stack.dockerfile} must not contain legacy b8g-ghost`,
    );
    assert.equal(
      /\bghost-(node|py|cpp|jvm|php|ruby)\b/i.test(content),
      false,
      `${stack.dockerfile} must not contain legacy ghost-* names`,
    );

    const lower = content.toLowerCase();
    for (const marker of LEGACY_BOILERPLATE_MARKERS) {
      assert.equal(
        lower.includes(marker),
        false,
        `${stack.dockerfile} must not contain legacy boilerplate "${marker}"`,
      );
    }
  }
});

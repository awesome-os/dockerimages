import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(__dirname, 'oci-catalog.json');

interface PublishedBaseImage {
  name: string;
  image: string;
  dockerfile: string;
  base: string;
  platforms: string[];
  casVolume: string;
  casV11Root: string;
}

interface TierRepo {
  name: string;
  url: string;
  tier: string;
}

interface OciCatalog {
  schema: string;
  abiMagic: string;
  casProtocol: string;
  publishedBaseImages: PublishedBaseImage[];
  awesomeOsOrgImages: {
    reposWithOciFiles: number;
    activeRepos: number;
    archivedRepos: number;
    totalFiles: number;
    categories: Record<string, Array<{ name: string; fileCount: number; files: string[] }>>;
  };
  dockerimagesOrg: {
    totalRepos: number;
    tierCounts: Record<string, number>;
    tiers: {
      tier1_flagships: TierRepo[];
      tier2_sameersbn_successors: TierRepo[];
      tier3_modernizable_utilities: TierRepo[];
      tier4_archive_candidates: TierRepo[];
    };
  };
  sameersbnSuccessors: {
    mappedCount: number;
    mappings: Array<{ name: string; stars: number; successors: string[] }>;
  };
}

test('catalog/oci-catalog.json parses with expected schema and ABI magic', () => {
  const raw = fs.readFileSync(catalogPath, 'utf8');
  assert.equal(/\bb8g-ghost\b/i.test(raw), false, 'catalog must not contain legacy b8g-ghost references');
  assert.equal(/\bghost-(node|py|cpp|jvm)\b/i.test(raw), false, 'catalog must not contain legacy ghost-* image names');

  const catalog = JSON.parse(raw) as OciCatalog;
  assert.equal(catalog.schema, 'awesome-os.oci-catalog.v1');
  assert.equal(catalog.abiMagic, '0x33564742');
  assert.equal(catalog.casProtocol, 'holo-v11');
});

test('all 5 publishedBaseImages exist on disk and contain zero legacy ghost-* names', () => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as OciCatalog;
  const expected = ['t2linux', 'holo-node', 'holo-py', 'holo-cpp', 'holo-jvm'];

  assert.deepEqual(
    catalog.publishedBaseImages.map((img) => img.name),
    expected,
  );

  for (const name of expected) {
    const dfPath = path.join(repoRoot, name, 'Dockerfile');
    assert.equal(fs.existsSync(dfPath), true, `missing ${name}/Dockerfile`);
    const content = fs.readFileSync(dfPath, 'utf8');
    assert.equal(/\bghost-/i.test(content), false, `${name}/Dockerfile must not contain ghost-`);
  }
});

test('dockerimagesOrg partitions all 138 repos uniquely across 4 tiers', () => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as OciCatalog;
  assert.equal(catalog.dockerimagesOrg.totalRepos, 138);

  const {
    tier1_flagships,
    tier2_sameersbn_successors,
    tier3_modernizable_utilities,
    tier4_archive_candidates,
  } = catalog.dockerimagesOrg.tiers;

  assert.ok(tier2_sameersbn_successors.length >= 10, 'tier2_sameersbn_successors must have >= 10 entries');

  const allTiers = [
    ...tier1_flagships,
    ...tier2_sameersbn_successors,
    ...tier3_modernizable_utilities,
    ...tier4_archive_candidates,
  ];

  const uniqueNames = new Set(allTiers.map((r) => r.name));
  assert.equal(allTiers.length, 138, 'sum of all 4 tiers must equal 138');
  assert.equal(uniqueNames.size, 138, 'every repo name must be unique across all 4 tiers');
});

test('awesomeOsOrgImages catalogs >= 100 OCI/Compose files across active and archived repos', () => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as OciCatalog;
  assert.ok(
    catalog.awesomeOsOrgImages.totalFiles >= 100,
    `expected >= 100 OCI/Compose files, got ${catalog.awesomeOsOrgImages.totalFiles}`,
  );
  assert.ok(catalog.awesomeOsOrgImages.reposWithOciFiles >= 30);
  assert.ok(catalog.sameersbnSuccessors.mappedCount >= 10);
});

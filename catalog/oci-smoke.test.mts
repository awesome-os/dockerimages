import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildDockerRunArgs,
  exportTarballMetadata,
  getBaseSmokeSpec,
  getStackSmokeSpec,
  listBaseImages,
  listStackImages,
  resolveReleaseAssetUrl,
  verifyAnonymousReleaseAsset,
  verifyManifestPlatforms,
} from './oci-smoke.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('listBaseImages matches all 9 publishedBaseImages in oci-catalog.json', () => {
  const baseImages = listBaseImages();
  assert.equal(baseImages.length, 9);

  const catalog = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'oci-catalog.json'), 'utf8'),
  ) as { publishedBaseImages: Array<{ name: string }> };
  assert.deepEqual(
    baseImages,
    catalog.publishedBaseImages.map((img) => img.name),
  );
});

test('listStackImages matches all 16 stacks in modernized-stacks.json', () => {
  const stackImages = listStackImages();
  assert.equal(stackImages.length, 16);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'modernized-stacks.json'), 'utf8'),
  ) as { stacks: Array<{ name: string }> };
  assert.deepEqual(
    stackImages,
    manifest.stacks.map((stack) => stack.name),
  );
});

test('getBaseSmokeSpec covers all 9 base images and linux/arm64 holo-node', () => {
  const expectedMarkers: Record<string, string[]> = {
    t2linux: ['/etc/t2linux-release', '/bin/coreutils', '/bin/holo-pm'],
    'holo-node': ['v27.*', 'amd64 node -v', '/usr/local/bin/holo-node-launcher'],
    'holo-py': ['python3 --version', '/bin/holo-pm'],
    'holo-cpp': ['/usr/local/include/libholo_pm.h', '/usr/local/lib/libholo-pm.so'],
    'holo-jvm': ['java -version', '/bin/holo-pm'],
    'holo-php': ['php -v', 'composer --version', 'COMPOSER_CACHE_DIR'],
    'holo-ruby': ['ruby -v', 'bundle --version', 'BUNDLE_CACHE_PATH'],
    'holo-e2e-runner': ['gcc --version', '/usr/local/bin/holo-e2e-probe', '/usr/share/vulkan/icd.d/'],
    'holo-e2e-lite': ['git --version', 'HOLO_E2E_OFFSCREEN', 'HOLO_E2E_LITE'],
  };

  for (const name of listBaseImages()) {
    const spec = getBaseSmokeSpec(name);
    assert.equal(spec.mode, 'base');
    assert.equal(spec.name, name);
    assert.equal(spec.platform, 'linux/amd64');
    assert.ok(spec.script.includes('set -eu'), `${name} missing set -eu`);
    assert.ok(spec.script.includes('/bin/holo-pm'), `${name} missing /bin/holo-pm check`);
    for (const marker of expectedMarkers[name]) {
      assert.ok(spec.script.includes(marker), `${name} missing marker ${marker}`);
    }

    const args = buildDockerRunArgs(spec, `ghcr.io/awesome-os/${name}:smoke`);
    assert.equal(args[0], 'run');
    assert.equal(args[1], '--rm');
    if (name === 't2linux') {
      assert.equal(args.includes('sh'), false, 't2linux invokes entrypoint directly with -c');
      assert.equal(args[3], '-c');
    } else {
      assert.equal(args[3], 'sh');
      assert.equal(args[4], '-c');
    }
  }

  const arm64Node = getBaseSmokeSpec('holo-node', { platform: 'linux/arm64' });
  assert.equal(arm64Node.platform, 'linux/arm64');
  assert.ok(arm64Node.script.includes('uname -m'));
  assert.ok(arm64Node.script.includes('arm64 node -v'));
  const armArgs = buildDockerRunArgs(arm64Node, 'ghcr.io/awesome-os/holo-node:smoke-arm64');
  assert.deepEqual(armArgs.slice(0, 5), [
    'run',
    '--rm',
    '--platform',
    'linux/arm64',
    'ghcr.io/awesome-os/holo-node:smoke-arm64',
  ]);
});

test('getStackSmokeSpec covers all 16 stack images with CAS invariants', () => {
  const expectedStackCmd: Record<string, string> = {
    'holo-nginx': 'nginx -v 2>&1',
    'holo-haproxy': 'haproxy -v | head -n 2',
    'holo-varnish': 'varnishd -V 2>&1 | head -n 2',
    'holo-httpd': 'httpd -v',
    'holo-postgres': 'postgres --version',
    'holo-mariadb': 'mariadbd --version',
    'holo-valkey': 'valkey-server --version',
    'holo-mongodb': 'mongod --version | head -n 3',
    'holo-solr': 'solr version',
    'holo-go': 'go version',
    'holo-deno': 'deno --version',
    'holo-git': 'git --version',
    'holo-wordpress': 'php -v | head -n 1 && php-fpm -v | head -n 1',
    'holo-ghost': 'node -v && test -d /var/lib/ghost',
    'holo-redmine': 'ruby -v && bundle --version',
    'holo-squid': 'squid -v | head -n 2',
  };

  for (const name of listStackImages()) {
    const spec = getStackSmokeSpec(name);
    assert.equal(spec.mode, 'stack');
    assert.equal(spec.name, name);
    assert.equal(spec.entrypoint, 'sh');
    assert.ok(spec.script.includes('test -x /bin/holo-pm'));
    assert.ok(spec.script.includes('test -d /var/lib/b8g/cas/v11'));
    assert.ok(spec.script.includes('test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"'));
    assert.ok(spec.script.includes('test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"'));
    assert.ok(spec.script.includes(expectedStackCmd[name]), `${name} missing stack command`);

    const args = buildDockerRunArgs(spec, `ghcr.io/awesome-os/${name}:smoke`);
    assert.deepEqual(args.slice(0, 6), [
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      `ghcr.io/awesome-os/${name}:smoke`,
      '-c',
    ]);
  }
});

test('getBaseSmokeSpec and getStackSmokeSpec reject unknown images', () => {
  assert.throws(() => getBaseSmokeSpec('unknown-base'), /Unknown base image/);
  assert.throws(() => getStackSmokeSpec('unknown-stack'), /Unknown stack image/);
});

test('verifyManifestPlatforms validates linux/amd64 and linux/arm64', () => {
  const valid = JSON.stringify({
    manifests: [
      { platform: { os: 'linux', architecture: 'amd64' } },
      { platform: { os: 'linux', architecture: 'arm64' } },
    ],
  });
  assert.deepEqual(verifyManifestPlatforms(valid), ['linux/amd64', 'linux/arm64']);

  const missingArm64 = JSON.stringify({
    manifests: [{ platform: { os: 'linux', architecture: 'amd64' } }],
  });
  assert.throws(() => verifyManifestPlatforms(missingArm64), /linux\/arm64/);
});

test('exportTarballMetadata and resolveReleaseAssetUrl build canonical v11-oci-latest URLs', () => {
  assert.equal(
    resolveReleaseAssetUrl('awesome-os/dockerimages', 'v11-oci-latest', 'SHA512SUMS-holo-node.txt'),
    'https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/SHA512SUMS-holo-node.txt',
  );
  assert.throws(() => resolveReleaseAssetUrl('', 'v11-oci-latest', 'a'), /non-empty/);

  for (const name of listBaseImages()) {
    const meta = exportTarballMetadata(name);
    assert.equal(meta.name, name);
    assert.equal(meta.tag, 'v11-oci-latest');
    assert.equal(meta.repo, 'awesome-os/dockerimages');
    assert.equal(meta.tarName, `${name}-linux-amd64.oci.tar.gz`);
    assert.equal(meta.sumName, `SHA512SUMS-${name}.txt`);
    assert.equal(
      meta.tarUrl,
      `https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/${name}-linux-amd64.oci.tar.gz`,
    );
    assert.equal(
      meta.sumUrl,
      `https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/SHA512SUMS-${name}.txt`,
    );
  }
  assert.throws(() => exportTarballMetadata('../bad'), /Invalid image name/);
});

test('verifyAnonymousReleaseAsset checks HTTP 200 without auth headers', async () => {
  const seenCalls: Array<{ url: string; init?: RequestInit }> = [];
  const okFetch: typeof fetch = async (input, init) => {
    seenCalls.push({ url: String(input), init });
    return new Response('deadbeef  holo-node-linux-amd64.oci.tar.gz\n', { status: 200 });
  };

  const res = await verifyAnonymousReleaseAsset({ name: 'holo-node' }, okFetch);
  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(
    res.sumUrl,
    'https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/SHA512SUMS-holo-node.txt',
  );
  assert.equal(seenCalls.length, 1);
  assert.equal(seenCalls[0].init?.method, 'GET');
  assert.equal(seenCalls[0].init?.headers, undefined);

  const failFetch: typeof fetch = async () => new Response('Not Found', { status: 404 });
  await assert.rejects(
    () => verifyAnonymousReleaseAsset({ name: 't2linux' }, failFetch),
    /expected HTTP 200, got 404/,
  );
});

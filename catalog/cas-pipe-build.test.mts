import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CAS_PIPE_SCHEMA,
  computeContainerCasId,
  listAllContainerCasRecords,
  listAllImages,
  OCI_CAS_ID_LABEL,
  renderShellPipeCommand,
} from './cas-pipe-build.mts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

test('computeContainerCasId covers all 9 base + 16 stack images with deterministic SHA-512 1:1 mapping', () => {
  const allNames = listAllImages();
  assert.equal(allNames.length, 25);

  const records = listAllContainerCasRecords(repoRoot);
  assert.equal(records.length, 25);

  const seenCasIds = new Set<string>();
  const seenCasTags = new Set<string>();

  for (const rec of records) {
    assert.equal(rec.schema, CAS_PIPE_SCHEMA);
    assert.match(rec.casId, /^[0-9a-f]{128}$/, `${rec.name} casId must be 128-char SHA-512 hex`);
    assert.equal(rec.shortCasId, rec.casId.slice(0, 12));
    assert.equal(rec.casTag, `awesome-os/${rec.name}:cas-${rec.shortCasId}`);
    assert.equal(rec.latestTag, `awesome-os/${rec.name}:latest`);
    assert.equal(rec.ociLabel, `${OCI_CAS_ID_LABEL}=${rec.casId}`);
    assert.equal(fs.existsSync(path.join(repoRoot, rec.dockerfile)), true);

    assert.equal(seenCasIds.has(rec.casId), false, `duplicate casId for ${rec.name}`);
    assert.equal(seenCasTags.has(rec.casTag), false, `duplicate casTag for ${rec.name}`);
    seenCasIds.add(rec.casId);
    seenCasTags.add(rec.casTag);

    const repeat = computeContainerCasId(rec.name, repoRoot);
    assert.equal(repeat.casId, rec.casId, `${rec.name} casId must be deterministic across calls`);
  }
});

test('renderShellPipeCommand emits curl|docker-build for zero-context images and git-context docker-build for E2E images', () => {
  const holoNode = computeContainerCasId('holo-node', repoRoot);
  assert.equal(holoNode.hasBuildContext, false);
  assert.deepEqual(holoNode.contextFiles, []);
  assert.equal(
    holoNode.pipeCommand,
    `curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/holo-node/Dockerfile | docker build --build-arg SOURCE_DATE_EPOCH=0 --label org.awesome-os.cas-id=${holoNode.casId} -t awesome-os/holo-node:latest -`,
  );

  const holoNginx = computeContainerCasId('holo-nginx', repoRoot);
  assert.equal(holoNginx.kind, 'stack');
  assert.equal(holoNginx.relDir, 'stacks/holo-nginx');
  assert.equal(holoNginx.hasBuildContext, false);
  assert.equal(
    holoNginx.pipeCommand,
    `curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/stacks/holo-nginx/Dockerfile | docker build --build-arg SOURCE_DATE_EPOCH=0 --label org.awesome-os.cas-id=${holoNginx.casId} -t awesome-os/holo-nginx:latest -`,
  );

  for (const ctxName of ['holo-e2e-runner', 'holo-e2e-lite'] as const) {
    const rec = computeContainerCasId(ctxName, repoRoot);
    assert.equal(rec.hasBuildContext, true);
    assert.deepEqual(rec.contextFiles, ['holo-e2e-probe.mjs']);
    assert.equal(
      rec.pipeCommand,
      `docker build --build-arg SOURCE_DATE_EPOCH=0 --label org.awesome-os.cas-id=${rec.casId} -t awesome-os/${ctxName}:latest https://github.com/awesome-os/dockerimages.git#main:${ctxName}`,
    );
  }

  const customCmd = renderShellPipeCommand('t2linux', {
    repoRoot,
    tag: 'v11',
    casId: 'abcd'.repeat(32),
  });
  assert.equal(
    customCmd,
    `curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/t2linux/Dockerfile | docker build --build-arg SOURCE_DATE_EPOCH=0 --label org.awesome-os.cas-id=${'abcd'.repeat(32)} -t awesome-os/t2linux:v11 -`,
  );
});

test('computeContainerCasId sensitivity to lockfile pins and sibling context files', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cas-pipe-test-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'holo-e2e-lite'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'holo-e2e-lite', 'Dockerfile'),
      'FROM node:current-alpine\nCOPY holo-e2e-probe.mjs /usr/local/bin/holo-e2e-probe\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'holo-e2e-lite', 'holo-e2e-probe.mjs'),
      'console.log("probe-v1");\n',
      'utf8',
    );

    const lockV1 = JSON.stringify({
      schema: 'holo-compiler-lockfile-v1',
      abiMagic: '0x33564742',
      casLayout: 'v11',
      dependencies: [
        {
          id: 'awesome-os/holo-pm@v0.2.0/holo-pm-linux-x86_64',
          filename: 'holo-pm-linux-x86_64',
          sha512: 'aa'.repeat(64),
        },
      ],
    });
    const lockV2 = JSON.stringify({
      schema: 'holo-compiler-lockfile-v1',
      abiMagic: '0x33564742',
      casLayout: 'v11',
      dependencies: [
        {
          id: 'awesome-os/holo-pm@v0.2.1/holo-pm-linux-x86_64',
          filename: 'holo-pm-linux-x86_64',
          sha512: 'bb'.repeat(64),
        },
      ],
    });

    const baseline = computeContainerCasId('holo-e2e-lite', tmpRoot, { lockfileJson: lockV1 });
    assert.equal(baseline.lockfilePresent, true);
    assert.equal(baseline.hasBuildContext, true);

    const withNewLock = computeContainerCasId('holo-e2e-lite', tmpRoot, { lockfileJson: lockV2 });
    assert.notEqual(withNewLock.casId, baseline.casId, 'lockfile change must change casId');

    fs.writeFileSync(
      path.join(tmpRoot, 'holo-e2e-lite', 'holo-e2e-probe.mjs'),
      'console.log("probe-v2");\n',
      'utf8',
    );
    const withNewContext = computeContainerCasId('holo-e2e-lite', tmpRoot, {
      lockfileJson: lockV1,
    });
    assert.notEqual(
      withNewContext.casId,
      baseline.casId,
      'sibling context file change must change casId',
    );

    const noLock = computeContainerCasId('holo-e2e-lite', tmpRoot);
    assert.equal(noLock.lockfilePresent, false);
    assert.notEqual(noLock.casId, baseline.casId);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('CLI supports --list --json and --image --print-script', () => {
  const cliPath = path.join(__dirname, 'cas-pipe-build.mts');
  const listOut = execFileSync(process.execPath, [cliPath, '--list', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });
  const parsed = JSON.parse(listOut) as {
    schema: string;
    count: number;
    baseCount: number;
    stackCount: number;
    images: Array<{ name: string; casId: string; casTag: string; pipeCommand: string }>;
  };
  assert.equal(parsed.schema, CAS_PIPE_SCHEMA);
  assert.equal(parsed.count, 25);
  assert.equal(parsed.baseCount, 9);
  assert.equal(parsed.stackCount, 16);
  assert.equal(parsed.images.length, 25);

  const printOut = execFileSync(
    process.execPath,
    [cliPath, '--image', 'holo-node', '--print-script'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: false,
    },
  ).trim();
  assert.ok(
    printOut.startsWith('curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/holo-node/Dockerfile | docker build '),
  );
  assert.ok(printOut.endsWith(' -t awesome-os/holo-node:latest -'));
});

#!/usr/bin/env node
/**
 * @file catalog/oci-smoke.mts
 * @description Declarative OCI base & stack container smoke tester, multi-arch
 *   manifest verifier, and public E2E OCI tarball publisher for `awesome-os/dockerimages`.
 *
 * Strictly `erasableSyntaxOnly: true` & Node built-ins only (`shell: false`).
 */
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

export interface SmokeSpec {
  readonly mode: 'base' | 'stack';
  readonly name: string;
  readonly platform: string;
  readonly entrypoint?: string;
  readonly shellPrefix: readonly string[];
  readonly checks: readonly string[];
  readonly script: string;
}

const BASE_IMAGE_NAMES = [
  't2linux',
  'holo-node',
  'holo-py',
  'holo-cpp',
  'holo-jvm',
  'holo-php',
  'holo-ruby',
  'holo-e2e-runner',
  'holo-e2e-lite',
] as const;

const STACK_CHECKS: Readonly<Record<string, readonly string[]>> = {
  'holo-nginx': ['nginx -v 2>&1'],
  'holo-haproxy': ['haproxy -v | head -n 2'],
  'holo-varnish': ['varnishd -V 2>&1 | head -n 2'],
  'holo-httpd': ['httpd -v'],
  'holo-postgres': ['postgres --version'],
  'holo-mariadb': ['mariadbd --version'],
  'holo-valkey': ['valkey-server --version'],
  'holo-mongodb': ['mongod --version | head -n 3'],
  'holo-solr': ['solr version'],
  'holo-go': ['go version'],
  'holo-deno': ['deno --version'],
  'holo-git': ['git --version'],
  'holo-wordpress': ['php -v | head -n 1 && php-fpm -v | head -n 1'],
  'holo-ghost': ['node -v && test -d /var/lib/ghost'],
  'holo-redmine': ['ruby -v && bundle --version'],
  'holo-squid': ['squid -v | head -n 2'],
};

const STACK_IMAGE_NAMES: readonly string[] = Object.keys(STACK_CHECKS);

export function listBaseImages(): readonly string[] {
  return BASE_IMAGE_NAMES;
}

export function listStackImages(): readonly string[] {
  return STACK_IMAGE_NAMES;
}

function buildHoloNodeChecks(platform: string): readonly string[] {
  const archLabel = platform === 'linux/arm64' ? 'arm64' : 'amd64';
  const lines: string[] = ['set -eu'];
  if (platform === 'linux/arm64') {
    lines.push('uname -m');
  }
  lines.push(
    'NODE_V="$(node -v)"',
    `echo "${archLabel} node -v -> \${NODE_V}"`,
    'case "${NODE_V}" in',
    '  v27.*) ;;',
    `  *) echo "ERROR: expected Node v27.x on ${platform}, got \${NODE_V}" >&2; exit 1 ;;`,
    'esac',
    '/bin/coreutils --version | head -n 1',
    'ls -la /bin/busybox /bin/coreutils /bin/holo-pm /usr/local/bin/holo-node-launcher /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/coreutils',
    'test -x /bin/holo-pm',
    'test -x /usr/local/bin/holo-node-launcher',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    `echo "[smoke] holo-node ${platform} OK (\${NODE_V})"`,
  );
  return lines;
}

const BASE_CHECK_MAP: Readonly<Record<string, readonly string[]>> = {
  t2linux: [
    'set -eu',
    'cat /etc/t2linux-release',
    '/bin/coreutils --version | head -n 1',
    'ls -la /bin/busybox /bin/sh /bin/coreutils /bin/holo-pm /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/busybox',
    'test -x /bin/coreutils',
    'test -x /bin/holo-pm',
    'test -s /etc/ssl/certs/ca-certificates.crt',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'echo "[smoke] t2linux OK (B8G_CAS_V11_ROOT=$B8G_CAS_V11_ROOT)"',
  ],
  'holo-py': [
    'set -eu',
    'python3 --version',
    'ls -la /bin/busybox /bin/holo-pm /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/holo-pm',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'echo "[smoke] holo-py OK"',
  ],
  'holo-cpp': [
    'set -eu',
    'ls -la /bin/busybox /bin/holo-pm /usr/local/include/libholo_pm.h /usr/local/lib/libholo-pm.so /usr/include/stdio.h /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/holo-pm',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'echo "[smoke] holo-cpp OK"',
  ],
  'holo-jvm': [
    'set -eu',
    'java -version',
    'ls -la /bin/busybox /bin/holo-pm /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/holo-pm',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'echo "[smoke] holo-jvm OK"',
  ],
  'holo-php': [
    'set -eu',
    'php -v',
    'composer --version',
    'ls -la /bin/busybox /bin/holo-pm /usr/local/bin/composer /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/holo-pm',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'test "$COMPOSER_CACHE_DIR" = "/var/lib/b8g/cas/v11/composer"',
    'echo "[smoke] holo-php OK"',
  ],
  'holo-ruby': [
    'set -eu',
    'ruby -v',
    'bundle --version',
    'ls -la /bin/busybox /bin/holo-pm /etc/ssl/certs/ca-certificates.crt',
    'test -x /bin/holo-pm',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'test "$BUNDLE_CACHE_PATH" = "/var/lib/b8g/cas/v11/gems"',
    'echo "[smoke] holo-ruby OK"',
  ],
  'holo-e2e-runner': [
    'set -eu',
    'node -v && gcc --version | head -n 1 && g++ --version | head -n 1 && test -x /bin/holo-pm && /usr/local/bin/holo-e2e-probe --out /tmp/probe.bmp && ls -la /usr/share/vulkan/icd.d/',
    'echo "[smoke] holo-e2e-runner OK"',
  ],
  'holo-e2e-lite': [
    'set -eu',
    'node -v && git --version && test -x /bin/holo-pm && /usr/local/bin/holo-e2e-probe --out /tmp/probe.bmp',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'test "$HOLO_E2E_OFFSCREEN" = "1"',
    'test "$HOLO_E2E_LITE" = "1"',
    'echo "[smoke] holo-e2e-lite OK"',
  ],
};

export function getBaseSmokeSpec(
  name: string,
  options?: { readonly platform?: string },
): SmokeSpec {
  if (!(BASE_IMAGE_NAMES as readonly string[]).includes(name)) {
    throw new Error(`Unknown base image: ${name}`);
  }
  const platform = options?.platform?.trim() || 'linux/amd64';
  const checks =
    name === 'holo-node' ? buildHoloNodeChecks(platform) : BASE_CHECK_MAP[name];
  const shellPrefix = name === 't2linux' ? ([] as const) : (['sh'] as const);
  return {
    mode: 'base',
    name,
    platform,
    shellPrefix,
    checks,
    script: checks.join('\n'),
  };
}

export function getStackSmokeSpec(name: string): SmokeSpec {
  const stackChecks = STACK_CHECKS[name];
  if (!stackChecks) {
    throw new Error(`Unknown stack image: ${name}`);
  }
  const checks: readonly string[] = [
    'set -eu',
    'test -x /bin/holo-pm',
    'test -d /var/lib/b8g/cas/v11',
    'test "$B8G_CAS_DIR" = "/var/lib/b8g/cas"',
    'test "$B8G_CAS_V11_ROOT" = "/var/lib/b8g/cas/v11"',
    'echo "[smoke] holo-pm & CAS env OK (B8G_CAS_V11_ROOT=$B8G_CAS_V11_ROOT)"',
    ...stackChecks,
    `echo "[smoke] ${name} OK"`,
  ];
  return {
    mode: 'stack',
    name,
    platform: 'linux/amd64',
    entrypoint: 'sh',
    shellPrefix: [],
    checks,
    script: checks.join('\n'),
  };
}

export function buildDockerRunArgs(spec: SmokeSpec, imageRef: string): string[] {
  const args = ['run', '--rm'];
  if (spec.platform !== 'linux/amd64') {
    args.push('--platform', spec.platform);
  }
  if (spec.entrypoint) {
    args.push('--entrypoint', spec.entrypoint);
  }
  args.push(imageRef, ...spec.shellPrefix, '-c', spec.script);
  return args;
}

export function verifyManifestPlatforms(
  rawManifestJson: string,
  requiredPlatforms: readonly string[] = ['linux/amd64', 'linux/arm64'],
): readonly string[] {
  const parsed = JSON.parse(rawManifestJson) as {
    manifests?: Array<{ platform?: { os?: string; architecture?: string } }>;
  };
  const manifests = Array.isArray(parsed.manifests) ? parsed.manifests : [];
  const platforms = manifests
    .map((m) =>
      m.platform?.os && m.platform?.architecture
        ? `${m.platform.os}/${m.platform.architecture}`
        : '',
    )
    .filter(Boolean);

  for (const required of requiredPlatforms) {
    if (!platforms.includes(required)) {
      throw new Error(
        `OCI manifest list missing required platform ${required}; found: ${platforms.join(', ') || '(none)'}`,
      );
    }
  }
  return platforms;
}

function runDockerSmoke(spec: SmokeSpec, imageRef: string): void {
  const sizeOut = execFileSync('docker', ['images', '--format', '{{.Size}}', imageRef], {
    encoding: 'utf8',
    shell: false,
  });
  const size = sizeOut.split(/\r?\n/)[0]?.trim() || 'unknown';
  console.log(`=== IMAGE SIZE (${spec.platform}): ${imageRef} -> ${size} ===`);
  execFileSync('docker', buildDockerRunArgs(spec, imageRef), {
    stdio: 'inherit',
    shell: false,
  });
}

function runVerifyManifest(imageRef: string): void {
  const raw = execFileSync('docker', ['buildx', 'imagetools', 'inspect', '--raw', imageRef], {
    encoding: 'utf8',
    shell: false,
  });
  console.log(`=== OCI MANIFEST LIST: ${imageRef} ===`);
  execFileSync('docker', ['buildx', 'imagetools', 'inspect', imageRef], {
    stdio: 'inherit',
    shell: false,
  });
  const platforms = verifyManifestPlatforms(raw);
  console.log(`[verify] ${imageRef} confirmed ${platforms.join(' + ')}`);
}

async function computeFileSha512(filePath: string): Promise<string> {
  const hash = createHash('sha512');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

async function runExportE2eTarball(
  name: string,
  tag: string,
  repo: string,
): Promise<void> {
  const smokeRef = `ghcr.io/awesome-os/${name}:smoke`;
  const latestRef = `ghcr.io/awesome-os/${name}:latest`;
  const tarName = `${name}-linux-amd64.oci.tar.gz`;
  const sumName = `SHA512SUMS-${name}.txt`;
  const workDir = tmpdir();
  const tarPath = join(workDir, tarName);
  const sumPath = join(workDir, sumName);

  execFileSync('docker', ['tag', smokeRef, latestRef], { stdio: 'inherit', shell: false });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('docker', ['save', latestRef], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: false,
    });
    const exitPromise = new Promise<void>((resExit, rejExit) => {
      child.on('error', rejExit);
      child.on('close', (code) => {
        if (code === 0) resExit();
        else rejExit(new Error(`docker save exited with status ${code ?? 'null'}`));
      });
    });
    Promise.all([
      pipeline(child.stdout, createGzip({ level: 6 }), createWriteStream(tarPath)),
      exitPromise,
    ])
      .then(() => resolvePromise())
      .catch(rejectPromise);
  });

  const sha512 = await computeFileSha512(tarPath);
  writeFileSync(sumPath, `${sha512}  ${tarName}\n`, 'utf8');
  console.log(`[export] ${tarPath} (${statSync(tarPath).size} bytes)`);
  console.log(`${sha512}  ${tarName}`);

  let releaseExists = false;
  try {
    execFileSync('gh', ['release', 'view', tag, '--repo', repo], {
      stdio: 'ignore',
      shell: false,
    });
    releaseExists = true;
  } catch {
    releaseExists = false;
  }

  if (!releaseExists) {
    try {
      execFileSync(
        'gh',
        [
          'release',
          'create',
          tag,
          '--repo',
          repo,
          '--title',
          `Awesome-OS Holo v11 Public OCI Images (${tag})`,
          '--notes',
          'Public SHA-512 verified OCI container bundles for zero-GHCR-auth clean-box Holo-E2E execution.',
        ],
        { stdio: 'inherit', shell: false },
      );
    } catch {
      // Concurrent matrix job may have created the release simultaneously.
    }
  }

  execFileSync(
    'gh',
    ['release', 'upload', tag, tarPath, sumPath, '--repo', repo, '--clobber'],
    { stdio: 'inherit', shell: false },
  );
}

function parseCliArgs(argv: readonly string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const val = argv[i + 1];
    if (!val || val.startsWith('--')) {
      throw new Error(`Missing value for flag --${key}`);
    }
    parsed[key] = val;
    i += 1;
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  const mode = args.mode;
  if (mode === 'base') {
    const name = args.name;
    const image = args.image || `ghcr.io/awesome-os/${name}:smoke`;
    if (!name) throw new Error('--name is required for --mode base');
    runDockerSmoke(getBaseSmokeSpec(name, { platform: args.platform }), image);
    return;
  }
  if (mode === 'stack') {
    const name = args.name;
    const image = args.image || `ghcr.io/awesome-os/${name}:smoke`;
    if (!name) throw new Error('--name is required for --mode stack');
    runDockerSmoke(getStackSmokeSpec(name), image);
    return;
  }
  if (mode === 'verify-manifest') {
    const image = args.image;
    if (!image) throw new Error('--image is required for --mode verify-manifest');
    runVerifyManifest(image);
    return;
  }
  if (mode === 'export-e2e') {
    const name = args.name;
    if (!name) throw new Error('--name is required for --mode export-e2e');
    await runExportE2eTarball(
      name,
      args.tag || 'v11-oci-latest',
      args.repo || 'awesome-os/dockerimages',
    );
    return;
  }
  throw new Error(
    `Invalid or missing --mode (${mode ?? 'none'}); expected base|stack|verify-manifest|export-e2e`,
  );
}

const isMain =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

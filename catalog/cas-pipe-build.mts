#!/usr/bin/env node
/**
 * @file catalog/cas-pipe-build.mts
 * @description Deterministic 1:1 CAS-to-Container shell pipe builder and
 *   content-addressable identity resolver for `awesome-os/dockerimages`.
 *
 * Strictly `erasableSyntaxOnly: true` & Node built-ins only (`shell: false`).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listBaseImages, listStackImages } from './oci-smoke.mts';

export const CAS_PIPE_SCHEMA = 'awesome-os.cas-pipe.v1';
export const DEFAULT_GITHUB_ORG_REPO = 'awesome-os/dockerimages';
export const DEFAULT_GITHUB_BRANCH = 'main';
export const OCI_CAS_ID_LABEL = 'org.awesome-os.cas-id';

export interface LockfileMetadataSummary {
  readonly present: boolean;
  readonly source: string | null;
  readonly schema: string | null;
  readonly abiMagic: string | null;
  readonly casLayout: string | null;
  readonly holoPmPins: readonly {
    readonly id: string;
    readonly filename: string;
    readonly sha512: string;
  }[];
  readonly digest: string | null;
}

export interface ContainerCasResult {
  readonly schema: string;
  readonly name: string;
  readonly kind: 'base' | 'stack';
  readonly relDir: string;
  readonly dockerfile: string;
  readonly contextFiles: readonly string[];
  readonly hasBuildContext: boolean;
  readonly casId: string;
  readonly shortCasId: string;
  readonly casTag: string;
  readonly latestTag: string;
  readonly ociLabel: string;
  readonly lockfilePresent: boolean;
  readonly lockfileSource: string | null;
  readonly lockfileDigest: string | null;
  readonly pipeCommand: string;
}

export interface RenderPipeCommandOptions {
  readonly tag?: string;
  readonly casId?: string;
  readonly repoRoot?: string;
  readonly repo?: string;
  readonly branch?: string;
  readonly lockfilePath?: string;
  readonly lockfileJson?: string;
}

export interface ComputeCasOptions {
  readonly lockfilePath?: string;
  readonly lockfileJson?: string;
  readonly repo?: string;
  readonly branch?: string;
}

const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

function normalizeLf(raw: Buffer): Buffer {
  // Normalize CRLF -> LF so Windows and Linux compute identical SHA-512 digests.
  const text = raw.toString('utf8');
  if (text.includes('\uFFFD')) {
    return raw;
  }
  return Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
}

export function resolveImageLocation(imageName: string): {
  readonly name: string;
  readonly kind: 'base' | 'stack';
  readonly relDir: string;
} {
  const clean = imageName.trim();
  if ((listBaseImages() as readonly string[]).includes(clean)) {
    return { name: clean, kind: 'base', relDir: clean };
  }
  if ((listStackImages() as readonly string[]).includes(clean)) {
    return { name: clean, kind: 'stack', relDir: `stacks/${clean}` };
  }
  throw new Error(
    `Unknown image "${imageName}"; expected one of ${listAllImages().join(', ')}`,
  );
}

export function listAllImages(): readonly string[] {
  return [...listBaseImages(), ...listStackImages()];
}

function collectSiblingContextFiles(imageDir: string, relRoot = ''): string[] {
  const entries = readdirSync(imageDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const files: string[] = [];
  for (const entry of entries) {
    const relPath = relRoot ? posix.join(relRoot, entry.name) : entry.name;
    const fullPath = join(imageDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSiblingContextFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      if (relPath === 'Dockerfile') continue;
      files.push(relPath);
    }
  }
  return files;
}

export function resolveLockfileMetadata(
  repoRoot: string,
  options?: ComputeCasOptions,
): LockfileMetadataSummary {
  let rawText: string | null = null;
  let source: string | null = null;

  if (typeof options?.lockfileJson === 'string') {
    rawText = options.lockfileJson.replace(/\r\n/g, '\n');
    source = 'inline';
  } else {
    const candidates = [
      options?.lockfilePath,
      join(repoRoot, 'holo-compiler-lockfile.json'),
      join(repoRoot, 'catalog', 'holo-compiler-lockfile.json'),
      resolve(repoRoot, '..', 'holo-v11', 'index', 'holo-compiler-lockfile.json'),
    ].filter((p): p is string => typeof p === 'string' && p.length > 0);

    for (const candidate of candidates) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        rawText = readFileSync(candidate, 'utf8').replace(/\r\n/g, '\n');
        source = candidate;
        break;
      }
    }
  }

  if (rawText === null) {
    return {
      present: false,
      source: null,
      schema: null,
      abiMagic: null,
      casLayout: null,
      holoPmPins: [],
      digest: null,
    };
  }

  const parsed = JSON.parse(rawText) as {
    schema?: unknown;
    abiMagic?: unknown;
    casLayout?: unknown;
    dependencies?: Array<{ id?: unknown; filename?: unknown; sha512?: unknown }>;
  };

  const deps = Array.isArray(parsed.dependencies) ? parsed.dependencies : [];
  const holoPmPins = deps
    .filter((d) => {
      const fn = typeof d.filename === 'string' ? d.filename : '';
      return fn.startsWith('holo-pm-linux-') || fn.startsWith('libholo-pm-linux-');
    })
    .map((d) => ({
      id: typeof d.id === 'string' ? d.id : '',
      filename: typeof d.filename === 'string' ? d.filename : '',
      sha512: typeof d.sha512 === 'string' ? d.sha512 : '',
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const canonicalLockMeta = JSON.stringify({
    schema: typeof parsed.schema === 'string' ? parsed.schema : null,
    abiMagic: typeof parsed.abiMagic === 'string' ? parsed.abiMagic : null,
    casLayout: typeof parsed.casLayout === 'string' ? parsed.casLayout : null,
    holoPmPins,
  });

  const digest = createHash('sha512')
    .update(Buffer.from(canonicalLockMeta, 'utf8'))
    .digest('hex');

  return {
    present: true,
    source,
    schema: typeof parsed.schema === 'string' ? parsed.schema : null,
    abiMagic: typeof parsed.abiMagic === 'string' ? parsed.abiMagic : null,
    casLayout: typeof parsed.casLayout === 'string' ? parsed.casLayout : null,
    holoPmPins,
    digest,
  };
}

function formatTargetTag(imageName: string, requestedTag?: string): string {
  const cleanTag = requestedTag?.trim();
  if (!cleanTag) {
    return `awesome-os/${imageName}:latest`;
  }
  if (cleanTag.includes('/') || cleanTag.includes(':')) {
    return cleanTag;
  }
  return `awesome-os/${imageName}:${cleanTag}`;
}

export function renderShellPipeCommand(
  imageName: string,
  options?: RenderPipeCommandOptions,
): string {
  const loc = resolveImageLocation(imageName);
  const repoRoot = options?.repoRoot ? resolve(options.repoRoot) : DEFAULT_REPO_ROOT;
  const repo = options?.repo?.trim() || DEFAULT_GITHUB_ORG_REPO;
  const branch = options?.branch?.trim() || DEFAULT_GITHUB_BRANCH;
  const imageDir = join(repoRoot, loc.relDir);
  const contextFiles = existsSync(imageDir) ? collectSiblingContextFiles(imageDir) : [];
  const hasBuildContext = contextFiles.length > 0;

  const casId =
    options?.casId?.trim() ||
    computeContainerCasId(loc.name, repoRoot, {
      lockfilePath: options?.lockfilePath,
      lockfileJson: options?.lockfileJson,
      repo,
      branch,
    }).casId;

  const targetTag = formatTargetTag(loc.name, options?.tag);
  const commonFlags = `--build-arg SOURCE_DATE_EPOCH=0 --label ${OCI_CAS_ID_LABEL}=${casId} -t ${targetTag}`;

  if (hasBuildContext) {
    return `docker build ${commonFlags} https://github.com/${repo}.git#${branch}:${loc.relDir}`;
  }
  return `curl -fsSL https://raw.githubusercontent.com/${repo}/${branch}/${loc.relDir}/Dockerfile | docker build ${commonFlags} -`;
}

export function computeContainerCasId(
  imageName: string,
  repoRoot: string = DEFAULT_REPO_ROOT,
  options?: ComputeCasOptions,
): ContainerCasResult {
  const resolvedRoot = resolve(repoRoot);
  const loc = resolveImageLocation(imageName);
  const imageDir = join(resolvedRoot, loc.relDir);
  const dockerfileRel = `${loc.relDir}/Dockerfile`;
  const dockerfilePath = join(imageDir, 'Dockerfile');

  if (!existsSync(dockerfilePath)) {
    throw new Error(`Missing Dockerfile for ${loc.name}: ${dockerfilePath}`);
  }

  const contextFiles = collectSiblingContextFiles(imageDir);
  const lockMeta = resolveLockfileMetadata(resolvedRoot, options);

  const hasher = createHash('sha512');
  hasher.update(`schema:${CAS_PIPE_SCHEMA}\n`);
  hasher.update(`image:${loc.name}\n`);
  hasher.update(`kind:${loc.kind}\n`);
  hasher.update(`relDir:${loc.relDir}\n`);

  const dockerfileNorm = normalizeLf(readFileSync(dockerfilePath));
  hasher.update(`file:${dockerfileRel}:${dockerfileNorm.length}\n`);
  hasher.update(dockerfileNorm);
  hasher.update('\n');

  for (const relCtx of contextFiles) {
    const ctxPath = join(imageDir, relCtx);
    const ctxNorm = normalizeLf(readFileSync(ctxPath));
    hasher.update(`context:${loc.relDir}/${relCtx}:${ctxNorm.length}\n`);
    hasher.update(ctxNorm);
    hasher.update('\n');
  }

  if (lockMeta.present && lockMeta.digest) {
    hasher.update(`lockfile:${lockMeta.digest}\n`);
  } else {
    hasher.update('lockfile:none\n');
  }

  const casId = hasher.digest('hex');
  const shortCasId = casId.slice(0, 12);
  const casTag = `awesome-os/${loc.name}:cas-${shortCasId}`;
  const latestTag = `awesome-os/${loc.name}:latest`;
  const ociLabel = `${OCI_CAS_ID_LABEL}=${casId}`;

  const pipeCommand = renderShellPipeCommand(loc.name, {
    repoRoot: resolvedRoot,
    casId,
    repo: options?.repo,
    branch: options?.branch,
  });

  return {
    schema: CAS_PIPE_SCHEMA,
    name: loc.name,
    kind: loc.kind,
    relDir: loc.relDir,
    dockerfile: dockerfileRel,
    contextFiles,
    hasBuildContext: contextFiles.length > 0,
    casId,
    shortCasId,
    casTag,
    latestTag,
    ociLabel,
    lockfilePresent: lockMeta.present,
    lockfileSource: lockMeta.source,
    lockfileDigest: lockMeta.digest,
    pipeCommand,
  };
}

export function listAllContainerCasRecords(
  repoRoot: string = DEFAULT_REPO_ROOT,
  options?: ComputeCasOptions,
): readonly ContainerCasResult[] {
  return listAllImages().map((name) => computeContainerCasId(name, repoRoot, options));
}

function runDockerPipeBuild(
  record: ContainerCasResult,
  repoRoot: string,
  tag?: string,
): void {
  const targetTag = formatTargetTag(record.name, tag);
  const baseArgs = [
    'build',
    '--build-arg',
    'SOURCE_DATE_EPOCH=0',
    '--label',
    record.ociLabel,
    '-t',
    targetTag,
    '-t',
    record.casTag,
  ];

  if (record.hasBuildContext) {
    const contextDir = join(repoRoot, record.relDir);
    execFileSync('docker', [...baseArgs, contextDir], {
      stdio: 'inherit',
      shell: false,
    });
    return;
  }

  const dockerfileContent = readFileSync(join(repoRoot, record.dockerfile));
  execFileSync('docker', [...baseArgs, '-'], {
    input: dockerfileContent,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: false,
  });
}

interface ParsedCliFlags {
  readonly image?: string;
  readonly tag?: string;
  readonly repoRoot?: string;
  readonly list: boolean;
  readonly printScript: boolean;
  readonly json: boolean;
  readonly build: boolean;
  readonly help: boolean;
}

function parseCliFlags(argv: readonly string[]): ParsedCliFlags {
  let image: string | undefined;
  let tag: string | undefined;
  let repoRoot: string | undefined;
  let list = false;
  let printScript = false;
  let json = false;
  let build = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--list') list = true;
    else if (arg === '--print-script') printScript = true;
    else if (arg === '--json') json = true;
    else if (arg === '--build') build = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else if (arg === '--image' || arg === '--tag' || arg === '--repo-root') {
      const val = argv[i + 1];
      if (!val || val.startsWith('--')) {
        throw new Error(`Missing value for flag ${arg}`);
      }
      if (arg === '--image') image = val;
      else if (arg === '--tag') tag = val;
      else repoRoot = val;
      i += 1;
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  return { image, tag, repoRoot, list, printScript, json, build, help };
}

function main(): void {
  const flags = parseCliFlags(process.argv.slice(2));
  if (flags.help || (!flags.list && !flags.image)) {
    console.log(
      [
        'Usage: node catalog/cas-pipe-build.mts [options]',
        '',
        'Options:',
        '  --list                 List deterministic 1:1 CAS mappings for all 9 base + 16 stack images',
        '  --image <name>         Inspect or build a specific base/stack image (e.g. holo-node)',
        '  --tag <tag>            Override output tag (default: awesome-os/<name>:latest)',
        '  --print-script         Print the 1-line POSIX shell pipe build command',
        '  --json                 Emit machine-readable JSON output',
        '  --build                Execute docker build locally with shell: false',
        '  --repo-root <path>     Override repository root path',
      ].join('\n'),
    );
    return;
  }

  const repoRoot = flags.repoRoot ? resolve(flags.repoRoot) : DEFAULT_REPO_ROOT;

  if (flags.list) {
    const records = listAllContainerCasRecords(repoRoot);
    if (flags.json) {
      console.log(
        JSON.stringify(
          {
            schema: CAS_PIPE_SCHEMA,
            count: records.length,
            baseCount: listBaseImages().length,
            stackCount: listStackImages().length,
            images: records,
          },
          null,
          2,
        ),
      );
      return;
    }
    for (const rec of records) {
      const mode = rec.hasBuildContext ? 'git-context' : 'stdin-pipe';
      console.log(`${rec.name.padEnd(18)} ${rec.kind.padEnd(6)} ${mode.padEnd(12)} ${rec.casTag}`);
    }
    return;
  }

  const imageName = flags.image as string;
  const record = computeContainerCasId(imageName, repoRoot);

  if (flags.build) {
    runDockerPipeBuild(record, repoRoot, flags.tag);
    return;
  }

  if (flags.json) {
    const out = flags.tag
      ? {
          ...record,
          pipeCommand: renderShellPipeCommand(record.name, {
            repoRoot,
            casId: record.casId,
            tag: flags.tag,
          }),
        }
      : record;
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(
    renderShellPipeCommand(record.name, {
      repoRoot,
      casId: record.casId,
      tag: flags.tag,
    }),
  );
}

const isMain =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}

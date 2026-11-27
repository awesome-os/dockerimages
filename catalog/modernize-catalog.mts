import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Disposition =
  | 'modernized-stack'
  | 'consolidated-into-base'
  | 'superseded-by-awesome-os'
  | 'archived-obsolete';

export interface StackDefinition {
  name: string;
  image: string;
  dockerfile: string;
  upstreamBase: string;
  platforms: string[];
  casVolume: string;
  casV11Root: string;
  description: string;
}

export interface LegacyEntryInput {
  sourceOrg: 'dockerimages' | 'sameersbn';
  name: string;
  url: string;
  stars: number;
  sourceCategory: string;
  description: string;
}

export interface ClassificationSpec {
  disposition: Disposition;
  targetImage: string;
  upstreamBase: string;
  dockerfile: string | null;
  eliminatedBoilerplate: string[];
  rationale: string;
}

export interface ModernizedLegacyEntry extends LegacyEntryInput, ClassificationSpec {
  id: string;
}

export interface StackSummaryItem extends StackDefinition {
  legacySourcesCount: number;
  legacySources: string[];
}

export interface ModernizedStacksManifest {
  schema: 'awesome-os.modernized-stacks.v1';
  abiMagic: '0x33564742';
  casProtocol: 'holo-v11';
  sourceCatalogSchema: string;
  sourceCatalogGeneratedAt: string;
  summary: {
    totalLegacyEntries: number;
    dockerimagesOrgRepos: number;
    sameersbnSuccessors: number;
    modernizedStackImages: number;
    byDisposition: Record<Disposition, number>;
    bySourceOrg: Record<'dockerimages' | 'sameersbn', number>;
    byTargetImage: Record<string, number>;
  };
  stacks: StackSummaryItem[];
  entries: ModernizedLegacyEntry[];
}

interface RawOciCatalog {
  schema: string;
  generatedAt: string;
  dockerimagesOrg: {
    totalRepos: number;
    tiers: Record<
      string,
      Array<{
        name: string;
        url: string;
        stars?: number;
        description?: string;
        tier: string;
      }>
    >;
  };
  sameersbnSuccessors: {
    mappedCount: number;
    mappings: Array<{
      name: string;
      url: string;
      stars: number;
      description?: string;
      domain: string;
    }>;
  };
}

const PLATFORMS: string[] = ['linux/amd64', 'linux/arm64'];
const CAS_VOLUME = '/var/lib/b8g/cas';
const CAS_V11_ROOT = '/var/lib/b8g/cas/v11';

export const MODERNIZED_STACKS: StackDefinition[] = [
  {
    name: 'holo-nginx',
    image: 'ghcr.io/awesome-os/holo-nginx:latest',
    dockerfile: 'stacks/holo-nginx/Dockerfile',
    upstreamBase: 'nginx:alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Nginx Alpine reverse proxy & HTTP server with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-haproxy',
    image: 'ghcr.io/awesome-os/holo-haproxy:latest',
    dockerfile: 'stacks/holo-haproxy/Dockerfile',
    upstreamBase: 'haproxy:lts-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim HAProxy LTS Alpine TCP/HTTP load balancer with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-varnish',
    image: 'ghcr.io/awesome-os/holo-varnish:latest',
    dockerfile: 'stacks/holo-varnish/Dockerfile',
    upstreamBase: 'varnish:alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Varnish Cache Alpine HTTP accelerator with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-httpd',
    image: 'ghcr.io/awesome-os/holo-httpd:latest',
    dockerfile: 'stacks/holo-httpd/Dockerfile',
    upstreamBase: 'httpd:2.4-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Apache HTTPd 2.4 Alpine server with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-postgres',
    image: 'ghcr.io/awesome-os/holo-postgres:latest',
    dockerfile: 'stacks/holo-postgres/Dockerfile',
    upstreamBase: 'postgres:17-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim PostgreSQL 17 Alpine database server with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-mariadb',
    image: 'ghcr.io/awesome-os/holo-mariadb:latest',
    dockerfile: 'stacks/holo-mariadb/Dockerfile',
    upstreamBase: 'mariadb:11',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'MariaDB 11 server with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-valkey',
    image: 'ghcr.io/awesome-os/holo-valkey:latest',
    dockerfile: 'stacks/holo-valkey/Dockerfile',
    upstreamBase: 'valkey/valkey:8-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Valkey 8 Alpine in-memory data store with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-mongodb',
    image: 'ghcr.io/awesome-os/holo-mongodb:latest',
    dockerfile: 'stacks/holo-mongodb/Dockerfile',
    upstreamBase: 'mongo:8',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'MongoDB 8 document database with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-solr',
    image: 'ghcr.io/awesome-os/holo-solr:latest',
    dockerfile: 'stacks/holo-solr/Dockerfile',
    upstreamBase: 'solr:9-slim',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Apache Solr 9 slim search engine with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-go',
    image: 'ghcr.io/awesome-os/holo-go:latest',
    dockerfile: 'stacks/holo-go/Dockerfile',
    upstreamBase: 'golang:alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Go Alpine toolchain with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-deno',
    image: 'ghcr.io/awesome-os/holo-deno:latest',
    dockerfile: 'stacks/holo-deno/Dockerfile',
    upstreamBase: 'denoland/deno:alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Deno Alpine runtime with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-git',
    image: 'ghcr.io/awesome-os/holo-git:latest',
    dockerfile: 'stacks/holo-git/Dockerfile',
    upstreamBase: 'alpine/git:latest',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Git Alpine client with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-wordpress',
    image: 'ghcr.io/awesome-os/holo-wordpress:latest',
    dockerfile: 'stacks/holo-wordpress/Dockerfile',
    upstreamBase: 'wordpress:php8.4-fpm-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim WordPress PHP 8.4 FPM Alpine stack with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-ghost',
    image: 'ghcr.io/awesome-os/holo-ghost:latest',
    dockerfile: 'stacks/holo-ghost/Dockerfile',
    upstreamBase: 'ghost:5-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Ghost 5 Alpine publishing stack with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-redmine',
    image: 'ghcr.io/awesome-os/holo-redmine:latest',
    dockerfile: 'stacks/holo-redmine/Dockerfile',
    upstreamBase: 'redmine:6-alpine',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Redmine 6 Alpine issue tracker with /bin/holo-pm CAS runtime',
  },
  {
    name: 'holo-squid',
    image: 'ghcr.io/awesome-os/holo-squid:latest',
    dockerfile: 'stacks/holo-squid/Dockerfile',
    upstreamBase: 'alpine:3.21',
    platforms: PLATFORMS,
    casVolume: CAS_VOLUME,
    casV11Root: CAS_V11_ROOT,
    description: 'Slim Squid HTTP caching proxy on Alpine 3.21 with /bin/holo-pm CAS runtime',
  },
];

const STACK_BY_NAME = new Map<string, StackDefinition>(
  MODERNIZED_STACKS.map((s) => [s.name, s]),
);

interface BaseTarget {
  image: string;
  upstreamBase: string;
  dockerfile: string;
}

const BASE_TARGETS: Record<string, BaseTarget> = {
  t2linux: {
    image: 'ghcr.io/awesome-os/t2linux:latest',
    upstreamBase: 'FROM scratch',
    dockerfile: 't2linux/Dockerfile',
  },
  'holo-node': {
    image: 'ghcr.io/awesome-os/holo-node:latest',
    upstreamBase: 'FROM scratch',
    dockerfile: 'holo-node/Dockerfile',
  },
  'holo-py': {
    image: 'ghcr.io/awesome-os/holo-py:latest',
    upstreamBase: 'python:3.15-alpine',
    dockerfile: 'holo-py/Dockerfile',
  },
  'holo-cpp': {
    image: 'ghcr.io/awesome-os/holo-cpp:latest',
    upstreamBase: 'alpine:3.24',
    dockerfile: 'holo-cpp/Dockerfile',
  },
  'holo-jvm': {
    image: 'ghcr.io/awesome-os/holo-jvm:latest',
    upstreamBase: 'eclipse-temurin:25-jre-alpine',
    dockerfile: 'holo-jvm/Dockerfile',
  },
  'holo-php': {
    image: 'ghcr.io/awesome-os/holo-php:latest',
    upstreamBase: 'php:8.6-cli-alpine',
    dockerfile: 'holo-php/Dockerfile',
  },
  'holo-ruby': {
    image: 'ghcr.io/awesome-os/holo-ruby:latest',
    upstreamBase: 'ruby:4.0-alpine',
    dockerfile: 'holo-ruby/Dockerfile',
  },
  'holo-e2e-runner': {
    image: 'ghcr.io/awesome-os/holo-e2e-runner:latest',
    upstreamBase: 'node:current-alpine',
    dockerfile: 'holo-e2e-runner/Dockerfile',
  },
  'holo-e2e-lite': {
    image: 'ghcr.io/awesome-os/holo-e2e-lite:latest',
    upstreamBase: 'node:current-alpine',
    dockerfile: 'holo-e2e-lite/Dockerfile',
  },
};

function stackSpec(
  stackName: string,
  eliminatedBoilerplate: string[],
  rationale: string,
): ClassificationSpec {
  const stack = STACK_BY_NAME.get(stackName);
  if (!stack) {
    throw new Error(`Unknown stack target: ${stackName}`);
  }
  return {
    disposition: 'modernized-stack',
    targetImage: stack.image,
    upstreamBase: stack.upstreamBase,
    dockerfile: stack.dockerfile,
    eliminatedBoilerplate,
    rationale,
  };
}

function baseSpec(
  baseName: keyof typeof BASE_TARGETS,
  disposition: Exclude<Disposition, 'modernized-stack'>,
  eliminatedBoilerplate: string[],
  rationale: string,
): ClassificationSpec {
  const base = BASE_TARGETS[baseName];
  if (!base) {
    throw new Error(`Unknown base target: ${String(baseName)}`);
  }
  return {
    disposition,
    targetImage: base.image,
    upstreamBase: base.upstreamBase,
    dockerfile: base.dockerfile,
    eliminatedBoilerplate,
    rationale,
  };
}

interface ClassificationRule {
  match: (id: string, name: string) => boolean;
  build: (entry: LegacyEntryInput) => ClassificationSpec;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // --- Modernized into the 16 fresh multi-arch stacks ---
  {
    match: (_id, n) => /^(?:docker-)?nginx(?:-docker-router)?$|^docker-pagespeed$/i.test(n),
    build: () =>
      stackSpec(
        'holo-nginx',
        ['ubuntu-14.04', 'supervisord', 'legacy-source-nginx-build'],
        'Replaced legacy Nginx / PageSpeed / RTMP wrappers with official multi-arch nginx:alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /haproxy/i.test(n),
    build: () =>
      stackSpec(
        'holo-haproxy',
        ['ubuntu-14.04', 'supervisord', 'serf-marathon-geard-glue'],
        'Replaced legacy HAProxy + Serf/Marathon/Geard wrappers with official haproxy:lts-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^docker-varnish$/i.test(n),
    build: () =>
      stackSpec(
        'holo-varnish',
        ['ubuntu-14.04', 'legacy-varnish-wrapper'],
        'Replaced legacy Varnish container with official multi-arch varnish:alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^docker-apache2$/i.test(n),
    build: () =>
      stackSpec(
        'holo-httpd',
        ['ubuntu-14.04', 'supervisord', 'apache2-boilerplate'],
        'Replaced legacy Apache2 container with official httpd:2.4-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^docker-postgresql$/i.test(n),
    build: () =>
      stackSpec(
        'holo-postgres',
        ['ubuntu-baseimage', 'runit', 'manual-pg-entrypoint'],
        'Replaced legacy sameersbn PostgreSQL container with official postgres:17-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-)?mysql$|^(?:mariadb|docker)-galera$/i.test(n),
    build: () =>
      stackSpec(
        'holo-mariadb',
        ['ubuntu-14.04', 'supervisord', 'legacy-mysql-5.7-galera-scripts'],
        'Replaced legacy MySQL 5.7 / Galera images with official multi-arch mariadb:11 + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-cache|docker-redis|docker-memcached)$/i.test(n),
    build: () =>
      stackSpec(
        'holo-valkey',
        ['ubuntu-14.04', 'supervisord', 'legacy-redis-memcached-init'],
        'Replaced legacy Redis / Memcached cache containers with valkey/valkey:8-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-)?mongodb(?:-local)?$/i.test(n),
    build: () =>
      stackSpec(
        'holo-mongodb',
        ['ubuntu-14.04', 'legacy-link-scripts', 'supervisord'],
        'Replaced legacy MongoDB linked containers with official multi-arch mongo:8 + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-)?solr(?:-systemd)?$/i.test(n),
    build: () =>
      stackSpec(
        'holo-solr',
        ['ubuntu-14.04', 'systemd-in-container', 'manual-jvm-tarball'],
        'Replaced legacy Ubuntu 14.04 + systemd Solr containers with non-root official solr:9-slim + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:golang-compiler|cbfs|cbfs-fused|cbfsd-go)$/i.test(n),
    build: () =>
      stackSpec(
        'holo-go',
        ['ubuntu-14.04', 'legacy-gopath-setup'],
        'Modernized legacy Go compiler & Go storage daemons onto official golang:alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-deno|deno-lambda)$/i.test(n),
    build: () =>
      stackSpec(
        'holo-deno',
        ['custom-deno-tarball-fetch', 'lambda-wrapper-boilerplate'],
        'Consolidated legacy Deno containers onto official denoland/deno:alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:git|harp-git)$/i.test(n),
    build: () =>
      stackSpec(
        'holo-git',
        ['legacy-alpine-git-bootstrap', 'supervisord'],
        'Modernized legacy Git helper containers onto official alpine/git:latest + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^docker-wordpress$/i.test(n),
    build: () =>
      stackSpec(
        'holo-wordpress',
        ['ubuntu-14.04', 'supervisord', 'bundled-mysql-in-single-container'],
        'Replaced bundled Ubuntu/supervisord WordPress image with wordpress:php8.4-fpm-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^ghost$/i.test(n),
    build: () =>
      stackSpec(
        'holo-ghost',
        ['ubuntu-14.04', 'legacy-nodejs-0.10-setup'],
        'Replaced legacy Ghost container fork with official ghost:5-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-)?redmine$/i.test(n),
    build: () =>
      stackSpec(
        'holo-redmine',
        ['ubuntu-baseimage', 'supervisord', 'runit', 'legacy-ruby-bundler-scripts'],
        'Replaced legacy Redmine container with official redmine:6-alpine + holo-pm.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-squid|direktspeed-gateway)$/i.test(n),
    build: () =>
      stackSpec(
        'holo-squid',
        ['ubuntu-14.04', 'supervisord', 'multi-daemon-gateway-init'],
        'Replaced legacy Squid & multi-daemon gateway with minimal alpine:3.21 Squid + holo-pm.',
      ),
  },

  // --- Superseded by Awesome-OS Sovereign Platform ---
  {
    match: (_id, n) => /gitlab/i.test(n),
    build: () =>
      baseSpec(
        't2linux',
        'superseded-by-awesome-os',
        ['ubuntu-baseimage', 'runit', 'supervisord', 'monolithic-omnibus-init'],
        'Superseded by Awesome-OS sovereign GitLab stack (awesome-os/gitlab-foss, gitlab-runner, gitlab-shell) on t2linux.',
      ),
  },
  {
    match: (_id, n) => /^(?:apt_cache|apt-cacher|ubuntu-apt-cache|docker-apt-cacher-ng)$/i.test(n),
    build: () =>
      baseSpec(
        't2linux',
        'superseded-by-awesome-os',
        ['ubuntu-14.04', 'upstart', 'apt-cacher-ng-daemon'],
        'Superseded by Holo v11 content-addressable store (/var/lib/b8g/cas/v11) on t2linux.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-browser-box|docker-desktop|vscode-ubuntu)$/i.test(n),
    build: () =>
      baseSpec(
        'holo-e2e-runner',
        'superseded-by-awesome-os',
        ['x11-pulseaudio-vnc-boilerplate', 'ubuntu-desktop-bloat'],
        'Superseded by Sectium Layer-1 Display Appliance, headless Lavapipe Vulkan holo-e2e-runner, and awesome-os/devtools.',
      ),
  },
  {
    match: (_id, n) => /^dockerLLM$/i.test(n),
    build: () =>
      baseSpec(
        'holo-cpp',
        'superseded-by-awesome-os',
        ['ad-hoc-cuda-python-dockerfiles'],
        'Superseded by Awesome-OS Sovereign AI & GPU stack (awesome-os/colibri, llama.cpp, vllm) on holo-cpp.',
      ),
  },
  {
    match: (_id, n) => /^v8-build$/i.test(n),
    build: () =>
      baseSpec(
        'holo-cpp',
        'superseded-by-awesome-os',
        ['ubuntu-v8-depot-tools-boilerplate'],
        'Superseded by Awesome-OS unified shared libv8_monolith (dup_v8=0 B) in awesome-os/chromium-baseline.',
      ),
  },
  {
    match: (_id, n) => /^(?:Docker-OSX|ovmf)$/i.test(n),
    build: () =>
      baseSpec(
        't2linux',
        'superseded-by-awesome-os',
        ['qemu-x11-kvm-wrapper-scripts'],
        'Superseded by awesome-os/maclab, siliconforest, and firecracker microVM substrate on t2linux.',
      ),
  },
  {
    match: (_id, n) => /^(?:google-drive-ocamlfuse|docker-nextcloud)$/i.test(n),
    build: () =>
      baseSpec(
        't2linux',
        'superseded-by-awesome-os',
        ['ubuntu-14.04', 'fuse-supervisord-boilerplate'],
        'Superseded by Holo v11 CAS sovereign object storage on t2linux.',
      ),
  },
  {
    match: (_id, n) => /^cloud9$/i.test(n),
    build: () =>
      baseSpec(
        'holo-node',
        'superseded-by-awesome-os',
        ['ubuntu-14.04', 'legacy-cloud9-ide-init'],
        'Superseded by awesome-os/devtools (SectiumDevToolsPlane, code-oss, b8g-ide) on holo-node.',
      ),
  },
  {
    match: (_id, n) => /^(?:dockerimages|dockerimages\.github\.io|official-images)$/i.test(n),
    build: () =>
      baseSpec(
        't2linux',
        'superseded-by-awesome-os',
        ['legacy-2014-build-scripts'],
        'Superseded by awesome-os/dockerimages catalog, Holo-CI v1, and awesome-os/deployment.',
      ),
  },

  // --- Consolidated into the 9 existing Awesome-OS Base & Runner Images ---
  {
    match: (_id, n) =>
      /^(?:scratch|ubuntu-base|ubuntu-vm|ubuntu-runit|ubuntu-upstart|ubuntu-supervisor|ubuntu-baseimage-supervisord|ubuntu-installer|docker-systemd|fedora-s6|docker-build-s6|centos-core|rasbian|docker-ubuntu|docker-tools|nsenter|docker-enter|dind|docker|docker-builder|custom-build)$/i.test(
        n,
      ),
    build: () =>
      baseSpec(
        't2linux',
        'consolidated-into-base',
        ['ubuntu-14.04', 'supervisord', 'runit', 's6', 'upstart', 'systemd-in-container'],
        'Consolidated legacy OS rootfs / init-system / container-tooling image into FROM scratch ghcr.io/awesome-os/t2linux:latest.',
      ),
  },
  {
    match: (_id, n) =>
      /^(?:node|docker-nodejs|docker-nave|docker-pm2|docker-nodejs-gdrive-sync|docker-harp)$/i.test(
        n,
      ),
    build: () =>
      baseSpec(
        'holo-node',
        'consolidated-into-base',
        ['ubuntu-14.04', 'nvm-nave-pm2-process-manager', 'debian-bloat'],
        'Consolidated legacy Node.js / process-manager image into FROM scratch ghcr.io/awesome-os/holo-node:latest (Node v27).',
      ),
  },
  {
    match: (_id, n) => /^(?:python|python-ws-to-tuntap-proxy)$/i.test(n),
    build: () =>
      baseSpec(
        'holo-py',
        'consolidated-into-base',
        ['ubuntu-14.04', 'legacy-pip-virtualenv-boilerplate'],
        'Consolidated legacy Python image into ghcr.io/awesome-os/holo-py:latest (python:3.15-alpine).',
      ),
  },
  {
    match: (_id, n) => /^ubuntu-core-build$/i.test(n),
    build: () =>
      baseSpec(
        'holo-cpp',
        'consolidated-into-base',
        ['ubuntu-14.04', 'apt-build-essential-bloat'],
        'Consolidated legacy C/C++ build base into ghcr.io/awesome-os/holo-cpp:latest (alpine:3.24 + musl-dev).',
      ),
  },
  {
    match: (_id, n) => /^(?:java|docker-java-oracle|docker-elasticsearch|elk)$/i.test(n),
    build: () =>
      baseSpec(
        'holo-jvm',
        'consolidated-into-base',
        ['ubuntu-14.04', 'oracle-jdk-7-tarball', 'supervisord'],
        'Consolidated legacy JVM / Java / Elastic stack onto ghcr.io/awesome-os/holo-jvm:latest (eclipse-temurin:25-jre-alpine).',
      ),
  },
  {
    match: (_id, n) =>
      /^(?:php|docker-php-fpm|docker-ispconfig-php|lampp|docker-xampp|ubuntu-httpd-php-mysql|typo3|magento-stack)$/i.test(
        n,
      ),
    build: () =>
      baseSpec(
        'holo-php',
        'consolidated-into-base',
        ['ubuntu-14.04', 'supervisord', 'php5-all-in-one-lamp-boilerplate'],
        'Consolidated legacy PHP / LAMP / CMS runtime onto ghcr.io/awesome-os/holo-php:latest (php:8.6-cli-alpine).',
      ),
  },
  {
    match: (_id, n) => /^openproject$/i.test(n),
    build: () =>
      baseSpec(
        'holo-ruby',
        'consolidated-into-base',
        ['ubuntu-14.04', 'supervisord', 'legacy-rvm-bundler'],
        'Consolidated legacy Ruby/Rails OpenProject image onto ghcr.io/awesome-os/holo-ruby:latest (ruby:4.0-alpine).',
      ),
  },

  // --- Archived Obsolete (2014-2018 single-purpose / retired stacks) ---
  {
    match: (_id, n) => /^(?:docker-strider|donejs|docker-donejs|docker-dsjs|koalab|node_multilogin)$/i.test(n),
    build: () =>
      baseSpec(
        'holo-node',
        'archived-obsolete',
        ['ubuntu-14.04', 'supervisord', 'retired-2014-js-framework'],
        'Archived obsolete 2014-2017 Node.js app/CI stack; runtime pointer set to FROM scratch holo-node.',
      ),
  },
  {
    match: (_id, n) => /^(?:docker-zk-exhibitor|docker-jenkins-mesos)$/i.test(n),
    build: () =>
      baseSpec(
        'holo-jvm',
        'archived-obsolete',
        ['ubuntu-14.04', 'mesos-exhibitor-init'],
        'Archived obsolete Mesos/ZooKeeper JVM stack; runtime pointer set to holo-jvm.',
      ),
  },
  {
    match: (_id, n) => /^pod-odoo$/i.test(n),
    build: () =>
      baseSpec(
        'holo-py',
        'archived-obsolete',
        ['legacy-pod-odoo-wrapper'],
        'Archived obsolete Python Odoo pod wrapper; runtime pointer set to holo-py.',
      ),
  },
  {
    match: (_id, n) =>
      /^(?:docker-unrealircd|docker-webmin|docker-virtualmin|couchbase-sandbox|couchbase|docker-couchbase|docker-couchbase-server|docker-asterisk|dockersh|docker-cockpit|docker-nagios|docker-nagios-plugins|docker-icinga2|docker-omd|docker-graphite-statsd|docker-syslog|docker-ubuntu-syslog-to-cb-logger|docker-logman|email-services|nsd-dnssec|docker-bind|docker-openfire|controller|mesos-single|mesosphere-docker|docker-mesos|docker-mesos-slave|docker-marathon|marathon-logger|mmonit|thebrain_8_linux|direktspeed-docker-toolbox|docker-oracle-xe-11g|docker-patched|docktorrent|dspeed_eu_accounts|func|geard|ircanywhere|lynx|mosaico|testpage|vagrant-aws)$/i.test(
        n,
      ),
    build: () =>
      baseSpec(
        't2linux',
        'archived-obsolete',
        ['ubuntu-14.04', 'supervisord', 'systemd-in-container', 'upstart'],
        'Archived obsolete 2014-2019 single-purpose container with zero boilerplate; pointer set to FROM scratch t2linux.',
      ),
  },
];

export function classifyLegacyEntry(entry: LegacyEntryInput): ModernizedLegacyEntry {
  const id = `${entry.sourceOrg}/${entry.name}`;
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.match(id, entry.name)) {
      return {
        id,
        ...entry,
        ...rule.build(entry),
      };
    }
  }
  throw new Error(`Unclassified legacy OCI entry: ${id}`);
}

export function buildModernizedStacks(catalogPath: string): ModernizedStacksManifest {
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(raw) as RawOciCatalog;

  const legacyInputs: LegacyEntryInput[] = [];
  const seenIds = new Set<string>();

  for (const [tierKey, repos] of Object.entries(catalog.dockerimagesOrg.tiers)) {
    for (const repo of repos) {
      const id = `dockerimages/${repo.name}`;
      if (seenIds.has(id)) {
        throw new Error(`Duplicate dockerimages entry: ${id}`);
      }
      seenIds.add(id);
      legacyInputs.push({
        sourceOrg: 'dockerimages',
        name: repo.name,
        url: repo.url,
        stars: repo.stars ?? 0,
        sourceCategory: tierKey,
        description: repo.description ?? '',
      });
    }
  }

  for (const mapping of catalog.sameersbnSuccessors.mappings) {
    const id = `sameersbn/${mapping.name}`;
    if (seenIds.has(id)) {
      throw new Error(`Duplicate sameersbn entry: ${id}`);
    }
    seenIds.add(id);
    legacyInputs.push({
      sourceOrg: 'sameersbn',
      name: mapping.name,
      url: mapping.url,
      stars: mapping.stars,
      sourceCategory: mapping.domain,
      description: mapping.description ?? '',
    });
  }

  const entries = legacyInputs
    .map((input) => classifyLegacyEntry(input))
    .sort((a, b) => a.id.localeCompare(b.id));

  const byDisposition: Record<Disposition, number> = {
    'modernized-stack': 0,
    'consolidated-into-base': 0,
    'superseded-by-awesome-os': 0,
    'archived-obsolete': 0,
  };
  const bySourceOrg: Record<'dockerimages' | 'sameersbn', number> = {
    dockerimages: 0,
    sameersbn: 0,
  };
  const byTargetImage: Record<string, number> = {};
  const stackSources = new Map<string, string[]>();

  for (const stack of MODERNIZED_STACKS) {
    stackSources.set(stack.image, []);
  }

  for (const entry of entries) {
    byDisposition[entry.disposition]++;
    bySourceOrg[entry.sourceOrg]++;
    byTargetImage[entry.targetImage] = (byTargetImage[entry.targetImage] ?? 0) + 1;
    const sources = stackSources.get(entry.targetImage);
    if (sources) {
      sources.push(entry.id);
    }
  }

  const stacks: StackSummaryItem[] = MODERNIZED_STACKS.map((stack) => {
    const legacySources = stackSources.get(stack.image) ?? [];
    return {
      ...stack,
      legacySourcesCount: legacySources.length,
      legacySources,
    };
  });

  const sortedTargetImages: Record<string, number> = {};
  for (const key of Object.keys(byTargetImage).sort((a, b) => a.localeCompare(b))) {
    sortedTargetImages[key] = byTargetImage[key];
  }

  return {
    schema: 'awesome-os.modernized-stacks.v1',
    abiMagic: '0x33564742',
    casProtocol: 'holo-v11',
    sourceCatalogSchema: catalog.schema,
    sourceCatalogGeneratedAt: catalog.generatedAt,
    summary: {
      totalLegacyEntries: entries.length,
      dockerimagesOrgRepos: bySourceOrg.dockerimages,
      sameersbnSuccessors: bySourceOrg.sameersbn,
      modernizedStackImages: stacks.length,
      byDisposition,
      bySourceOrg,
      byTargetImage: sortedTargetImages,
    },
    stacks,
    entries,
  };
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const catalogPath = path.join(__dirname, 'oci-catalog.json');
  const outPath = path.join(__dirname, 'modernized-stacks.json');
  const manifest = buildModernizedStacks(catalogPath);
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `[modernize-catalog] Wrote ${outPath} (${manifest.summary.totalLegacyEntries} entries -> ${manifest.summary.modernizedStackImages} stacks)\n`,
  );
}

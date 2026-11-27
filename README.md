# Awesome-OS Docker Images (Zero-Auth CAS Pipe & `v11-oci-latest`)

Ultra-slim `FROM scratch` and Holo v11 (`holo-pm`) OCI container images distributed through two **zero-auth public channels** with shared Content-Addressable Store (CAS) volume support, alongside the unified [`CATALOG.md`](CATALOG.md) & [`catalog/oci-catalog.json`](catalog/oci-catalog.json) inventory covering `awesome-os`, sister org [`github.com/dockerimages`](https://github.com/dockerimages) (`138` repos), and [`sameersbn`](https://github.com/sameersbn) successor mappings.

> **Why GHCR public pulls are retired:** GitHub's Free Org Container Registry offers no API for public visibility flip and blocks/hides per-package visibility changes under organization inheritance UI rules. Every Awesome-OS image is therefore built deterministically `1:1` from its CAS lockfile + `Dockerfile` via shell pipe or consumed directly from anonymous public `v11-oci-latest` release bundles. `ghcr.io/awesome-os/*` serves strictly as an **internal CI mirror cache**.

---

## Two Zero-Auth Public Distribution Channels

### 1. 1:1 CAS-to-Container Shell Pipe Build (Zero Auth, Any Base or Stack Image in Seconds)

Every one of the **9 base images** and **16 modernized stack images** maps `1:1` from its pinned [`awesome-os/holo-v11`](https://github.com/awesome-os/holo-v11/blob/main/index/holo-compiler-lockfile.json) metadata, `Dockerfile`, and sibling context files to a deterministic SHA-512 identity (`awesome-os/<name>:cas-<sha512[:12]>` + OCI label `org.awesome-os.cas-id=<sha512>`).

Because the GHCR visibility toggle is skipped intentionally, build any zero-context base or stack image directly in seconds via a single `curl | docker build -` shell pipe:

```sh
# Base image (FROM scratch + Node.js v27 + awesome-os/coreutils + holo-pm)
curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/holo-node/Dockerfile | docker build --build-arg SOURCE_DATE_EPOCH=0 -t awesome-os/holo-node:latest -

# Any modernized stack image (e.g. holo-nginx)
curl -fsSL https://raw.githubusercontent.com/awesome-os/dockerimages/main/stacks/holo-nginx/Dockerfile | docker build --build-arg SOURCE_DATE_EPOCH=0 -t awesome-os/holo-nginx:latest -
```

Context-bearing images (`holo-e2e-runner` and `holo-e2e-lite`, which bundle `holo-e2e-probe.mjs`) build cleanly in one command over public Git context:

```sh
docker build --build-arg SOURCE_DATE_EPOCH=0 -t awesome-os/holo-e2e-lite:latest https://github.com/awesome-os/dockerimages.git#main:holo-e2e-lite
```

Or resolve deterministic 1:1 CAS IDs, inspect all 25 images, or build locally with [`catalog/cas-pipe-build.mts`](catalog/cas-pipe-build.mts) (verified by [`catalog/cas-pipe-build.test.mts`](catalog/cas-pipe-build.test.mts)):

```sh
# List deterministic 1:1 CAS-to-container mappings for all 9 base + 16 stack images
node catalog/cas-pipe-build.mts --list --json

# Print or execute the deterministic pipe build for any image
node catalog/cas-pipe-build.mts --image holo-node --print-script
node catalog/cas-pipe-build.mts --image holo-node --build
```

### 2. Prebuilt Anonymous `.oci.tar.gz` Bundles (`v11-oci-latest`)

For zero-build clean-box consumption, [`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) exports and uploads SHA-512 verified `<name>-linux-amd64.oci.tar.gz` + `SHA512SUMS-<name>.txt` bundles for **all 9 base images** (`t2linux`, `holo-node`, `holo-py`, `holo-cpp`, `holo-jvm`, `holo-php`, `holo-ruby`, `holo-e2e-runner`, `holo-e2e-lite`) to anonymous public GitHub Release [`v11-oci-latest`](https://github.com/awesome-os/dockerimages/releases/tag/v11-oci-latest).

Stream directly into `docker load` without a GitHub token:

```sh
curl -fsSL https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/holo-node-linux-amd64.oci.tar.gz | gunzip | docker load
```

Or download and verify SHA-512 checksums explicitly before loading:

```sh
curl -fsSLO https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/holo-e2e-lite-linux-amd64.oci.tar.gz
curl -fsSLO https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/SHA512SUMS-holo-e2e-lite.txt
sha512sum -c SHA512SUMS-holo-e2e-lite.txt
docker load -i holo-e2e-lite-linux-amd64.oci.tar.gz
```

Verify anonymous HTTP 200 reachability across all 9 release checksums:

```sh
node catalog/oci-smoke.mts --mode verify-anonymous-release --tag v11-oci-latest
```

> **Note on `ghcr.io/awesome-os/*`:** CI workflows still push multi-arch layers to `ghcr.io/awesome-os/*` strictly as an **internal CI mirror cache**; end users and downstream workflows should never depend on GHCR public pull visibility.

---

## Base Images (`9`)

| Image | Base | Dockerfile | Highlights |
| :--- | :--- | :--- | :--- |
| `awesome-os/t2linux:latest` | `FROM scratch` | [`t2linux/Dockerfile`](t2linux/Dockerfile) | 100% sovereign zero-Alpine runtime with real [`awesome-os/coreutils`](https://github.com/awesome-os/coreutils), static `busybox` `sh`, CA certificates, `/etc/t2linux-release`, `/bin/holo-pm` |
| `awesome-os/holo-node:latest` | `FROM scratch` | [`holo-node/Dockerfile`](holo-node/Dockerfile) | 100% sovereign zero-Alpine runtime with Node.js `v27.0.0-alpha.0.2.0` (`linux/amd64` musl + `linux/arm64` glibc), `awesome-os/coreutils`, `/usr/local/bin/holo-node-launcher` (`awesome-os/node@v0.4.0`), and `/bin/holo-pm` |
| `awesome-os/holo-py:latest` | `python:3.15-alpine` | [`holo-py/Dockerfile`](holo-py/Dockerfile) | Python 3.15 + `/bin/holo-pm` |
| `awesome-os/holo-cpp:latest` | `alpine:3.24` | [`holo-cpp/Dockerfile`](holo-cpp/Dockerfile) | Alpine 3.24 + `musl-dev` + `/bin/holo-pm` + `/usr/local/include/libholo_pm.h` & `/usr/local/lib/libholo-pm.so` |
| `awesome-os/holo-jvm:latest` | `eclipse-temurin:25-jre-alpine` | [`holo-jvm/Dockerfile`](holo-jvm/Dockerfile) | Temurin 25 JRE + `/bin/holo-pm` |
| `awesome-os/holo-php:latest` | `php:8.6-cli-alpine` | [`holo-php/Dockerfile`](holo-php/Dockerfile) | PHP 8.6 CLI + Composer 2 + `/bin/holo-pm` |
| `awesome-os/holo-ruby:latest` | `ruby:4.0-alpine` | [`holo-ruby/Dockerfile`](holo-ruby/Dockerfile) | Ruby 4.0 + Bundler + `/bin/holo-pm` |
| `awesome-os/holo-e2e-runner:latest` | `node:current-alpine` | [`holo-e2e-runner/Dockerfile`](holo-e2e-runner/Dockerfile) | Zero-X11 Node current + `gcc` + `g++` + `musl-dev` + Mesa Lavapipe Vulkan ICD + `/bin/holo-pm` + `holo-e2e-probe` (+ public `v11-oci-latest` tarball) |
| `awesome-os/holo-e2e-lite:latest` | `node:current-alpine` | [`holo-e2e-lite/Dockerfile`](holo-e2e-lite/Dockerfile) | Lightweight headless Node current + `ca-certificates` + `curl` + `jq` + `bash` + `git` + `/bin/holo-pm` + `holo-e2e-probe` (`HOLO_E2E_LITE=1`, zero `gcc`/`g++`/Mesa Vulkan; + public `v11-oci-latest` tarball) |

All images verify `/bin/holo-pm` (and `libholo-pm.so` / `libholo_pm.h`) bit-for-bit via SHA-512 against [`awesome-os/holo-v11`](https://github.com/awesome-os/holo-v11/blob/main/index/holo-compiler-lockfile.json) during build.

---

## Unified OCI Catalog (`awesome-os` + `dockerimages` + `sameersbn` Successors)

- **[`CATALOG.md`](CATALOG.md)** — Human-readable catalog of all `awesome-os` OCI/Compose definitions (`32` repos, `127` files), the read-only 4-tier classification of all `138` repositories in sister org [`github.com/dockerimages`](https://github.com/dockerimages), and successor mappings for `sameersbn/*` stacks (`docker-gitlab`, `docker-redmine`, `docker-postgresql`, `docker-bind`, `docker-squid`, `docker-browser-box`, etc.).
- **[`catalog/oci-catalog.json`](catalog/oci-catalog.json)** — Machine-readable catalog (`schema: "awesome-os.oci-catalog.v1"`, `abiMagic: "0x33564742"`), verified by [`catalog/oci-catalog.test.mts`](catalog/oci-catalog.test.mts) and `holo-ci@v1`.
- **[`catalog/modernized-stacks.json`](catalog/modernized-stacks.json)** — Deterministic modernization manifest (`schema: "awesome-os.modernized-stacks.v1"`, generated by [`catalog/modernize-catalog.mts`](catalog/modernize-catalog.mts) and verified by [`catalog/modernize-catalog.test.mts`](catalog/modernize-catalog.test.mts)) classifying all `138` `dockerimages/*` + `19` `sameersbn/*` (`157` legacy entries) across `modernized-stack` (`40`), `consolidated-into-base` (`43`), `superseded-by-awesome-os` (`22`), and `archived-obsolete` (`52`), eliminating all `supervisord`/`runit`/`s6`/`upstart`/Ubuntu 14.04 boilerplate.

---

## Modernized Multi-Arch Stack Images (`stacks/holo-*`)

Built deterministically via 1:1 CAS shell pipe (`curl -fsSL ... | docker build -`) or `node catalog/cas-pipe-build.mts --image <stack> --build` (with `ghcr.io/awesome-os/<stack>:latest` as internal CI mirror cache via [`.github/workflows/publish-stacks-ghcr.yml`](.github/workflows/publish-stacks-ghcr.yml)), each bundling SHA-512 verified `/bin/holo-pm` and `/var/lib/b8g/cas/v11`:

| Stack Image | Upstream Base | Dockerfile | Highlights |
| :--- | :--- | :--- | :--- |
| `awesome-os/holo-nginx:latest` | `nginx:alpine` | [`stacks/holo-nginx/Dockerfile`](stacks/holo-nginx/Dockerfile) | Slim Nginx reverse proxy & HTTP server + `/bin/holo-pm` |
| `awesome-os/holo-haproxy:latest` | `haproxy:lts-alpine` | [`stacks/holo-haproxy/Dockerfile`](stacks/holo-haproxy/Dockerfile) | Slim HAProxy LTS load balancer (non-root `haproxy`) + `/bin/holo-pm` |
| `awesome-os/holo-varnish:latest` | `varnish:alpine` | [`stacks/holo-varnish/Dockerfile`](stacks/holo-varnish/Dockerfile) | Slim Varnish HTTP accelerator (non-root `varnish`) + `/bin/holo-pm` |
| `awesome-os/holo-httpd:latest` | `httpd:2.4-alpine` | [`stacks/holo-httpd/Dockerfile`](stacks/holo-httpd/Dockerfile) | Slim Apache HTTPd 2.4 server + `/bin/holo-pm` |
| `awesome-os/holo-postgres:latest` | `postgres:17-alpine` | [`stacks/holo-postgres/Dockerfile`](stacks/holo-postgres/Dockerfile) | Slim PostgreSQL 17 database server + `/bin/holo-pm` |
| `awesome-os/holo-mariadb:latest` | `mariadb:11` | [`stacks/holo-mariadb/Dockerfile`](stacks/holo-mariadb/Dockerfile) | MariaDB 11 database server + `/bin/holo-pm` |
| `awesome-os/holo-valkey:latest` | `valkey/valkey:8-alpine` | [`stacks/holo-valkey/Dockerfile`](stacks/holo-valkey/Dockerfile) | Slim Valkey 8 in-memory cache/store + `/bin/holo-pm` |
| `awesome-os/holo-mongodb:latest` | `mongo:8` | [`stacks/holo-mongodb/Dockerfile`](stacks/holo-mongodb/Dockerfile) | MongoDB 8 document database + `/bin/holo-pm` |
| `awesome-os/holo-solr:latest` | `solr:9-slim` | [`stacks/holo-solr/Dockerfile`](stacks/holo-solr/Dockerfile) | Apache Solr 9 search engine (non-root `solr`) + `/bin/holo-pm` |
| `awesome-os/holo-go:latest` | `golang:alpine` | [`stacks/holo-go/Dockerfile`](stacks/holo-go/Dockerfile) | Slim Go Alpine toolchain + `/bin/holo-pm` |
| `awesome-os/holo-deno:latest` | `denoland/deno:alpine` | [`stacks/holo-deno/Dockerfile`](stacks/holo-deno/Dockerfile) | Slim Deno Alpine runtime + `/bin/holo-pm` |
| `awesome-os/holo-git:latest` | `alpine/git:latest` | [`stacks/holo-git/Dockerfile`](stacks/holo-git/Dockerfile) | Slim Git Alpine client + `/bin/holo-pm` |
| `awesome-os/holo-wordpress:latest` | `wordpress:php8.4-fpm-alpine` | [`stacks/holo-wordpress/Dockerfile`](stacks/holo-wordpress/Dockerfile) | Slim WordPress PHP 8.4 FPM Alpine + `/bin/holo-pm` |
| `awesome-os/holo-ghost:latest` | `ghost:5-alpine` | [`stacks/holo-ghost/Dockerfile`](stacks/holo-ghost/Dockerfile) | Slim Ghost 5 Alpine publishing platform + `/bin/holo-pm` |
| `awesome-os/holo-redmine:latest` | `redmine:6-alpine` | [`stacks/holo-redmine/Dockerfile`](stacks/holo-redmine/Dockerfile) | Slim Redmine 6 Alpine issue tracker + `/bin/holo-pm` |
| `awesome-os/holo-squid:latest` | `alpine:3.21` | [`stacks/holo-squid/Dockerfile`](stacks/holo-squid/Dockerfile) | Slim Squid HTTP caching proxy (`ENTRYPOINT ["squid", "-N", "-d", "1"]`) + `/bin/holo-pm` |

---

## Quick Start

### `t2linux` (`FROM scratch` + `awesome-os/coreutils`)

```sh
docker run --rm -it \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/t2linux:latest \
  -c 'cat /etc/t2linux-release && ls -lh /bin/busybox /bin/coreutils /bin/holo-pm /etc/ssl/certs/ca-certificates.crt'
```

### `holo-node` (`FROM scratch` + Node.js `v27.0.0-alpha.0.2.0` on `amd64` & `arm64` + `holo-node-launcher`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-node:latest \
  node -v
```

### `holo-py` (Python 3.15)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-py:latest \
  python3 --version
```

### `holo-cpp` (Alpine 3.24 + `musl-dev` + Holo v11 C11 SDK)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-cpp:latest \
  ls -la /bin/holo-pm /usr/local/include/libholo_pm.h /usr/local/lib/libholo-pm.so
```

### `holo-jvm` (Eclipse Temurin 25 JRE)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-jvm:latest \
  java -version
```

### `holo-php` (PHP 8.6 CLI + Composer 2)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-php:latest \
  sh -c 'php -v && composer --version'
```

### `holo-ruby` (Ruby 4.0 + Bundler)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-ruby:latest \
  sh -c 'ruby -v && bundle --version'
```

### `holo-e2e-runner` (Zero-X11 Node current + `gcc` + `g++` + Mesa Lavapipe Vulkan + `holo-pm`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-e2e-runner:latest \
  holo-e2e-probe --out /tmp/probe.bmp
```

### `holo-e2e-lite` (Lightweight headless Node current + `git` + `holo-pm`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  awesome-os/holo-e2e-lite:latest \
  holo-e2e-probe --out /tmp/probe.bmp
```

---

## Shared Host CAS Volume (`/var/lib/b8g/cas`)

Every image declares `VOLUME ["/var/lib/b8g/cas"]` and exports:

- `B8G_CAS_DIR=/var/lib/b8g/cas`
- `B8G_CAS_V11_ROOT=/var/lib/b8g/cas/v11`

Mount a single host CAS directory across all containers (`-v ~/.b8g/cas:/var/lib/b8g/cas`) to deduplicate Holo v11 artifacts across `t2linux`, `holo-node`, `holo-py`, `holo-cpp`, `holo-jvm`, `holo-php`, `holo-ruby`, `holo-e2e-runner`, and `holo-e2e-lite` with zero redundant downloads.

## Automated Daily Publishing & `holo-ci@v1`

- [`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) rebuilds, smoke-tests (including `holo-node` on both `linux/amd64` and `linux/arm64` under QEMU), reports image sizes, exports and uploads `<name>-linux-amd64.oci.tar.gz` + `SHA512SUMS-<name>.txt` for all 9 base images to anonymous public release `v11-oci-latest`, and populates the internal `ghcr.io/awesome-os/*:latest` CI mirror cache on every push to `main`, daily at `05:00 UTC`, and on manual `workflow_dispatch`.
- [`.github/workflows/holo-ci.yml`](.github/workflows/holo-ci.yml) runs `holo-ci@v1` (`awesome-os/maintenance-workflows/.github/workflows/reusable-holo-ci.yml@v1`) against [`holo-ci.json`](holo-ci.json) (`zeroGhost`, `zeroCasV1`, `spdxLicense`, `gitattributes`, `codeowners`, Dockerfile presence, `catalog/oci-catalog.test.mts`, `catalog/cas-pipe-build.test.mts`, and doc integrity).

## License

[MIT](LICENSE)

## Quick Start (Windows / Linux / macOS)

```sh
# Clone & enter repository (all platforms)
git clone https://github.com/awesome-os/dockerimages.git && cd dockerimages
```

## Quick Install & Run (Windows / Linux / macOS)

```sh
# Install / hydrate from v11 CAS via holo-pm
holo-pm install repository://github.com/awesome-os/dockerimages@main

# Or project & run directly via holo-project (0-byte hardlink)
holo-project "project://cpp/dockerimages?from=repository://github.com/awesome-os/dockerimages@main"
```

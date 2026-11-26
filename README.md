# Awesome-OS Docker Images (`ghcr.io/awesome-os/*`)

Ultra-slim `FROM scratch` and Holo v11 (`holo-pm`) OCI container images built and published daily to **GitHub Container Registry (`ghcr.io/awesome-os/*`)** and public GitHub Release **`v11-oci-latest`** (`holo-e2e-runner-linux-amd64.oci.tar.gz`, `holo-e2e-lite-linux-amd64.oci.tar.gz`) with shared Content-Addressable Store (CAS) volume support, alongside the unified [`CATALOG.md`](CATALOG.md) & [`catalog/oci-catalog.json`](catalog/oci-catalog.json) inventory covering `awesome-os`, sister org [`github.com/dockerimages`](https://github.com/dockerimages) (`138` repos), and [`sameersbn`](https://github.com/sameersbn) successor mappings.

## Published Images

| Image | Base | Highlights |
| :--- | :--- | :--- |
| `ghcr.io/awesome-os/t2linux:latest` | `FROM scratch` | 100% sovereign zero-Alpine runtime with real [`awesome-os/coreutils`](https://github.com/awesome-os/coreutils), static `busybox` `sh`, CA certificates, `/etc/t2linux-release`, `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-node:latest` | `FROM scratch` | 100% sovereign zero-Alpine runtime with Node.js `v27.0.0-alpha.0.2.0` (`linux/amd64` musl + `linux/arm64` glibc), `awesome-os/coreutils`, `/usr/local/bin/holo-node-launcher` (`awesome-os/node@v0.4.0`), and `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-py:latest` | `python:3.15-alpine` | Python 3.15 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-cpp:latest` | `alpine:3.24` | Alpine 3.24 + `musl-dev` + `/bin/holo-pm` + `/usr/local/include/libholo_pm.h` & `/usr/local/lib/libholo-pm.so` |
| `ghcr.io/awesome-os/holo-jvm:latest` | `eclipse-temurin:25-jre-alpine` | Temurin 25 JRE + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-php:latest` | `php:8.6-cli-alpine` | PHP 8.6 CLI + Composer 2 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-ruby:latest` | `ruby:4.0-alpine` | Ruby 4.0 + Bundler + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-e2e-runner:latest` | `node:current-alpine` | Zero-X11 Node current + `gcc` + `g++` + `musl-dev` + Mesa Lavapipe Vulkan ICD + `/bin/holo-pm` + `holo-e2e-probe` (+ public `v11-oci-latest` tarball) |
| `ghcr.io/awesome-os/holo-e2e-lite:latest` | `node:current-alpine` | Lightweight headless Node current + `ca-certificates` + `curl` + `jq` + `bash` + `git` + `/bin/holo-pm` + `holo-e2e-probe` (`HOLO_E2E_LITE=1`, zero `gcc`/`g++`/Mesa Vulkan; + public `v11-oci-latest` tarball) |

All images verify `/bin/holo-pm` (and `libholo-pm.so` / `libholo_pm.h`) bit-for-bit via SHA-512 against [`awesome-os/holo-v11`](https://github.com/awesome-os/holo-v11/blob/main/index/holo-compiler-lockfile.json) during build.

---

## Public Sovereign OCI Tarballs (`v11-oci-latest`)

For zero-GHCR-auth clean-box `Holo-E2E` execution, [`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) also exports and uploads SHA-512 verified `holo-e2e-runner` and `holo-e2e-lite` OCI bundles to GitHub Release [`v11-oci-latest`](https://github.com/awesome-os/dockerimages/releases/tag/v11-oci-latest):

- `holo-e2e-runner-linux-amd64.oci.tar.gz` + `SHA512SUMS-holo-e2e-runner.txt` (`gcc` + `g++` + Mesa Lavapipe Vulkan)
- `holo-e2e-lite-linux-amd64.oci.tar.gz` + `SHA512SUMS-holo-e2e-lite.txt` (lightweight headless Node + `git` + `holo-pm`)

```sh
curl -fsSLO https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/holo-e2e-lite-linux-amd64.oci.tar.gz
curl -fsSLO https://github.com/awesome-os/dockerimages/releases/download/v11-oci-latest/SHA512SUMS-holo-e2e-lite.txt
sha512sum -c SHA512SUMS-holo-e2e-lite.txt
docker load -i holo-e2e-lite-linux-amd64.oci.tar.gz
```

---

## Unified OCI Catalog (`awesome-os` + `dockerimages` + `sameersbn` Successors)

- **[`CATALOG.md`](CATALOG.md)** — Human-readable catalog of all `awesome-os` OCI/Compose definitions (`32` repos, `127` files), the read-only 4-tier classification of all `138` repositories in sister org [`github.com/dockerimages`](https://github.com/dockerimages), and successor mappings for `sameersbn/*` stacks (`docker-gitlab`, `docker-redmine`, `docker-postgresql`, `docker-bind`, `docker-squid`, `docker-browser-box`, etc.).
- **[`catalog/oci-catalog.json`](catalog/oci-catalog.json)** — Machine-readable catalog (`schema: "awesome-os.oci-catalog.v1"`, `abiMagic: "0x33564742"`), verified by [`catalog/oci-catalog.test.mts`](catalog/oci-catalog.test.mts) and `holo-ci@v1`.

---

## Quick Start

### `t2linux` (`FROM scratch` + `awesome-os/coreutils`)

```sh
docker run --rm -it \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/t2linux:latest \
  -c 'cat /etc/t2linux-release && ls -lh /bin/busybox /bin/coreutils /bin/holo-pm /etc/ssl/certs/ca-certificates.crt'
```

### `holo-node` (`FROM scratch` + Node.js `v27.0.0-alpha.0.2.0` on `amd64` & `arm64` + `holo-node-launcher`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-node:latest \
  node -v
```

### `holo-py` (Python 3.15)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-py:latest \
  python3 --version
```

### `holo-cpp` (Alpine 3.24 + `musl-dev` + Holo v11 C11 SDK)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-cpp:latest \
  ls -la /bin/holo-pm /usr/local/include/libholo_pm.h /usr/local/lib/libholo-pm.so
```

### `holo-jvm` (Eclipse Temurin 25 JRE)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-jvm:latest \
  java -version
```

### `holo-php` (PHP 8.6 CLI + Composer 2)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-php:latest \
  sh -c 'php -v && composer --version'
```

### `holo-ruby` (Ruby 4.0 + Bundler)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-ruby:latest \
  sh -c 'ruby -v && bundle --version'
```

### `holo-e2e-runner` (Zero-X11 Node current + `gcc` + `g++` + Mesa Lavapipe Vulkan + `holo-pm`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-e2e-runner:latest \
  holo-e2e-probe --out /tmp/probe.bmp
```

### `holo-e2e-lite` (Lightweight headless Node current + `git` + `holo-pm`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-e2e-lite:latest \
  holo-e2e-probe --out /tmp/probe.bmp
```

---

## Shared Host CAS Volume (`/var/lib/b8g/cas`)

Every image declares `VOLUME ["/var/lib/b8g/cas"]` and exports:

- `B8G_CAS_DIR=/var/lib/b8g/cas`
- `B8G_CAS_V11_ROOT=/var/lib/b8g/cas/v11`

Mount a single host CAS directory across all containers (`-v ~/.b8g/cas:/var/lib/b8g/cas`) to deduplicate Holo v11 artifacts across `t2linux`, `holo-node`, `holo-py`, `holo-cpp`, `holo-jvm`, `holo-php`, `holo-ruby`, `holo-e2e-runner`, and `holo-e2e-lite` with zero redundant downloads.

## Automated Daily Publishing & `holo-ci@v1`

- [`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) rebuilds, smoke-tests (including `holo-node` on both `linux/amd64` and `linux/arm64` under QEMU), reports image sizes, publishes all 9 multi-arch (`linux/amd64`, `linux/arm64`) images to `ghcr.io/awesome-os/*:latest`, and uploads the public `holo-e2e-runner-linux-amd64.oci.tar.gz` and `holo-e2e-lite-linux-amd64.oci.tar.gz` bundles + `SHA512SUMS-*.txt` to release `v11-oci-latest` on every push to `main`, daily at `05:00 UTC`, and on manual `workflow_dispatch`.
- [`.github/workflows/holo-ci.yml`](.github/workflows/holo-ci.yml) runs `holo-ci@v1` (`awesome-os/maintenance-workflows/.github/workflows/reusable-holo-ci.yml@v1`) against [`holo-ci.json`](holo-ci.json) (`zeroGhost`, `zeroCasV1`, `spdxLicense`, `gitattributes`, `codeowners`, Dockerfile presence, `catalog/oci-catalog.test.mts`, and doc integrity).

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

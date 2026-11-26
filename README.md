# Awesome-OS Docker Images (`ghcr.io/awesome-os/*`)

Ultra-slim `FROM scratch` and Holo v11 (`holo-pm`) OCI container images built and published daily to **GitHub Container Registry (`ghcr.io/awesome-os/*`)** with shared Content-Addressable Store (CAS) volume support, alongside the unified [`CATALOG.md`](CATALOG.md) & [`catalog/oci-catalog.json`](catalog/oci-catalog.json) inventory covering `awesome-os`, sister org [`github.com/dockerimages`](https://github.com/dockerimages) (`138` repos), and [`sameersbn`](https://github.com/sameersbn) successor mappings.

## Published Images

| Image | Base | Highlights |
| :--- | :--- | :--- |
| `ghcr.io/awesome-os/t2linux:latest` | `FROM scratch` | ~3 MB static `busybox`, CA certificates, `/etc/t2linux-release`, `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-node:latest` | `node:24-alpine` | Node.js 24 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-py:latest` | `python:3.13-alpine` | Python 3.13 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-cpp:latest` | `alpine:3.21` | `musl-dev` + `/bin/holo-pm` + `/usr/local/include/libholo_pm.h` & `/usr/local/lib/libholo-pm.so` |
| `ghcr.io/awesome-os/holo-jvm:latest` | `eclipse-temurin:21-jre-alpine` | Temurin 21 JRE + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-php:latest` | `php:8.4-cli-alpine` | PHP 8.4 CLI + Composer 2 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-ruby:latest` | `ruby:3.4-alpine` | Ruby 3.4 + Bundler + `/bin/holo-pm` |

All images verify `/bin/holo-pm` (and `libholo-pm.so` / `libholo_pm.h`) bit-for-bit via SHA-512 against [`awesome-os/holo-v11`](https://github.com/awesome-os/holo-v11/blob/main/index/holo-compiler-lockfile.json) during build.

---

## Unified OCI Catalog (`awesome-os` + `dockerimages` + `sameersbn` Successors)

- **[`CATALOG.md`](CATALOG.md)** — Human-readable catalog of all `awesome-os` OCI/Compose definitions (`32` repos, `125` files), the read-only 4-tier classification of all `138` repositories in sister org [`github.com/dockerimages`](https://github.com/dockerimages), and successor mappings for `sameersbn/*` stacks (`docker-gitlab`, `docker-redmine`, `docker-postgresql`, `docker-bind`, `docker-squid`, `docker-browser-box`, etc.).
- **[`catalog/oci-catalog.json`](catalog/oci-catalog.json)** — Machine-readable catalog (`schema: "awesome-os.oci-catalog.v1"`, `abiMagic: "0x33564742"`), verified by [`catalog/oci-catalog.test.mts`](catalog/oci-catalog.test.mts) and `holo-ci@v1`.

---

## Quick Start

### `t2linux` (`FROM scratch`, ~3 MB)

```sh
docker run --rm -it \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/t2linux:latest \
  -c 'cat /etc/t2linux-release && ls -lh /bin/busybox /bin/holo-pm /etc/ssl/certs/ca-certificates.crt'
```

### `holo-node` (Node.js 24)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-node:latest \
  node -v
```

### `holo-py` (Python 3.13)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-py:latest \
  python3 --version
```

### `holo-cpp` (Alpine 3.21 + `musl-dev` + Holo v11 C11 SDK)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-cpp:latest \
  ls -la /bin/holo-pm /usr/local/include/libholo_pm.h /usr/local/lib/libholo-pm.so
```

### `holo-jvm` (Eclipse Temurin 21 JRE)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-jvm:latest \
  java -version
```

### `holo-php` (PHP 8.4 CLI + Composer 2)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-php:latest \
  sh -c 'php -v && composer --version'
```

### `holo-ruby` (Ruby 3.4 + Bundler)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/holo-ruby:latest \
  sh -c 'ruby -v && bundle --version'
```

---

## Shared Host CAS Volume (`/var/lib/b8g/cas`)

Every image declares `VOLUME ["/var/lib/b8g/cas"]` and exports:

- `B8G_CAS_DIR=/var/lib/b8g/cas`
- `B8G_CAS_V11_ROOT=/var/lib/b8g/cas/v11`

Mount a single host CAS directory across all containers (`-v ~/.b8g/cas:/var/lib/b8g/cas`) to deduplicate Holo v11 artifacts across `t2linux`, `holo-node`, `holo-py`, `holo-cpp`, `holo-jvm`, `holo-php`, and `holo-ruby` with zero redundant downloads.

## Automated Daily Publishing & `holo-ci@v1`

- [`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) rebuilds, smoke-tests, reports image sizes, and publishes all 7 multi-arch (`linux/amd64`, `linux/arm64`) images to `ghcr.io/awesome-os/*:latest` on every push to `main`, daily at `05:00 UTC`, and on manual `workflow_dispatch`.
- [`.github/workflows/holo-ci.yml`](.github/workflows/holo-ci.yml) runs `holo-ci@v1` (`awesome-os/maintenance-workflows/.github/workflows/reusable-holo-ci.yml@v1`) against [`holo-ci.json`](holo-ci.json) (`zeroGhost`, `zeroCasV1`, Dockerfile presence, `catalog/oci-catalog.test.mts`, and doc integrity).

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

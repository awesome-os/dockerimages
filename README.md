# Awesome-OS Docker Images (`ghcr.io/awesome-os/*`)

Ultra-slim `FROM scratch` and `b8g-ghost` OCI container images built and published daily to **GitHub Container Registry (`ghcr.io/awesome-os/*`)** with shared Content-Addressable Store (CAS) volume support.

## Published Images

| Image | Base | Highlights |
| :--- | :--- | :--- |
| `ghcr.io/awesome-os/t2linux:latest` | `FROM scratch` | ~3 MB static `busybox`, CA certificates, `/etc/t2linux-release`, `/bin/b8g-ghost` |
| `ghcr.io/awesome-os/ghost-node:latest` | `node:24-alpine` | Node.js 24 + `/bin/b8g-ghost` |
| `ghcr.io/awesome-os/ghost-py:latest` | `python:3.13-alpine` | Python 3.13 + `/bin/b8g-ghost` + `ghost_ffi.py` (pre-installed in `site-packages`) |
| `ghcr.io/awesome-os/ghost-cpp:latest` | `alpine:3.21` | `musl-dev` + `/bin/b8g-ghost` + `b8g_ghost.h` & `b8g_ghost.c` |
| `ghcr.io/awesome-os/ghost-jvm:latest` | `eclipse-temurin:21-jre-alpine` | Temurin 21 JRE + `/bin/b8g-ghost` |

All images verify `/bin/b8g-ghost` bit-for-bit via FIPS 180-4 SHA-256 against [`awesome-os/b8g-ghost @ cas-v1`](https://github.com/awesome-os/b8g-ghost/releases/tag/cas-v1) during build.

---

## Quick Start

### `t2linux` (`FROM scratch`, ~3 MB)

```sh
docker run --rm -it \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/t2linux:latest \
  -c 'cat /etc/t2linux-release && ls -lh /bin/b8g-ghost'
```

### `ghost-node` (Node.js 24)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-node:latest \
  node -v
```

### `ghost-py` (Python 3.13 + `ghost_ffi.py`)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-py:latest \
  python3 -c "import ghost_ffi; print(ghost_ffi.machine_cas_dir())"
```

### `ghost-cpp` (Alpine 3.21 + `musl-dev` + Ghost C/C++ SDK)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-cpp:latest \
  ls -la /bin/b8g-ghost /usr/local/include/b8g_ghost.h /usr/local/src/b8g_ghost.c
```

### `ghost-jvm` (Eclipse Temurin 21 JRE)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-jvm:latest \
  java -version
```

---

## Shared Host CAS Volume (`/var/lib/b8g/cas`)

Every image declares `VOLUME ["/var/lib/b8g/cas"]` and exports:

- `B8G_GHOST_CACHE_DIR=/var/lib/b8g/cas`
- `B8G_CAS_DIR=/var/lib/b8g/cas`

Mount a single host CAS directory across all containers (`-v ~/.b8g/cas:/var/lib/b8g/cas`) to deduplicate native Ghost libraries across `t2linux`, `ghost-node`, `ghost-py`, `ghost-cpp`, and `ghost-jvm` with zero redundant downloads:

```sh
mkdir -p ~/.b8g/cas
docker run --rm -v ~/.b8g/cas:/var/lib/b8g/cas ghcr.io/awesome-os/ghost-py:latest python3 -c "import ghost_ffi; print(ghost_ffi.machine_cas_dir())"
```

## Automated Daily Publishing

[`.github/workflows/publish-ghcr.yml`](.github/workflows/publish-ghcr.yml) rebuilds, smoke-tests, reports image sizes, and publishes all 5 images to `ghcr.io/awesome-os/*:latest` on every push to `main`, daily at `05:00 UTC`, and on manual `workflow_dispatch`.

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

# Awesome-OS Docker Images (`ghcr.io/awesome-os/*`)

Ultra-slim `FROM scratch` and Holo v11 (`holo-pm`) OCI container images built and published daily to **GitHub Container Registry (`ghcr.io/awesome-os/*`)** with shared Content-Addressable Store (CAS) volume support.

## Published Images

| Image | Base | Highlights |
| :--- | :--- | :--- |
| `ghcr.io/awesome-os/t2linux:latest` | `FROM scratch` | ~3 MB static `busybox`, CA certificates, `/etc/t2linux-release`, `/bin/holo-pm` |
| `ghcr.io/awesome-os/ghost-node:latest` | `node:24-alpine` | Node.js 24 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/ghost-py:latest` | `python:3.13-alpine` | Python 3.13 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/ghost-cpp:latest` | `alpine:3.21` | `musl-dev` + `/bin/holo-pm` + `/usr/local/include/libholo_pm.h` & `/usr/local/lib/libholo-pm.so` |
| `ghcr.io/awesome-os/ghost-jvm:latest` | `eclipse-temurin:21-jre-alpine` | Temurin 21 JRE + `/bin/holo-pm` |

All images verify `/bin/holo-pm` (and `libholo-pm.so` / `libholo_pm.h`) bit-for-bit via SHA-512 against [`awesome-os/holo-v11`](https://github.com/awesome-os/holo-v11/blob/main/index/holo-compiler-lockfile.json) during build.

---

## Quick Start

### `t2linux` (`FROM scratch`, ~3 MB)

```sh
docker run --rm -it \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/t2linux:latest \
  -c 'cat /etc/t2linux-release && ls -lh /bin/busybox /bin/holo-pm /etc/ssl/certs/ca-certificates.crt'
```

### `ghost-node` (Node.js 24)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-node:latest \
  node -v
```

### `ghost-py` (Python 3.13)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-py:latest \
  python3 --version
```

### `ghost-cpp` (Alpine 3.21 + `musl-dev` + Holo v11 C11 SDK)

```sh
docker run --rm \
  -v ~/.b8g/cas:/var/lib/b8g/cas \
  ghcr.io/awesome-os/ghost-cpp:latest \
  ls -la /bin/holo-pm /usr/local/include/libholo_pm.h /usr/local/lib/libholo-pm.so
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

- `B8G_CAS_DIR=/var/lib/b8g/cas`
- `B8G_CAS_V11_ROOT=/var/lib/b8g/cas/v11`

Mount a single host CAS directory across all containers (`-v ~/.b8g/cas:/var/lib/b8g/cas`) to deduplicate Holo v11 artifacts across `t2linux`, `ghost-node`, `ghost-py`, `ghost-cpp`, and `ghost-jvm` with zero redundant downloads.

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

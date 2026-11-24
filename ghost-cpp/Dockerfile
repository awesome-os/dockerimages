# syntax=docker/dockerfile:1
# Ultra-slim Alpine + musl-dev + b8g-ghost + b8g_ghost.h/b8g_ghost.c OCI image
FROM --platform=$BUILDPLATFORM alpine:3.21 AS ghost-fetch

ARG TARGETARCH
ARG GHOST_INDEX_URL="https://raw.githubusercontent.com/awesome-os/b8g-ghost/main/manifests/index.json"
ARG GHOST_CPP_RAW="https://raw.githubusercontent.com/awesome-os/ghost-cpp/main"

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) GHOST_ARCH="x64" ;; \
      arm64) GHOST_ARCH="arm64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH:-unset}" >&2; exit 1 ;; \
    esac; \
    apk add --no-cache ca-certificates curl jq; \
    INDEX_JSON="$(curl -fsSL "${GHOST_INDEX_URL}")"; \
    ENTRY="$(printf '%s' "${INDEX_JSON}" | jq -er --arg a "${GHOST_ARCH}" '.entries["b8g-ghost-linux-\($a)"] // .entries["b8g-shim-linux-\($a)"]')"; \
    GHOST_URL="$(printf '%s' "${ENTRY}" | jq -r '.download_url')"; \
    GHOST_SHA="$(printf '%s' "${ENTRY}" | jq -r '.sha256')"; \
    curl -fsSL "${GHOST_URL}" -o /tmp/b8g-ghost; \
    printf '%s  %s\n' "${GHOST_SHA}" /tmp/b8g-ghost | sha256sum -c -; \
    chmod 0755 /tmp/b8g-ghost; \
    curl -fsSL "${GHOST_CPP_RAW}/include/b8g_ghost.h" -o /tmp/b8g_ghost.h; \
    curl -fsSL "${GHOST_CPP_RAW}/src/b8g_ghost.c" -o /tmp/b8g_ghost.c; \
    chmod 0644 /tmp/b8g_ghost.h /tmp/b8g_ghost.c

FROM alpine:3.21

LABEL org.opencontainers.image.title="Awesome-OS ghost-cpp" \
      org.opencontainers.image.description="Slim Alpine 3.21 + musl-dev image with b8g-ghost and ghost-cpp C/C++ SDK" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache musl-dev ca-certificates && mkdir -p /var/lib/b8g/cas /usr/local/include /usr/local/src

COPY --from=ghost-fetch /tmp/b8g-ghost /bin/b8g-ghost
COPY --from=ghost-fetch /tmp/b8g_ghost.h /usr/local/include/b8g_ghost.h
COPY --from=ghost-fetch /tmp/b8g_ghost.c /usr/local/src/b8g_ghost.c

ENV B8G_GHOST_CACHE_DIR="/var/lib/b8g/cas" \
    B8G_CAS_DIR="/var/lib/b8g/cas"

VOLUME ["/var/lib/b8g/cas"]

# syntax=docker/dockerfile:1
# Ultra-slim Python 3.13 + b8g-ghost + ghost_ffi.py OCI image
FROM alpine:3.21 AS ghost-fetch

ARG GHOST_INDEX_URL="https://raw.githubusercontent.com/awesome-os/b8g-ghost/main/manifests/index.json"
ARG GHOST_PY_URL="https://raw.githubusercontent.com/awesome-os/ghost-py/main/ghost_ffi.py"

RUN set -eux; \
    apk add --no-cache ca-certificates curl jq; \
    INDEX_JSON="$(curl -fsSL "${GHOST_INDEX_URL}")"; \
    ENTRY="$(printf '%s' "${INDEX_JSON}" | jq -er '.entries["b8g-ghost-linux-x64"] // .entries["b8g-shim-linux-x64"]')"; \
    GHOST_URL="$(printf '%s' "${ENTRY}" | jq -r '.download_url')"; \
    GHOST_SHA="$(printf '%s' "${ENTRY}" | jq -r '.sha256')"; \
    curl -fsSL "${GHOST_URL}" -o /tmp/b8g-ghost; \
    printf '%s  %s\n' "${GHOST_SHA}" /tmp/b8g-ghost | sha256sum -c -; \
    chmod 0755 /tmp/b8g-ghost; \
    curl -fsSL "${GHOST_PY_URL}" -o /tmp/ghost_ffi.py; \
    chmod 0644 /tmp/ghost_ffi.py

FROM python:3.13-alpine

LABEL org.opencontainers.image.title="Awesome-OS ghost-py" \
      org.opencontainers.image.description="Slim Python 3.13 Alpine image with b8g-ghost and zero-pip ghost_ffi.py" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

COPY --from=ghost-fetch /tmp/b8g-ghost /bin/b8g-ghost
COPY --from=ghost-fetch /tmp/ghost_ffi.py /usr/local/lib/python3.13/site-packages/ghost_ffi.py
COPY --from=ghost-fetch /tmp/ghost_ffi.py /opt/b8g/ghost_ffi.py

RUN mkdir -p /var/lib/b8g/cas

ENV B8G_GHOST_CACHE_DIR="/var/lib/b8g/cas" \
    B8G_CAS_DIR="/var/lib/b8g/cas"

VOLUME ["/var/lib/b8g/cas"]

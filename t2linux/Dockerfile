# syntax=docker/dockerfile:1
# Ultra-slim FROM scratch T2Linux + b8g-ghost OCI base image (~3 MB)
FROM alpine:3.21 AS builder

ARG TARGETARCH
ARG GHOST_INDEX_URL="https://raw.githubusercontent.com/awesome-os/b8g-ghost/main/manifests/index.json"

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) GHOST_ARCH="x64" ;; \
      arm64) GHOST_ARCH="arm64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH:-unset}" >&2; exit 1 ;; \
    esac; \
    apk add --no-cache busybox-static ca-certificates curl jq; \
    mkdir -p /rootfs/bin /rootfs/etc/ssl/certs /rootfs/var/lib/b8g/cas /rootfs/tmp; \
    chmod 1777 /rootfs/tmp; \
    cp /bin/busybox.static /rootfs/bin/busybox; \
    chmod 0755 /rootfs/bin/busybox; \
    for cmd in sh ash ls cat cp mv rm mkdir rmdir ln chmod chown env echo printf grep sed awk head tail cut tr wc sort uniq test '[' true false uname id whoami pwd which sleep tar gzip gunzip sha256sum wget; do \
      ln -s busybox "/rootfs/bin/${cmd}"; \
    done; \
    cp /etc/ssl/certs/ca-certificates.crt /rootfs/etc/ssl/certs/ca-certificates.crt; \
    INDEX_JSON="$(curl -fsSL "${GHOST_INDEX_URL}")"; \
    ENTRY="$(printf '%s' "${INDEX_JSON}" | jq -er --arg a "${GHOST_ARCH}" '.entries["b8g-ghost-linux-\($a)"] // .entries["b8g-shim-linux-\($a)"]')"; \
    GHOST_URL="$(printf '%s' "${ENTRY}" | jq -r '.download_url')"; \
    GHOST_SHA="$(printf '%s' "${ENTRY}" | jq -r '.sha256')"; \
    curl -fsSL "${GHOST_URL}" -o /rootfs/bin/b8g-ghost; \
    printf '%s  %s\n' "${GHOST_SHA}" /rootfs/bin/b8g-ghost | sha256sum -c -; \
    chmod 0755 /rootfs/bin/b8g-ghost; \
    printf 'NAME="Awesome-OS T2Linux"\nID=t2linux\nVERSION_ID="1.0"\nPRETTY_NAME="Awesome-OS T2Linux (FROM scratch + b8g-ghost)"\nHOME_URL="https://github.com/awesome-os/dockerimages"\nGHOST_ARCH="%s"\nGHOST_CAS_SHA256="%s"\n' "${GHOST_ARCH}" "${GHOST_SHA}" > /rootfs/etc/t2linux-release

FROM scratch

LABEL org.opencontainers.image.title="Awesome-OS T2Linux" \
      org.opencontainers.image.description="Ultra-slim FROM scratch OCI image with static busybox, CA certs, and b8g-ghost CAS runtime" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /rootfs /

ENV PATH="/bin" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    B8G_GHOST_CACHE_DIR="/var/lib/b8g/cas" \
    B8G_CAS_DIR="/var/lib/b8g/cas"

VOLUME ["/var/lib/b8g/cas"]

ENTRYPOINT ["/bin/sh"]

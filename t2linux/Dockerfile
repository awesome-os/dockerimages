# syntax=docker/dockerfile:1
# Ultra-slim FROM scratch T2Linux + awesome-os/coreutils + Holo v11 (holo-pm) OCI base image
FROM alpine:3.24 AS builder

ARG TARGETARCH
ARG HOLO_V11_MANIFEST_URL="https://raw.githubusercontent.com/awesome-os/holo-v11/main/index/holo-compiler-lockfile.json"

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) HOLO_ARCH="x86_64"; COREUTILS_ARCH="x64" ;; \
      arm64) HOLO_ARCH="aarch64"; COREUTILS_ARCH="arm64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH:-unset}" >&2; exit 1 ;; \
    esac; \
    apk add --no-cache busybox-static ca-certificates curl jq; \
    mkdir -p /rootfs/bin /rootfs/etc/ssl/certs /rootfs/var/lib/b8g/cas/v11 /rootfs/tmp; \
    chmod 1777 /rootfs/tmp; \
    cp /bin/busybox.static /rootfs/bin/busybox; \
    chmod 0755 /rootfs/bin/busybox; \
    for cmd in sh ash grep sed awk which test '[' tar gzip gunzip wget; do \
      ln -sf busybox "/rootfs/bin/${cmd}"; \
    done; \
    COREUTILS_URL="https://github.com/awesome-os/coreutils/releases/latest/download/coreutils-linux-${COREUTILS_ARCH}-musl"; \
    curl -fsSL "${COREUTILS_URL}" -o /rootfs/bin/coreutils; \
    test -s /rootfs/bin/coreutils; \
    chmod 0755 /rootfs/bin/coreutils; \
    for cmd in ls cat cp mv rm mkdir rmdir ln chmod chown stat uname env whoami id pwd echo printf head tail wc sort uniq cut tr sha256sum sha512sum base64 sleep true false dd df du sync touch realpath readlink tee date nproc dirname basename; do \
      ln -sf coreutils "/rootfs/bin/${cmd}"; \
    done; \
    cp /etc/ssl/certs/ca-certificates.crt /rootfs/etc/ssl/certs/ca-certificates.crt; \
    MANIFEST_JSON="$(curl -fsSL "${HOLO_V11_MANIFEST_URL}")"; \
    ENTRY="$(printf '%s' "${MANIFEST_JSON}" | jq -er --arg f "holo-pm-linux-${HOLO_ARCH}" '[.dependencies[] | select(.filename == $f)][0]')"; \
    HOLO_URL="$(printf '%s' "${ENTRY}" | jq -r '.downloadUrl')"; \
    HOLO_SHA512="$(printf '%s' "${ENTRY}" | jq -r '.sha512')"; \
    curl -fsSL "${HOLO_URL}" -o /rootfs/bin/holo-pm; \
    printf '%s  %s\n' "${HOLO_SHA512}" /rootfs/bin/holo-pm | sha512sum -c -; \
    chmod 0755 /rootfs/bin/holo-pm; \
    printf 'NAME="Awesome-OS T2Linux"\nID=t2linux\nVERSION_ID="1.0"\nPRETTY_NAME="Awesome-OS T2Linux (FROM scratch + awesome-os/coreutils + Holo v11)"\nHOME_URL="https://github.com/awesome-os/dockerimages"\nHOLO_ARCH="%s"\nCOREUTILS_ARCH="%s"\nHOLO_PM_SHA512="%s"\n' "${HOLO_ARCH}" "${COREUTILS_ARCH}" "${HOLO_SHA512}" > /rootfs/etc/t2linux-release

FROM scratch

LABEL org.opencontainers.image.title="Awesome-OS T2Linux" \
      org.opencontainers.image.description="100% sovereign FROM scratch OCI image with awesome-os/coreutils, static busybox sh, CA certs, and Holo v11 holo-pm CAS runtime" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /rootfs /

ENV PATH="/bin" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    B8G_CAS_DIR="/var/lib/b8g/cas" \
    B8G_CAS_V11_ROOT="/var/lib/b8g/cas/v11"

VOLUME ["/var/lib/b8g/cas"]

ENTRYPOINT ["/bin/sh"]

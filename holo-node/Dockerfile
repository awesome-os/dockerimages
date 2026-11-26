# syntax=docker/dockerfile:1
# 100% Sovereign FROM scratch Node.js v27.0.0-alpha.0.2.0 (linux/amd64 musl + linux/arm64 glibc) + T2Linux rootfs + awesome-os/coreutils + Holo v11 (holo-pm) OCI image
FROM --platform=$TARGETPLATFORM debian:bookworm-slim AS glibc-arm64-src

ARG TARGETARCH
ARG NODE_V27_VERSION="v27.0.0-alpha.0.2.0"

RUN set -eux; \
    mkdir -p /glibc-out/usr/local/bin /glibc-out/lib /glibc-out/lib/aarch64-linux-gnu /glibc-out/usr/lib/aarch64-linux-gnu; \
    if [ "${TARGETARCH:-amd64}" = "arm64" ]; then \
      apt-get update && apt-get install -y --no-install-recommends ca-certificates curl xz-utils libatomic1 libstdc++6; \
      rm -rf /var/lib/apt/lists/*; \
      NODE_TARBALL="node-${NODE_V27_VERSION}-linux-arm64.tar.xz"; \
      NODE_URL="https://nodejs.org/dist/${NODE_V27_VERSION}/${NODE_TARBALL}"; \
      curl -fsSL "${NODE_URL}" -o "/tmp/${NODE_TARBALL}"; \
      curl -fsSL "https://nodejs.org/dist/${NODE_V27_VERSION}/SHASUMS256.txt" -o /tmp/SHASUMS256.txt; \
      EXPECTED_SHA256="$(awk -v f="${NODE_TARBALL}" '$2 == f {print $1}' /tmp/SHASUMS256.txt)"; \
      test -n "${EXPECTED_SHA256}"; \
      printf '%s  /tmp/%s\n' "${EXPECTED_SHA256}" "${NODE_TARBALL}" | sha256sum -c -; \
      mkdir -p /tmp/node-dist; \
      tar -xJf "/tmp/${NODE_TARBALL}" -C /tmp/node-dist --strip-components=1; \
      cp /tmp/node-dist/bin/node /glibc-out/usr/local/bin/node; \
      chmod 0755 /glibc-out/usr/local/bin/node; \
      for p in \
        /lib/ld-linux-aarch64.so.1 \
        /lib/aarch64-linux-gnu/ld-linux-aarch64.so.1 \
        /lib/aarch64-linux-gnu/libc.so.6 \
        /lib/aarch64-linux-gnu/libm.so.6 \
        /lib/aarch64-linux-gnu/libdl.so.2 \
        /lib/aarch64-linux-gnu/libpthread.so.0 \
        /lib/aarch64-linux-gnu/librt.so.1 \
        /lib/aarch64-linux-gnu/libgcc_s.so.1 \
        /usr/lib/aarch64-linux-gnu/libstdc++.so.6 \
        /usr/lib/aarch64-linux-gnu/libatomic.so.1; do \
        if [ -e "${p}" ]; then \
          mkdir -p "/glibc-out$(dirname "${p}")"; \
          cp -aL "${p}" "/glibc-out${p}"; \
        fi; \
      done; \
      ldd /glibc-out/usr/local/bin/node; \
      if ldd /glibc-out/usr/local/bin/node | grep -q 'not found'; then \
        echo "ERROR: missing shared library for arm64 node" >&2; exit 1; \
      fi; \
      ldd /glibc-out/usr/local/bin/node | awk '/=> \// {print $3} /^\s*\// {print $1}' | while read -r dep; do \
        [ -n "${dep}" ] || continue; \
        [ -e "${dep}" ] || { echo "ERROR: dependency ${dep} not found on disk" >&2; exit 1; }; \
        mkdir -p "/glibc-out$(dirname "${dep}")"; \
        cp -aL "${dep}" "/glibc-out${dep}"; \
      done; \
      /glibc-out/usr/local/bin/node -v; \
      rm -rf "/tmp/${NODE_TARBALL}" /tmp/node-dist /tmp/SHASUMS256.txt; \
    fi

FROM alpine:3.24 AS builder

ARG TARGETARCH
ARG NODE_V27_VERSION="v27.0.0-alpha.0.2.0"
ARG NODE_LAUNCHER_VERSION="v0.4.0"
ARG HOLO_V11_MANIFEST_URL="https://raw.githubusercontent.com/awesome-os/holo-v11/main/index/holo-compiler-lockfile.json"

COPY --from=glibc-arm64-src /glibc-out/ /tmp/glibc-out/

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) HOLO_ARCH="x86_64"; NODE_ARCH="x64" ;; \
      arm64) HOLO_ARCH="aarch64"; NODE_ARCH="arm64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH:-unset}" >&2; exit 1 ;; \
    esac; \
    apk add --no-cache busybox-static ca-certificates curl jq xz libstdc++ libgcc libatomic; \
    mkdir -p /rootfs/bin /rootfs/usr/local/bin /rootfs/lib /rootfs/usr/lib /rootfs/etc/ssl/certs /rootfs/var/lib/b8g/cas/v11 /rootfs/tmp /rootfs/root; \
    chmod 1777 /rootfs/tmp; \
    cp /bin/busybox.static /rootfs/bin/busybox; \
    chmod 0755 /rootfs/bin/busybox; \
    for cmd in sh ash grep sed awk which test '[' tar gzip gunzip wget; do \
      ln -sf busybox "/rootfs/bin/${cmd}"; \
    done; \
    COREUTILS_URL="https://github.com/awesome-os/coreutils/releases/latest/download/coreutils-linux-${NODE_ARCH}-musl"; \
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
    LAUNCHER_URL="https://github.com/awesome-os/node/releases/download/${NODE_LAUNCHER_VERSION}/node-linux-${NODE_ARCH}"; \
    curl -fsSL "${LAUNCHER_URL}" -o /rootfs/usr/local/bin/holo-node-launcher; \
    test -s /rootfs/usr/local/bin/holo-node-launcher; \
    chmod 0755 /rootfs/usr/local/bin/holo-node-launcher; \
    for lib in /lib/ld-musl-*.so.1; do \
      cp -aL "${lib}" "/rootfs/lib/$(basename "${lib}")"; \
    done; \
    if [ "${TARGETARCH:-amd64}" = "amd64" ]; then \
      NODE_TARBALL="node-${NODE_V27_VERSION}-linux-x64-musl.tar.xz"; \
      NODE_URL="https://nodejs.org/dist/${NODE_V27_VERSION}/${NODE_TARBALL}"; \
      curl -fsSL "${NODE_URL}" -o "/tmp/${NODE_TARBALL}"; \
      curl -fsSL "https://nodejs.org/dist/${NODE_V27_VERSION}/SHASUMS256.txt" -o /tmp/SHASUMS256.txt; \
      EXPECTED_SHA256="$(awk -v f="${NODE_TARBALL}" '$2 == f {print $1}' /tmp/SHASUMS256.txt)"; \
      test -n "${EXPECTED_SHA256}"; \
      printf '%s  /tmp/%s\n' "${EXPECTED_SHA256}" "${NODE_TARBALL}" | sha256sum -c -; \
      mkdir -p /tmp/node-dist; \
      tar -xJf "/tmp/${NODE_TARBALL}" -C /tmp/node-dist --strip-components=1; \
      cp /tmp/node-dist/bin/node /rootfs/usr/local/bin/node; \
      rm -rf "/tmp/${NODE_TARBALL}" /tmp/node-dist /tmp/SHASUMS256.txt; \
      cp -aL /usr/lib/libstdc++.so.6 /rootfs/usr/lib/libstdc++.so.6; \
      cp -aL /usr/lib/libgcc_s.so.1 /rootfs/usr/lib/libgcc_s.so.1; \
      if [ -e /usr/lib/libatomic.so.1 ]; then cp -aL /usr/lib/libatomic.so.1 /rootfs/usr/lib/libatomic.so.1; fi; \
      ldd /rootfs/usr/local/bin/node | awk '/=> \// {print $3}' | while read -r dep; do \
        [ -n "${dep}" ] || continue; \
        [ -e "${dep}" ] || { echo "ERROR: missing shared library ${dep} for amd64 node" >&2; exit 1; }; \
        mkdir -p "/rootfs$(dirname "${dep}")"; \
        cp -aL "${dep}" "/rootfs${dep}"; \
      done; \
      if ldd /rootfs/usr/local/bin/node | grep -q 'not found'; then \
        echo "ERROR: unresolved shared library for amd64 node" >&2; exit 1; \
      fi; \
    else \
      cp -a /tmp/glibc-out/. /rootfs/; \
      test -s /rootfs/usr/local/bin/node; \
    fi; \
    rm -rf /tmp/glibc-out; \
    chmod 0755 /rootfs/usr/local/bin/node; \
    ln -sf /usr/local/bin/node /rootfs/bin/node; \
    printf 'root:x:0:0:root:/root:/bin/sh\nnobody:x:65534:65534:nobody:/:/bin/false\n' > /rootfs/etc/passwd; \
    printf 'root:x:0:\nnobody:x:65534:\n' > /rootfs/etc/group; \
    chroot /rootfs /bin/coreutils --version | head -n 1; \
    NODE_ACTUAL_VERSION="$(chroot /rootfs /usr/local/bin/node -v)"; \
    echo "Verified chroot /rootfs /usr/local/bin/node -v -> ${NODE_ACTUAL_VERSION}"; \
    case "${NODE_ACTUAL_VERSION}" in \
      v27.*) ;; \
      *) echo "ERROR: expected Node v27.x in FROM scratch rootfs, got ${NODE_ACTUAL_VERSION}" >&2; exit 1 ;; \
    esac; \
    printf 'NAME="Awesome-OS T2Linux"\nID=t2linux\nVERSION_ID="1.0"\nPRETTY_NAME="Awesome-OS holo-node (FROM scratch + Node %s + awesome-os/coreutils + Holo v11)"\nHOME_URL="https://github.com/awesome-os/dockerimages"\nNODE_VERSION="%s"\nHOLO_ARCH="%s"\n' "${NODE_ACTUAL_VERSION}" "${NODE_ACTUAL_VERSION}" "${HOLO_ARCH}" > /rootfs/etc/t2linux-release

FROM scratch

LABEL org.opencontainers.image.title="Awesome-OS holo-node" \
      org.opencontainers.image.description="100% sovereign FROM scratch Node.js v27.0.0-alpha.0.2.0 (amd64 + arm64) + T2Linux rootfs + awesome-os/coreutils + Holo v11 holo-pm OCI image" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /rootfs /

ENV PATH="/usr/local/bin:/bin" \
    HOME="/root" \
    SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    B8G_CAS_DIR="/var/lib/b8g/cas" \
    B8G_CAS_V11_ROOT="/var/lib/b8g/cas/v11"

VOLUME ["/var/lib/b8g/cas"]

CMD ["node"]

# syntax=docker/dockerfile:1
# 100% Sovereign FROM scratch Node.js 27 (amd64) / current (arm64) + T2Linux rootfs + awesome-os/coreutils + Holo v11 (holo-pm) OCI image
FROM node:current-alpine AS node-alpine-src

FROM alpine:3.24 AS builder

ARG TARGETARCH
ARG NODE_V27_VERSION="v27.0.0-alpha.0.2.0"
ARG NODE_LAUNCHER_VERSION="v0.4.0"
ARG HOLO_V11_MANIFEST_URL="https://raw.githubusercontent.com/awesome-os/holo-v11/main/index/holo-compiler-lockfile.json"

COPY --from=node-alpine-src /usr/local/bin/node /tmp/node-alpine-bin
COPY --from=node-alpine-src /lib/ /tmp/node-alpine-lib/
COPY --from=node-alpine-src /usr/lib/ /tmp/node-alpine-usr-lib/

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
    NODE_TARBALL="node-${NODE_V27_VERSION}-linux-${NODE_ARCH}-musl.tar.xz"; \
    NODE_URL="https://nodejs.org/dist/${NODE_V27_VERSION}/${NODE_TARBALL}"; \
    NODE_HTTP="$(curl -sSL -o "/tmp/${NODE_TARBALL}" -w '%{http_code}' "${NODE_URL}" || true)"; \
    if [ "${NODE_HTTP}" = "200" ] && [ -s "/tmp/${NODE_TARBALL}" ]; then \
      curl -fsSL "https://nodejs.org/dist/${NODE_V27_VERSION}/SHASUMS256.txt" -o /tmp/SHASUMS256.txt; \
      EXPECTED_SHA256="$(awk -v f="${NODE_TARBALL}" '$2 == f {print $1}' /tmp/SHASUMS256.txt)"; \
      test -n "${EXPECTED_SHA256}"; \
      printf '%s  /tmp/%s\n' "${EXPECTED_SHA256}" "${NODE_TARBALL}" | sha256sum -c -; \
      mkdir -p /tmp/node-dist; \
      tar -xJf "/tmp/${NODE_TARBALL}" -C /tmp/node-dist --strip-components=1; \
      cp /tmp/node-dist/bin/node /rootfs/usr/local/bin/node; \
      rm -rf "/tmp/${NODE_TARBALL}" /tmp/node-dist /tmp/SHASUMS256.txt; \
    else \
      echo "WARN: ${NODE_URL} returned HTTP ${NODE_HTTP}; extracting /usr/local/bin/node from node:current-alpine" >&2; \
      rm -f "/tmp/${NODE_TARBALL}"; \
      cp /tmp/node-alpine-bin /rootfs/usr/local/bin/node; \
    fi; \
    chmod 0755 /rootfs/usr/local/bin/node; \
    ln -sf /usr/local/bin/node /rootfs/bin/node; \
    for lib in /lib/ld-musl-*.so.1; do \
      cp -aL "${lib}" "/rootfs/lib/$(basename "${lib}")"; \
    done; \
    cp -aL /usr/lib/libstdc++.so.6 /rootfs/usr/lib/libstdc++.so.6; \
    cp -aL /usr/lib/libgcc_s.so.1 /rootfs/usr/lib/libgcc_s.so.1; \
    if [ -e /usr/lib/libatomic.so.1 ]; then cp -aL /usr/lib/libatomic.so.1 /rootfs/usr/lib/libatomic.so.1; fi; \
    ldd /rootfs/usr/local/bin/node 2>/dev/null | awk '/=> \// {print $3}' | while read -r dep; do \
      [ -n "${dep}" ] || continue; \
      b="$(basename "${dep}")"; \
      dir="$(dirname "${dep}")"; \
      mkdir -p "/rootfs${dir}"; \
      if [ -e "${dep}" ]; then \
        cp -aL "${dep}" "/rootfs${dep}"; \
      elif [ -e "/tmp/node-alpine-lib/${b}" ]; then \
        cp -aL "/tmp/node-alpine-lib/${b}" "/rootfs${dep}"; \
      elif [ -e "/tmp/node-alpine-usr-lib/${b}" ]; then \
        cp -aL "/tmp/node-alpine-usr-lib/${b}" "/rootfs${dep}"; \
      fi; \
    done; \
    ldd /rootfs/usr/local/bin/node 2>/dev/null | awk '/not found/ {print $1}' | while read -r missing; do \
      [ -n "${missing}" ] || continue; \
      if [ -e "/tmp/node-alpine-lib/${missing}" ]; then \
        cp -aL "/tmp/node-alpine-lib/${missing}" "/rootfs/lib/${missing}"; \
      elif [ -e "/tmp/node-alpine-usr-lib/${missing}" ]; then \
        cp -aL "/tmp/node-alpine-usr-lib/${missing}" "/rootfs/usr/lib/${missing}"; \
      else \
        echo "ERROR: missing shared library ${missing} for node" >&2; exit 1; \
      fi; \
    done; \
    printf 'root:x:0:0:root:/root:/bin/sh\nnobody:x:65534:65534:nobody:/:/bin/false\n' > /rootfs/etc/passwd; \
    printf 'root:x:0:\nnobody:x:65534:\n' > /rootfs/etc/group; \
    NODE_ACTUAL_VERSION="$(chroot /rootfs /usr/local/bin/node -v)"; \
    printf 'NAME="Awesome-OS T2Linux"\nID=t2linux\nVERSION_ID="1.0"\nPRETTY_NAME="Awesome-OS holo-node (FROM scratch + Node %s + awesome-os/coreutils + Holo v11)"\nHOME_URL="https://github.com/awesome-os/dockerimages"\nNODE_VERSION="%s"\nHOLO_ARCH="%s"\n' "${NODE_ACTUAL_VERSION}" "${NODE_ACTUAL_VERSION}" "${HOLO_ARCH}" > /rootfs/etc/t2linux-release

FROM scratch

LABEL org.opencontainers.image.title="Awesome-OS holo-node" \
      org.opencontainers.image.description="100% sovereign FROM scratch Node.js 27 (amd64) / current (arm64) + T2Linux rootfs + awesome-os/coreutils + Holo v11 holo-pm OCI image" \
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

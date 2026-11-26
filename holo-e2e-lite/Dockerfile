# syntax=docker/dockerfile:1
# Lightweight headless Node.js current + git + Holo v11 (holo-pm) E2E runner OCI image (zero gcc/g++/musl-dev/Mesa Vulkan)
FROM --platform=$BUILDPLATFORM alpine:3.24 AS holo-fetch

ARG TARGETARCH
ARG HOLO_V11_MANIFEST_URL="https://raw.githubusercontent.com/awesome-os/holo-v11/main/index/holo-compiler-lockfile.json"

RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) HOLO_ARCH="x86_64" ;; \
      arm64) HOLO_ARCH="aarch64" ;; \
      *) echo "Unsupported TARGETARCH: ${TARGETARCH:-unset}" >&2; exit 1 ;; \
    esac; \
    apk add --no-cache ca-certificates curl jq; \
    MANIFEST_JSON="$(curl -fsSL "${HOLO_V11_MANIFEST_URL}")"; \
    ENTRY="$(printf '%s' "${MANIFEST_JSON}" | jq -er --arg f "holo-pm-linux-${HOLO_ARCH}" '[.dependencies[] | select(.filename == $f)][0]')"; \
    HOLO_URL="$(printf '%s' "${ENTRY}" | jq -r '.downloadUrl')"; \
    HOLO_SHA512="$(printf '%s' "${ENTRY}" | jq -r '.sha512')"; \
    curl -fsSL "${HOLO_URL}" -o /tmp/holo-pm; \
    printf '%s  %s\n' "${HOLO_SHA512}" /tmp/holo-pm | sha512sum -c -; \
    chmod 0755 /tmp/holo-pm

FROM node:current-alpine

LABEL org.opencontainers.image.title="Awesome-OS holo-e2e-lite" \
      org.opencontainers.image.description="Lightweight headless Node current + git + Holo v11 holo-pm E2E runner image (no gcc/g++/musl-dev/Mesa Vulkan)" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache \
      ca-certificates \
      curl \
      jq \
      bash \
      git && \
    git config --system --add safe.directory '*' && \
    mkdir -p /var/lib/b8g/cas/v11

COPY --from=holo-fetch /tmp/holo-pm /bin/holo-pm
COPY holo-e2e-probe.mjs /usr/local/bin/holo-e2e-probe
RUN chmod 0755 /usr/local/bin/holo-e2e-probe

ENV SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    B8G_CAS_DIR="/var/lib/b8g/cas" \
    B8G_CAS_V11_ROOT="/var/lib/b8g/cas/v11" \
    HOLO_E2E_OFFSCREEN="1" \
    HOLO_E2E_LITE="1"

VOLUME ["/var/lib/b8g/cas"]

# syntax=docker/dockerfile:1
# Ultra-slim Alpine + musl-dev + Holo v11 (holo-pm + libholo_pm.h + libholo-pm.so) OCI image
FROM --platform=$BUILDPLATFORM alpine:3.21 AS holo-fetch

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
    BIN_ENTRY="$(printf '%s' "${MANIFEST_JSON}" | jq -er --arg f "holo-pm-linux-${HOLO_ARCH}" '[.dependencies[] | select(.filename == $f)][0]')"; \
    BIN_URL="$(printf '%s' "${BIN_ENTRY}" | jq -r '.downloadUrl')"; \
    BIN_SHA512="$(printf '%s' "${BIN_ENTRY}" | jq -r '.sha512')"; \
    curl -fsSL "${BIN_URL}" -o /tmp/holo-pm; \
    printf '%s  %s\n' "${BIN_SHA512}" /tmp/holo-pm | sha512sum -c -; \
    chmod 0755 /tmp/holo-pm; \
    LIB_ENTRY="$(printf '%s' "${MANIFEST_JSON}" | jq -er --arg f "libholo-pm-linux-${HOLO_ARCH}.so" '[.dependencies[] | select(.filename == $f)][0]')"; \
    LIB_URL="$(printf '%s' "${LIB_ENTRY}" | jq -r '.downloadUrl')"; \
    LIB_SHA512="$(printf '%s' "${LIB_ENTRY}" | jq -r '.sha512')"; \
    curl -fsSL "${LIB_URL}" -o /tmp/libholo-pm.so; \
    printf '%s  %s\n' "${LIB_SHA512}" /tmp/libholo-pm.so | sha512sum -c -; \
    chmod 0755 /tmp/libholo-pm.so; \
    HDR_ENTRY="$(printf '%s' "${MANIFEST_JSON}" | jq -er '[.dependencies[] | select(.filename == "libholo_pm.h")][0]')"; \
    HDR_URL="$(printf '%s' "${HDR_ENTRY}" | jq -r '.downloadUrl')"; \
    HDR_SHA512="$(printf '%s' "${HDR_ENTRY}" | jq -r '.sha512')"; \
    curl -fsSL "${HDR_URL}" -o /tmp/libholo_pm.h; \
    printf '%s  %s\n' "${HDR_SHA512}" /tmp/libholo_pm.h | sha512sum -c -; \
    chmod 0644 /tmp/libholo_pm.h

FROM alpine:3.21

LABEL org.opencontainers.image.title="Awesome-OS holo-cpp" \
      org.opencontainers.image.description="Slim Alpine 3.21 + musl-dev image with Holo v11 holo-pm and libholo-pm C11 SDK" \
      org.opencontainers.image.source="https://github.com/awesome-os/dockerimages" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache musl-dev ca-certificates && mkdir -p /var/lib/b8g/cas/v11 /usr/local/include /usr/local/lib

COPY --from=holo-fetch /tmp/holo-pm /bin/holo-pm
COPY --from=holo-fetch /tmp/libholo_pm.h /usr/local/include/libholo_pm.h
COPY --from=holo-fetch /tmp/libholo-pm.so /usr/local/lib/libholo-pm.so

ENV SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt" \
    B8G_CAS_DIR="/var/lib/b8g/cas" \
    B8G_CAS_V11_ROOT="/var/lib/b8g/cas/v11"

VOLUME ["/var/lib/b8g/cas"]

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Governance standardization: `.gitattributes`, `.github/CODEOWNERS`, and `CHANGELOG.md`.

## [11.0.0] - 2026-11-26

### Added
- Sovereign `FROM scratch` `t2linux` and `holo-node` (Node.js v27) multi-arch OCI images alongside `holo-py`, `holo-cpp`, `holo-jvm`, `holo-php`, `holo-ruby`, and `holo-e2e-runner` on `ghcr.io/awesome-os/*`.
- Public `v11-oci-latest` release tarball (`holo-e2e-runner-linux-amd64.oci.tar.gz`) with `SHA512SUMS-holo-e2e-runner.txt`.
- Unified `CATALOG.md` and `catalog/oci-catalog.json` verified by `catalog/oci-catalog.test.mts` and `holo-ci@v1`.

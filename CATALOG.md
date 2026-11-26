# Awesome-OS & `dockerimages` OCI Catalog

Machine-readable source of truth: [`catalog/oci-catalog.json`](catalog/oci-catalog.json) (`schema: "awesome-os.oci-catalog.v1"`, `abiMagic: "0x33564742"`, CAS protocol `holo-v11`).

Back to [README.md](README.md).

---

## 1. Published Multi-Arch Base & Runner Images (`ghcr.io/awesome-os/*`)

All 8 multi-arch (`linux/amd64`, `linux/arm64`) images declare `VOLUME ["/var/lib/b8g/cas"]` (`B8G_CAS_DIR=/var/lib/b8g/cas`, `B8G_CAS_V11_ROOT=/var/lib/b8g/cas/v11`) and verify `/bin/holo-pm` via SHA-512 against `awesome-os/holo-v11`.

| Image | Base | Dockerfile | Highlights |
| :--- | :--- | :--- | :--- |
| `ghcr.io/awesome-os/t2linux:latest` | `FROM scratch` | [`t2linux/Dockerfile`](t2linux/Dockerfile) | 100% sovereign zero-Alpine runtime with real `awesome-os/coreutils`, static `busybox` `sh`, CA certs, `/etc/t2linux-release`, `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-node:latest` | `FROM scratch` | [`holo-node/Dockerfile`](holo-node/Dockerfile) | 100% sovereign zero-Alpine runtime with Node.js `v27.0.0-alpha.0.2.0` (`amd64`) / `node:current-alpine` (`arm64`), `awesome-os/coreutils`, `/usr/local/bin/holo-node-launcher` (`awesome-os/node@v0.4.0`), and `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-py:latest` | `python:3.15-alpine` | [`holo-py/Dockerfile`](holo-py/Dockerfile) | Python 3.15 Alpine + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-cpp:latest` | `alpine:3.24` | [`holo-cpp/Dockerfile`](holo-cpp/Dockerfile) | Alpine 3.24 + `musl-dev` + `/bin/holo-pm` + `libholo_pm.h` + `libholo-pm.so` |
| `ghcr.io/awesome-os/holo-jvm:latest` | `eclipse-temurin:25-jre-alpine` | [`holo-jvm/Dockerfile`](holo-jvm/Dockerfile) | Eclipse Temurin 25 JRE Alpine + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-php:latest` | `php:8.6-cli-alpine` | [`holo-php/Dockerfile`](holo-php/Dockerfile) | PHP 8.6 CLI Alpine + Composer 2 + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-ruby:latest` | `ruby:4.0-alpine` | [`holo-ruby/Dockerfile`](holo-ruby/Dockerfile) | Ruby 4.0 Alpine + Bundler + `/bin/holo-pm` |
| `ghcr.io/awesome-os/holo-e2e-runner:latest` | `node:current-alpine` | [`holo-e2e-runner/Dockerfile`](holo-e2e-runner/Dockerfile) | Zero-X11 Node current + `gcc` + `g++` + `musl-dev` + Mesa Lavapipe Vulkan ICD + `/bin/holo-pm` + `/usr/local/bin/holo-e2e-probe` (`HOLO_E2E_OFFSCREEN=1`; also published as `v11-oci-latest` tarball) |

---

## 2. `awesome-os` Organization OCI Inventory (`32` Repos, `126` Files)

Scanned across `141` local mirrors (`144` org repos on GitHub): **`19` active repos** and **`13` archived repos** containing `Dockerfile`, `Containerfile`, `*.dockerfile`, `*.containerfile`, `docker-compose*.yml`, or `compose*.yml`.

| Category | Repos | Active | Archived | OCI / Compose Files | Key Repositories |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Base & Runtime** | 5 | 4 | 1 | 18 | `dockerimages` (8), `uv` (3), `pnpm` (3), `coreutils` (1), `docker` *(archived, 3)* |
| **Sovereign AI & GPU** | 3 | 3 | 0 | 27 | `vllm` (12), `llama.cpp` (11), `colibri` (4) |
| **Sovereign Forge & Identity** | 5 | 5 | 0 | 44 | `gitlab-foss` (24), `gitlab-runner` (12), `gitaly` (3), `ory-polis` (3), `gitlab-shell` (2) |
| **Toolchains & Systems** | 10 | 7 | 3 | 18 | `maclab` (3), `cargo` (2), `go-lang` (2), `siliconforest-m1n1` (2), `firecracker` (1), `chonkstep` (1), `siliconforest` (1), `ladybird` *(archived, 3)*, `repository` *(archived, 2)*, `pouchdb` *(archived, 1)* |
| **Benchmarks & Historical** | 9 | 0 | 9 | 19 | `benchmarks` (4), `lo-bench` (3), `benchy` (2), `demo-iouring` (2), `docs` (2), `just` (2), `techempower` (2), `joos` (1), `pgbench` (1) *(all archived)* |
| **Total** | **32** | **19** | **13** | **126** | Full per-file listing in [`catalog/oci-catalog.json`](catalog/oci-catalog.json) |

---

## 3. Sister Org `github.com/dockerimages` (`138` Repositories — Read-Only Catalog)

The sister organization [`github.com/dockerimages`](https://github.com/dockerimages) is cataloged read-only here (no mutations or pushes are made to `dockerimages/*`). All **138** repositories are partitioned uniquely across 4 alignment tiers in [`catalog/oci-catalog.json`](catalog/oci-catalog.json):

| Tier | Count | Role & Alignment Strategy | Representative Repositories |
| :--- | :---: | :--- | :--- |
| **Tier 1: Flagships** | 26 | Starred, high-value, or recently updated flagship containers | `docker-systemd` (★38), `docker-tools` (★32), `docker-varnish` (★27), `docker-unrealircd` (★16), `openproject` (★6), `docker-webmin` (★3), `docker-virtualmin` (★2), `docker-apache2` (★2), `docker-asterisk`, `dockerLLM`, `Docker-OSX`, `pod-odoo`, `v8-build`, `scratch`, `docker-deno`, `deno-lambda`, `haproxy`, `mariadb-galera`, `couchbase`, `couchbase-sandbox`, `custom-build`, `dockerimages`, `dockerimages.github.io`, `official-images`, `cloud9`, `typo3` |
| **Tier 2: `sameersbn` Successors** | 18 | Direct `dockerimages/*` counterparts for retired/high-demand `sameersbn/*` stacks | `gitlab`, `https-gitlab.com-gitlab-org-omnibus-gitlab`, `redmine`, `nsd-dnssec`, `direktspeed-gateway`, `mysql`, `docker-galera`, `apt-cacher`, `apt_cache`, `docker-cache`, `docker-nginx`, `nginx`, `nginx-docker-router`, `docker-pagespeed`, `docker-mongodb`, `mongodb-local`, `php`, `node` |
| **Tier 3: Modernizable Utilities** | 41 | Specialized reusable developer/infra utilities ready for `FROM scratch` + Holo v11 | `google-drive-ocamlfuse`, `dockersh`, `fedora-s6`, `docker-cockpit`, `docker-harp`, `python-ws-to-tuntap-proxy`, `vscode-ubuntu`, `email-services`, `docker-desktop`, `docker-pm2`, `docker-solr`, `git`, `ovmf`, `nsenter`, `docker-enter`, `dind`, `elk`, `golang-compiler`, `docker-icinga2`, `docker-nagios` |
| **Tier 4: Archive Candidates** | 53 | Legacy 2014–2016 single-purpose/superseded stacks recommended for non-destructive archival with a catalog pointer | `ubuntu-upstart`, `ubuntu-supervisor`, `ubuntu-vm`, `ubuntu-baseimage-supervisord`, `docker-mesos`, `docker-marathon`, `mesosphere-docker`, `docker-wordpress`, `docker-xampp`, `lampp`, `magento-stack`, `docker-strider`, `vagrant-aws`, `docktorrent` |
| **Total** | **138** | Exact disjoint 4-tier partition | Verified by `catalog/oci-catalog.test.mts` |

---

## 4. `sameersbn/*` Successor Mapping (`19` High-Demand Stacks)

High-demand containers from [`github.com/sameersbn`](https://github.com/sameersbn) mapped to maintained `dockerimages/*` and `awesome-os/*` successors:

| `sameersbn/*` Repo | Stars | Domain | Successor(s) in `dockerimages/*` / `awesome-os/*` |
| :--- | :---: | :--- | :--- |
| `sameersbn/docker-gitlab` | ★8,113 | Sovereign Forge & Identity | `dockerimages/gitlab`, `dockerimages/https-gitlab.com-gitlab-org-omnibus-gitlab`, `awesome-os/gitlab-foss` |
| `sameersbn/docker-redmine` | ★1,333 | Project & Issue Tracking | `dockerimages/redmine` |
| `sameersbn/docker-postgresql` | ★1,088 | Database Substrate | `awesome-os/pgbench` (`postgres.dockerfile`), `ghcr.io/awesome-os/t2linux` (`FROM scratch` + `holo-pm`) |
| `sameersbn/docker-bind` | ★925 | DNS & Edge Infrastructure | `dockerimages/nsd-dnssec` |
| `sameersbn/docker-squid` | ★853 | Proxy & Caching Gateway | `dockerimages/direktspeed-gateway`, `dockerimages/docker-varnish` |
| `sameersbn/docker-browser-box` | ★573 | Browser Sandbox | `awesome-os/sectium-browser-box` (Sectium Layer-1 Display Appliance) |
| `sameersbn/docker-mysql` | ★246 | Relational Database | `dockerimages/mysql`, `dockerimages/docker-galera`, `dockerimages/mariadb-galera` |
| `sameersbn/docker-apt-cacher-ng` | ★242 | Package Mirror Cache | `dockerimages/apt-cacher`, `dockerimages/apt_cache`, `dockerimages/ubuntu-apt-cache` |
| `sameersbn/docker-gitlab-ci` | ★198 | CI/CD Orchestration | `awesome-os/gitlab-runner`, `awesome-os/gitlab-shell` |
| `sameersbn/docker-redis` | ★155 | In-Memory Cache | `dockerimages/docker-cache` |
| `sameersbn/docker-gitlab-ci-multi-runner` | ★147 | CI/CD Runner | `awesome-os/gitlab-runner` |
| `sameersbn/docker-openfire` | ★82 | Real-Time Messaging | `dockerimages/docker-unrealircd` |
| `sameersbn/docker-nginx` | ★73 | Web & RTMP Reverse Proxy | `dockerimages/docker-nginx`, `dockerimages/nginx`, `dockerimages/nginx-docker-router` |
| `sameersbn/docker-mongodb` | ★48 | Document Store | `dockerimages/docker-mongodb`, `dockerimages/mongodb-local` |
| `sameersbn/docker-ubuntu` | ★32 | Base OS Image | `dockerimages/ubuntu-base`, `dockerimages/docker-systemd`, `ghcr.io/awesome-os/t2linux` |
| `sameersbn/docker-nextcloud` | ★31 | Sovereign Storage | `dockerimages/google-drive-ocamlfuse`, `dockerimages/cbfs` |
| `sameersbn/docker-memcached` | ★28 | Ephemeral Object Cache | `dockerimages/docker-cache` |
| `sameersbn/docker-php-fpm` | ★8 | PHP Runtime | `dockerimages/php`, `dockerimages/docker-ispconfig-php` |
| `sameersbn/docker-nodejs` | ★7 | Node.js Runtime | `ghcr.io/awesome-os/holo-node`, `dockerimages/node` |

---

## 5. Modernization Blueprint (`FROM scratch` + Holo `v11` CAS + `B8G_ABI_MAGIC_V3`)

1. **Zero-Base Runtime (`FROM scratch` / Alpine):** Compile static musl binaries via `holo-compiler` (`zig cc -target {x86_64,aarch64}-linux-musl`) and copy only the binary, CA bundle, and `/var/lib/b8g/cas/v11`.
2. **Content-Addressable Hydration (`holo-pm`):** Resolve dependencies against `awesome-os/holo-v11` (`v11/files/00..ff/<sha512>`) using SHA-512 verification and mount `-v ~/.b8g/cas:/var/lib/b8g/cas` across containers for 0-byte deduplication.
3. **Microkernel ABI (`B8G_ABI_MAGIC_V3`, `0x33564742`):** Expose 64-byte aligned `B8G_ARENA_V1` shared memory arenas and opaque pipe/socket channels (`\\.\pipe\sectium-dev` / `/tmp/sectium-dev.sock`) rather than loopback HTTP IPC.
4. **Universal `holo-ci@v1` Verification:** Validate all OCI catalogs, Dockerfiles, and docs via `holo-ci verify` (`zeroGhost`, `zeroCasV1`) and multi-arch `linux/amd64,linux/arm64` GHCR publishing.

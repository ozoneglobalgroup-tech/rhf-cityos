# syntax=docker/dockerfile:1.7

FROM golang:1.24.8-bookworm AS builder

ARG MINIO_COMMIT

RUN test -n "${MINIO_COMMIT}" \
    && git clone --filter=blob:none https://github.com/minio/minio.git /src \
    && cd /src \
    && git checkout --detach "${MINIO_COMMIT}" \
    && test "$(git rev-parse HEAD)" = "${MINIO_COMMIT}"

WORKDIR /src

ARG GOPROXY_URL=direct
ENV GOPROXY="${GOPROXY_URL}"
ENV GOTOOLCHAIN=local

RUN go mod download

RUN mkdir -p /out \
    && LDFLAGS="$(go run buildscripts/gen-ldflags.go)" \
    && CGO_ENABLED=0 GOOS=linux \
       go build \
       -tags kqueue \
       -trimpath \
       --ldflags "${LDFLAGS}" \
       -o /out/minio \
       .

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       curl \
       gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 minio \
    && useradd \
       --uid 10001 \
       --gid minio \
       --no-create-home \
       --home-dir /data \
       --shell /usr/sbin/nologin \
       minio \
    && install -d -o minio -g minio -m 0770 /data

COPY --from=builder /out/minio /usr/local/bin/minio
COPY entrypoint.sh /usr/local/bin/ruvos-minio-entrypoint

RUN chmod 0755 \
    /usr/local/bin/minio \
    /usr/local/bin/ruvos-minio-entrypoint

EXPOSE 9000 9001

VOLUME ["/data"]

ENTRYPOINT ["/usr/local/bin/ruvos-minio-entrypoint"]
CMD ["server", "/data", "--console-address", ":9001"]

# B2B EDI

An open source, Apache 2.0 licensed Rust-based B2B/EDI platform foundation for high-scale transaction processing, mapping design, and operational visibility.

## Why this project

This repository provides a production-minded starting point for a scalable EDI capability that can:

- support multiple EDI standards and transaction sets in one runtime
- model mapping from EDI into JSON or XML with an editor-friendly structure
- expose execution APIs for high-throughput processing
- provide observability hooks for metrics, traces, and uptime checks

## Architecture

The workspace is organized as a Rust workspace with the following components:

- `crates/edi-core`: shared types, standards registry, generated mapping definitions, and validation logic
- `crates/edi-api`: Actix Web API server and drag-and-drop mapping prototype served as a static UI

## Feature coverage

### 1. All EDI transaction formats

The core model includes a pluggable EDI standard registry. The current version includes:

- X12
- EDIFACT
- HL7
- TRADACOMS
- CUSTOM

The design allows additional formats to be registered without changing the public API.

### 2. EDI-to-JSON/XML mapping design

The API includes a mapping model and a browser-based drag-and-drop mock UI. The intent is to support:

- source segment selection from EDI vocabularies
- drop targets in JSON/XML schema nodes
- optional custom code steps for transformation logic
- validation of mapping definitions before they are published

### 3. Transaction execution at scale via API

The API exposes endpoints for:

- listing supported EDI standards
- validating mapping definitions
- receiving transactions for processing
- returning processing metadata with job identifiers

The server is built on Actix Web and is intended to be horizontally scalable behind a load balancer or queue-based worker layer.

### 4. Observability

The project includes structured tracing and health endpoints. It is designed to be extended with:

- Prometheus metrics
- distributed tracing (OTel)
- OpenTelemetry exporters
- health, readiness, and metrics endpoints

## Quick start

```bash
cargo build
cargo run -p edi-api
```

Then open http://localhost:8080/ to access the mapping UI.

## API examples

### Health check

```bash
curl http://localhost:8080/api/v1/health
```

### Supported formats

```bash
curl http://localhost:8080/api/v1/formats
```

### Validate a mapping

```bash
curl -X POST http://localhost:8080/api/v1/mappings/validate \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "850 to JSON",
    "source_standard": "X12",
    "target_format": "Json",
    "steps": [
      { "source_path": "ISA/GS/BEG", "target_path": "order.beginning_segment", "mode": "Direct" }
    ]
  }'
```

### Execute a transaction

```bash
curl -X POST http://localhost:8080/api/v1/transactions/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "transaction_type": "850",
    "standard": "X12",
    "payload": "ISA*00*...*ZZ*...",
    "metadata": { "sender": "ACME", "receiver": "CONTOSO" }
  }'
```

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Roadmap

This repository intentionally focuses on a solid foundation and the required architecture. A production-ready implementation would add:

- durable workflow orchestration
- schema validation and canonical mapping engine
- streaming ingest via Kafka/NATS/RabbitMQ
- persistence layer for mappings and executed transactions
- real drag-and-drop front-end framework such as React or Tauri
- enterprise auth and RBAC
- deployment manifests for Kubernetes and Docker

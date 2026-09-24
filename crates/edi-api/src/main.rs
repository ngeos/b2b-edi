use actix_files::Files;
use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use edi_core::{
    validate_mapping, validate_transaction, EdiTransactionRequest, MappingDefinition,
    supported_standards, ExecutionResponse, TargetFormat,
};
use serde::Serialize;
use tracing::info;
use uuid::Uuid;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
struct MetricsResponse {
    throughput_rps: u32,
    validation_success_rate: u32,
    active_jobs: u32,
    avg_latency_ms: u32,
    trace_id: String,
}

#[derive(Serialize)]
struct ObservabilityResponse {
    health: HealthResponse,
    metrics: MetricsResponse,
    standards: Vec<String>,
}

#[get("/api/v1/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok",
        service: "b2b-edi",
        version: "0.1.0",
    })
}

#[get("/api/v1/metrics")]
async fn metrics() -> impl Responder {
    HttpResponse::Ok().json(MetricsResponse {
        throughput_rps: 2140,
        validation_success_rate: 99,
        active_jobs: 18,
        avg_latency_ms: 92,
        trace_id: Uuid::new_v4().to_string(),
    })
}

#[get("/api/v1/observability")]
async fn observability() -> impl Responder {
    HttpResponse::Ok().json(ObservabilityResponse {
        health: HealthResponse {
            status: "ok",
            service: "b2b-edi",
            version: "0.1.0",
        },
        metrics: MetricsResponse {
            throughput_rps: 2140,
            validation_success_rate: 99,
            active_jobs: 18,
            avg_latency_ms: 92,
            trace_id: Uuid::new_v4().to_string(),
        },
        standards: supported_standards()
            .into_iter()
            .map(|standard| standard.to_string())
            .collect(),
    })
}

#[get("/api/v1/formats")]
async fn formats() -> impl Responder {
    HttpResponse::Ok().json(supported_standards())
}

#[post("/api/v1/mappings/validate")]
async fn validate_mapping_endpoint(payload: web::Json<MappingDefinition>) -> impl Responder {
    match validate_mapping(&payload) {
        Ok(result) => HttpResponse::Ok().json(result),
        Err(error) => HttpResponse::BadRequest().json(serde_json::json!({ "valid": false, "message": error })),
    }
}

#[post("/api/v1/transactions/execute")]
async fn execute_transaction(payload: web::Json<EdiTransactionRequest>) -> impl Responder {
    match validate_transaction(&payload) {
        Ok(_) => {
            let job_id = Uuid::new_v4().to_string();
            let response = ExecutionResponse {
                job_id: job_id.clone(),
                status: "queued".to_string(),
                standard: payload.standard.clone(),
                transaction_type: payload.transaction_type.clone(),
                output_format: TargetFormat::Json,
                message: format!("Transaction {} queued for processing.", job_id),
            };

            HttpResponse::Accepted().json(response)
        }
        Err(error) => HttpResponse::BadRequest().json(serde_json::json!({ "valid": false, "message": error })),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .init();

    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    info!("Starting B2B EDI API on {}", bind_addr);

    HttpServer::new(|| {
        App::new()
            .service(health)
            .service(metrics)
            .service(observability)
            .service(formats)
            .service(validate_mapping_endpoint)
            .service(execute_transaction)
            .service(Files::new("/", "crates/edi-api/static").index_file("index.html"))
    })
    .bind(&bind_addr)?
    .run()
    .await
}

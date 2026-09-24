use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EdiStandard {
    X12,
    Edifact,
    Tradacoms,
    Hl7,
    Custom,
}

impl std::fmt::Display for EdiStandard {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::X12 => write!(f, "X12"),
            Self::Edifact => write!(f, "EDIFACT"),
            Self::Tradacoms => write!(f, "TRADACOMS"),
            Self::Hl7 => write!(f, "HL7"),
            Self::Custom => write!(f, "CUSTOM"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TargetFormat {
    Json,
    Xml,
    Csv,
    Raw,
}

impl std::fmt::Display for TargetFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json => write!(f, "JSON"),
            Self::Xml => write!(f, "XML"),
            Self::Csv => write!(f, "CSV"),
            Self::Raw => write!(f, "RAW"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MappingMode {
    Direct,
    Split,
    Join,
    Code,
}

impl std::fmt::Display for MappingMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Direct => write!(f, "Direct"),
            Self::Split => write!(f, "Split"),
            Self::Join => write!(f, "Join"),
            Self::Code => write!(f, "Code"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MappingStep {
    pub source_path: String,
    pub target_path: String,
    pub mode: MappingMode,
    pub transform: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MappingDefinition {
    pub name: String,
    pub source_standard: EdiStandard,
    pub target_format: TargetFormat,
    pub steps: Vec<MappingStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdiTransactionRequest {
    pub transaction_type: String,
    pub standard: EdiStandard,
    pub payload: String,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub valid: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResponse {
    pub job_id: String,
    pub status: String,
    pub standard: EdiStandard,
    pub transaction_type: String,
    pub output_format: TargetFormat,
    pub message: String,
}

pub fn supported_standards() -> Vec<EdiStandard> {
    vec![
        EdiStandard::X12,
        EdiStandard::Edifact,
        EdiStandard::Tradacoms,
        EdiStandard::Hl7,
        EdiStandard::Custom,
    ]
}

pub fn validate_mapping(mapping: &MappingDefinition) -> Result<ValidationResponse, String> {
    if mapping.name.trim().is_empty() {
        return Err("Mapping name is required.".to_string());
    }

    if mapping.steps.is_empty() {
        return Err("At least one mapping step is required.".to_string());
    }

    for step in &mapping.steps {
        if step.source_path.trim().is_empty() {
            return Err("Each mapping step requires a source path.".to_string());
        }
        if step.target_path.trim().is_empty() {
            return Err("Each mapping step requires a target path.".to_string());
        }
    }

    Ok(ValidationResponse {
        valid: true,
        message: format!("{} is valid for {} mapping.", mapping.name, mapping.target_format),
    })
}

pub fn validate_transaction(request: &EdiTransactionRequest) -> Result<ValidationResponse, String> {
    if request.transaction_type.trim().is_empty() {
        return Err("Transaction type is required.".to_string());
    }
    if request.payload.trim().is_empty() {
        return Err("Payload cannot be empty.".to_string());
    }

    Ok(ValidationResponse {
        valid: true,
        message: format!("{} {} accepted for validation.", request.standard, request.transaction_type),
    })
}

pub fn format_title(standard: &EdiStandard) -> &'static str {
    match standard {
        EdiStandard::X12 => "X12",
        EdiStandard::Edifact => "EDIFACT",
        EdiStandard::Tradacoms => "TRADACOMS",
        EdiStandard::Hl7 => "HL7",
        EdiStandard::Custom => "CUSTOM",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_mapping_accepts_valid_definition() {
        let input = MappingDefinition {
            name: "850 to JSON".to_string(),
            source_standard: EdiStandard::X12,
            target_format: TargetFormat::Json,
            steps: vec![MappingStep {
                source_path: "ISA/GS/BEG".to_string(),
                target_path: "order.beginning_segment".to_string(),
                mode: MappingMode::Direct,
                transform: None,
            }],
        };

        let result = validate_mapping(&input).expect("mapping should validate");
        assert!(result.valid);
        assert!(result.message.contains("850 to JSON"));
    }

    #[test]
    fn validate_mapping_rejects_empty_name() {
        let input = MappingDefinition {
            name: String::new(),
            source_standard: EdiStandard::X12,
            target_format: TargetFormat::Xml,
            steps: vec![MappingStep {
                source_path: "N1".to_string(),
                target_path: "customer.name".to_string(),
                mode: MappingMode::Direct,
                transform: None,
            }],
        };

        let result = validate_mapping(&input);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("name"));
    }

    #[test]
    fn validate_transaction_accepts_non_empty_payload() {
        let input = EdiTransactionRequest {
            transaction_type: "850".to_string(),
            standard: EdiStandard::X12,
            payload: "ISA*00*...".to_string(),
            metadata: HashMap::from([
                ("sender".to_string(), "ACME".to_string()),
                ("receiver".to_string(), "CONTOSO".to_string()),
            ]),
        };

        let result = validate_transaction(&input).expect("transaction should validate");
        assert!(result.valid);
        assert!(result.message.contains("850"));
    }
}

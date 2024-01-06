use std::collections::HashMap;

use async_trait::async_trait;
use bencher_adapter::{
    results::{adapter_metrics::AdapterMetrics, adapter_results::LATENCY_NAME_ID},
    AdapterResults,
};
use bencher_json::JsonMetric;
use bollard::Docker;
use literally::hmap;
use rand::{distributions::Uniform, prelude::Distribution, Rng};

use crate::{cli_println, parser::up::CliUp, CliError};

use super::SubCmd;

const DEFAULT_COUNT: usize = 5;

#[derive(Debug, Clone)]
pub struct Up {
    pub count: Option<usize>,
    pub pow: Option<i32>,
    pub fail: bool,
    pub flaky: bool,
}

#[derive(thiserror::Error, Debug)]
pub enum UpError {
    #[error("Failed to connect to Docker daemon: {0}")]
    Docker(bollard::errors::Error),

    #[error("Failed to parse benchmark name: {0}")]
    ParseBenchmarkName(bencher_json::ValidError),

    #[error("Failed to serialize up results: {0}")]
    SerializeResults(serde_json::Error),

    #[error("Up failure")]
    UpFailure,
}

impl From<CliUp> for Up {
    fn from(up: CliUp) -> Self {
        let CliUp {
            count,
            pow,
            fail,
            flaky,
        } = up;
        Self {
            count,
            pow,
            fail,
            flaky,
        }
    }
}

#[async_trait]
impl SubCmd for Up {
    async fn exec(&self) -> Result<(), CliError> {
        self.exec_inner().map_err(Into::into)
    }
}

impl Up {
    fn exec_inner(&self) -> Result<(), UpError> {
        let _docker = Docker::connect_with_local_defaults().map_err(UpError::Docker);

        let adapter_results = self.generate_results()?;

        // TODO disable when quiet
        cli_println!(
            "{}",
            serde_json::to_string_pretty(&adapter_results).map_err(UpError::SerializeResults)?
        );

        if self.fail || (self.flaky && rand::thread_rng().gen::<bool>()) {
            Err(UpError::UpFailure)
        } else {
            Ok(())
        }
    }

    #[allow(clippy::cast_precision_loss, clippy::similar_names)]
    fn generate_results(&self) -> Result<AdapterResults, UpError> {
        let count = self.count.unwrap_or(DEFAULT_COUNT);
        let pow = self.pow.unwrap_or(1);
        let ten_pow = 10.0f64.powi(pow);
        let mut results = HashMap::with_capacity(count);
        let mut rng = rand::thread_rng();
        for c in 0..count {
            let low = ten_pow * c as f64;
            let high = ten_pow * (c + 1) as f64;
            let uniform = Uniform::new(low, high);
            let value: f64 = uniform.sample(&mut rng);
            let variance = value * 0.1;
            results.insert(
                format!("bencher::up_{c}")
                    .as_str()
                    .parse()
                    .map_err(UpError::ParseBenchmarkName)?,
                AdapterMetrics {
                    inner: hmap! {
                        LATENCY_NAME_ID.clone() => JsonMetric {
                             value: value.into(),
                             lower_value: Some((value - variance).into()),
                             upper_value: Some((value + variance).into()),
                        }
                    },
                },
            );
        }

        Ok(AdapterResults::from(results))
    }
}

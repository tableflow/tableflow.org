use std::convert::TryFrom;

use async_trait::async_trait;
use bencher_json::{
    JsonSignup,
    JsonUser,
};

use crate::{
    bencher::{
        backend::Backend,
        sub::SubCmd,
        wide::Wide,
    },
    cli::CliAuthSignup,
    BencherError,
};

const SIGNUP_PATH: &str = "/v0/auth/signup";

#[derive(Debug)]
pub struct Signup {
    pub name:    String,
    pub slug:    Option<String>,
    pub email:   String,
    pub backend: Backend,
}

impl TryFrom<CliAuthSignup> for Signup {
    type Error = BencherError;

    fn try_from(signup: CliAuthSignup) -> Result<Self, Self::Error> {
        let CliAuthSignup {
            name,
            slug,
            email,
            url,
        } = signup;
        let backend = Backend::new(None, url)?;
        Ok(Self {
            name,
            slug,
            email,
            backend,
        })
    }
}

#[async_trait]
impl SubCmd for Signup {
    async fn exec(&self, _wide: &Wide) -> Result<(), BencherError> {
        let signup = JsonSignup {
            name:  self.name.clone(),
            slug:  self.slug.clone(),
            email: self.email.clone(),
        };
        let res: JsonUser = self.backend.post(SIGNUP_PATH, &signup).await?;
        println!("{}", serde_json::to_string(&res)?);
        Ok(())
    }
}

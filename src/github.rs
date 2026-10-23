#[cfg(not(target_arch = "wasm32"))]
use crate::types::Project;

#[cfg(not(target_arch = "wasm32"))]
use std::sync::LazyLock;

#[cfg(not(target_arch = "wasm32"))]
use tokio::sync::RwLock;

#[cfg(not(target_arch = "wasm32"))]
static PROJECT_CACHE: LazyLock<RwLock<Vec<Project>>> =
    LazyLock::new(|| RwLock::new(crate::data::fallback_projects()));

#[cfg(not(target_arch = "wasm32"))]
static CONTRIB_CACHE: LazyLock<RwLock<u32>> = LazyLock::new(|| RwLock::new(0));

#[cfg(not(target_arch = "wasm32"))]
static LANG_CACHE: LazyLock<RwLock<Vec<(String, f64)>>> = LazyLock::new(|| RwLock::new(Vec::new()));

#[cfg(not(target_arch = "wasm32"))]
pub async fn warm_cache() {
    match fetch_repos().await {
        Ok(projects) => {
            tracing::info!("Cached {} projects from GitHub", projects.len());
            *PROJECT_CACHE.write().await = projects;
        }
        Err(error) => {
            tracing::warn!("GitHub repo fetch failed, using fallback cache: {error}");
        }
    }

    match fetch_languages().await {
        Ok(languages) => {
            tracing::info!("Cached {} language rows", languages.len());
            *LANG_CACHE.write().await = languages;
        }
        Err(error) => {
            tracing::warn!("GitHub language fetch failed: {error}");
        }
    }

    match fetch_contributions().await {
        Ok(count) => {
            tracing::info!("Cached {count} contributions");
            *CONTRIB_CACHE.write().await = count;
        }
        Err(error) => {
            tracing::warn!("GitHub contribution fetch failed: {error}");
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_projects() -> Vec<Project> {
    PROJECT_CACHE.read().await.clone()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_project(slug: &str) -> Option<Project> {
    PROJECT_CACHE
        .read()
        .await
        .iter()
        .find(|project| project.slug == slug)
        .cloned()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_contributions() -> u32 {
    *CONTRIB_CACHE.read().await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_languages() -> Vec<(String, f64)> {
    LANG_CACHE.read().await.clone()
}

#[cfg(not(target_arch = "wasm32"))]
fn http_client() -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .user_agent("notes-supply-site/0.1")
        .https_only(true)
        .timeout(std::time::Duration::from_secs(15))
        .build()
}

#[cfg(all(test, not(target_arch = "wasm32")))]
#[path = "tls_tests.rs"]
mod tls_tests;

#[cfg(not(target_arch = "wasm32"))]
pub async fn fetch_readme(slug: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = http_client()?;

    let url = format!("https://api.github.com/repos/notes-supply/{slug}/readme");
    let mut request = client
        .get(&url)
        .header("Accept", "application/vnd.github.raw+json");

    if let Some(token) = github_token() {
        request = request.bearer_auth(token);
    }

    let response = request.send().await?;
    if !response.status().is_success() {
        return Err(format!("README not found for {slug}").into());
    }

    Ok(response.text().await?)
}

#[cfg(not(target_arch = "wasm32"))]
async fn fetch_repos() -> Result<Vec<Project>, reqwest::Error> {
    let client = http_client()?;

    let url = "https://api.github.com/orgs/notes-supply/repos?per_page=100&sort=updated";
    let mut request = client.get(url);

    if let Some(token) = github_token() {
        request = request.bearer_auth(token);
    }

    let repos: Vec<GithubRepo> = request.send().await?.json().await?;

    Ok(repos
        .into_iter()
        .filter(|repo| !repo.fork && !repo.archived)
        .map(|repo| Project {
            name: repo.name.clone(),
            slug: repo.name,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            topics: repo.topics.unwrap_or_default(),
            html_url: repo.html_url,
            homepage: repo.homepage,
            updated_at: repo.updated_at.unwrap_or_default(),
        })
        .collect())
}

#[cfg(not(target_arch = "wasm32"))]
async fn fetch_languages() -> Result<Vec<(String, f64)>, Box<dyn std::error::Error + Send + Sync>> {
    let token = github_token()
        .ok_or("GITHUB_TOKEN not set — needed for language stats")?;

    let client = http_client()?;

    let projects = PROJECT_CACHE.read().await.clone();
    let mut totals: std::collections::HashMap<String, u64> = std::collections::HashMap::new();

    for project in &projects {
        let url = format!(
            "https://api.github.com/repos/notes-supply/{}/languages",
            project.slug
        );
        let response = client.get(&url).bearer_auth(&token).send().await?;
        if !response.status().is_success() {
            continue;
        }

        let languages: std::collections::HashMap<String, u64> = response.json().await?;
        for (language, bytes) in languages {
            *totals.entry(language).or_default() += bytes;
        }
    }

    let total_bytes: u64 = totals.values().sum();
    if total_bytes == 0 {
        return Ok(Vec::new());
    }

    let mut sorted: Vec<_> = totals.into_iter().collect();
    sorted.sort_by(|left, right| right.1.cmp(&left.1));

    let mut result = Vec::new();
    let mut other_bytes = 0u64;
    for (index, (language, bytes)) in sorted.iter().enumerate() {
        if index < 5 {
            let percent = (*bytes as f64 / total_bytes as f64) * 100.0;
            result.push((language.clone(), (percent * 10.0).round() / 10.0));
        } else {
            other_bytes += bytes;
        }
    }

    if other_bytes > 0 {
        let percent = (other_bytes as f64 / total_bytes as f64) * 100.0;
        result.push(("Other".into(), (percent * 10.0).round() / 10.0));
    }

    Ok(result)
}

#[cfg(not(target_arch = "wasm32"))]
async fn fetch_contributions() -> Result<u32, Box<dyn std::error::Error + Send + Sync>> {
    let token = github_token()
        .ok_or("GITHUB_TOKEN not set — needed for contribution count")?;

    let client = http_client()?;

    let query = r#"{"query":"{ user(login: \"OneNoted\") { contributionsCollection { contributionCalendar { totalContributions } } } }"}"#;

    let response: serde_json::Value = client
        .post("https://api.github.com/graphql")
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .body(query)
        .send()
        .await?
        .json()
        .await?;

    Ok(response
        .pointer("/data/user/contributionsCollection/contributionCalendar/totalContributions")
        .and_then(|value| value.as_u64())
        .unwrap_or(0) as u32)
}

#[cfg(not(target_arch = "wasm32"))]
fn github_token() -> Option<String> {
    std::env::var("GITHUB_TOKEN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[cfg(not(target_arch = "wasm32"))]
#[derive(serde::Deserialize)]
struct GithubRepo {
    name: String,
    description: Option<String>,
    language: Option<String>,
    stargazers_count: u32,
    forks_count: u32,
    topics: Option<Vec<String>>,
    html_url: String,
    homepage: Option<String>,
    updated_at: Option<String>,
    fork: bool,
    archived: bool,
}

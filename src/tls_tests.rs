//! Opt-in, credential-free checks of the production HTTP client.

#[tokio::test]
#[ignore = "contacts public TLS fixtures; run explicitly with --ignored --nocapture"]
async fn incident_tls_chains_are_rejected() {
    let client = super::http_client().expect("production client");
    let response = client
        .get("https://example.com/")
        .send()
        .await
        .expect("valid TLS control");
    assert!(response.status().is_success());
    assert!(
        !response
            .text()
            .await
            .expect("read valid control")
            .is_empty()
    );
    println!("valid-control: HTTP success and response body read");

    let mut rejected = 0;
    for name in ["dv-g3b", "dv-g3c", "ov-g3b", "ov-g3c", "ev-g3b", "ev-g3c"] {
        for suffix in ["", "-aaa"] {
            let url = format!("https://{name}{suffix}-emudhra.we-have-a-problem.com/");
            let error = client
                .get(&url)
                .send()
                .await
                .expect_err("compromised chain must fail");
            let diagnostic = format!("{error:?}");
            assert!(
                !error.is_timeout(),
                "inconclusive timeout: {url}: {diagnostic}"
            );
            assert!(
                diagnostic.to_lowercase().contains("certificate"),
                "not a certificate rejection: {url}: {diagnostic}"
            );
            println!("{url}: {diagnostic}");
            rejected += 1;
        }
    }
    assert_eq!(rejected, 12);
    for url in [
        "https://wrong.host.badssl.com/",
        "https://self-signed.badssl.com/",
    ] {
        let error = client
            .get(url)
            .send()
            .await
            .expect_err("invalid control must fail");
        let diagnostic = format!("{error:?}");
        assert!(
            !error.is_timeout(),
            "inconclusive timeout: {url}: {diagnostic}"
        );
        assert!(
            diagnostic.to_lowercase().contains("certificate"),
            "not a certificate rejection: {url}: {diagnostic}"
        );
        println!("{url}: {diagnostic}");
    }
    println!("incident certificate rejections: {rejected}/12; invalid controls: 2/2");
}

#[test]
fn plaintext_requests_are_rejected() {
    let client = super::http_client().expect("production client");
    let runtime = tokio::runtime::Runtime::new().expect("runtime");
    let error = runtime
        .block_on(client.get("http://127.0.0.1:9/").send())
        .expect_err("HTTPS-only policy");
    assert!(
        error.is_builder(),
        "plaintext must fail before connecting: {error:?}"
    );
}

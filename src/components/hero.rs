use dioxus::prelude::*;

use crate::components::TerminalIntro;

#[component]
pub fn Hero() -> Element {
    rsx! {
        section {
            id: "hero-wrapper",
            class: "relative min-h-screen flex items-center justify-center overflow-hidden",
            "data-revealed": "false",

            canvas {
                id: "hero-particles",
                class: "absolute inset-0 w-full h-full pointer-events-none z-[1]",
                "data-hero-particles": true,
            }

            div { class: "absolute inset-0 radial-atmosphere dot-grid" }

            div { class: "relative z-10 w-full max-w-2xl mx-auto px-6",
                div { class: "hero-stage",
                    div { class: "hero-overlay",
                        TerminalIntro {}
                    }

                    div { class: "hero-copy text-center",
                        button {
                            r#type: "button",
                            class: "hero-content term-replay font-mono text-base text-text-dim hover:text-text transition-colors duration-fast",
                            style: "--hero-reveal-delay: 0.12s",
                            "data-terminal-replay": true,
                            span { class: "text-accent", "$" }
                            span { style: "display:inline-block;width:4px" }
                            "whoami"
                            span { class: "terminal-cursor" }
                        }

                        h1 { class: "hero-content hero-title font-display text-6xl md:text-8xl font-extrabold tracking-tight leading-none mb-4",
                            style: "--hero-reveal-delay: 0s",
                            "notes"
                        }

                        p {
                            class: "hero-content text-sm text-text-dim leading-relaxed max-w-md mx-auto mb-5",
                            style: "--hero-reveal-delay: 0.28s; font-family: var(--font-mono)",
                            "DevOps, Kubernetes, and IT infrastructure."
                            br {}
                            "Custom software, systems, and tools built to fit."
                        }

                        div {
                            class: "hero-content flex flex-col items-center gap-0.5",
                            style: "--hero-reveal-delay: 0.5s; font-family: var(--font-mono)",
                            a {
                                href: "mailto:contact@notes.supply",
                                class: "block text-[10px] text-text-muted hover:text-accent transition-colors duration-fast tracking-wide",
                                "contact"
                                "["
                                span { style: "color: var(--color-accent)", "at" }
                                "]"
                                "notes"
                                "["
                                span { style: "color: var(--color-accent)", "dot" }
                                "]"
                                "supply"
                            }
                            a {
                                href: "https://github.com/notes-supply",
                                target: "_blank",
                                rel: "noopener",
                                class: "block text-[10px] text-text-muted hover:text-accent transition-colors duration-fast tracking-wide",
                                "github"
                                "["
                                span { style: "color: var(--color-accent)", "dot" }
                                "]"
                                "com"
                                "["
                                span { style: "color: var(--color-accent)", "/" }
                                "]"
                                "notes-supply"
                            }
                        }
                    }
                }
            }

            a {
                href: "#site-footer",
                class: "hero-content scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-10",
                style: "--hero-reveal-delay: 0.62s",
                span { class: "scroll-pill" }
            }
        }
    }
}

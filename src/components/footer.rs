use dioxus::prelude::*;

#[component]
pub fn Footer() -> Element {
    rsx! {
        footer { id: "site-footer", class: "border-t border-border py-12 px-6",
            div {
                class: "max-w-4xl mx-auto flex items-center justify-between text-[11px] font-mono text-text-muted",
                style: "flex-wrap: wrap; column-gap: 16px; row-gap: 8px;",
                span {
                    style: "flex: 1 1 220px; min-width: 0;",
                    "notes.supply // © 2026 Notes Supply AB"
                }
                div {
                    class: "flex items-center gap-4",
                    style: "flex: 0 0 auto;",
                    a {
                        href: "https://github.com/notes-supply",
                        target: "_blank",
                        rel: "noopener",
                        class: "hover:text-accent transition-colors duration-fast",
                        "GitHub"
                    }
                }
            }
        }
    }
}

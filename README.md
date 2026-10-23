# notes-supply-site

Use Node 24.22.1 and the Rust/Dioxus versions pinned in CI.

```sh
npm ci --ignore-scripts
npm run dev
```

The development command compiles the locked CSS dependencies before starting Dioxus, then watches CSS and serves the application together. Stopping either process stops both.

Use `npm run build` for a standalone release web bundle. Direct `dx serve` and `dx build` do not compile CSS; use the npm commands when changing styles. CI and Docker also compile CSS explicitly from the npm lockfile.

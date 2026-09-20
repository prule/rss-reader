# Packaging Beyond the Browser

PWA first. Native shells only when a concrete requirement demands one — each shell is a build pipeline, a signing process and a review queue you now own.

## The ladder — stop at the lowest rung that works
| Rung | Use | Cost |
|---|---|---|
| **PWA** | Default. Installable, offline, one deploy, instant updates. | None beyond the web app |
| **Capacitor** | App Store / Play presence is required, or a native API the web lacks (background sync, push on iOS, deep OS integration). | Two store accounts, signing, review delays |
| **Tauri** | Genuine desktop needs — filesystem access, OS integration, offline install, a system tray. | Rust toolchain, per-platform builds, code signing |

## Rules for agents
- The web build stays the single source. Capacitor and Tauri wrap it; they never fork it.
- Native capability goes behind a port with a web fallback, so the PWA still works — `../patterns/hexagonal-architecture.md`.
- No platform conditionals scattered through components. Detect once, inject the right adapter at the composition root.
- Know the constraints before promising: iOS Safari limits background execution and can evict storage; app stores reject thin web wrappers that add nothing native.
- Adding a shell means adding signing keys, store metadata and a release process. Do not start one casually.

## Deviate when
The app genuinely needs native performance or deep platform APIs throughout — at that point it is a native app, not a wrapped web app. Say so rather than fighting a shell.

## Smells
Capacitor added with no store requirement, `if (isNative)` through the component tree, a desktop build that has diverged from web, native plugins called directly from React, a shell that ships a stale bundled web build.

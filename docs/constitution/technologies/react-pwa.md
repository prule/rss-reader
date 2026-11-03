# React PWA

The default shape for user-facing apps: a client-rendered SPA, installable, offline-capable, deployable as static files.

## Defaults
| Concern | Choice |
|---|---|
| Build | **Vite** |
| Framework | **React** + **React Router** (SPA/declarative mode) |
| Service worker | **vite-plugin-pwa** (Workbox) |
| Styling | **Tailwind CSS** |
| Components | **shadcn/ui** — copied in and owned, not a dependency |
| UI state | **Zustand** |
| Local data | **Dexie** + `useLiveQuery` (see `local-first.md`) |
| Server state | **TanStack Query** — only when there is a server cache to manage |
| Forms | react-hook-form + Zod resolver |

## Rules for agents
- Client-rendered and statically hosted by default. Do not introduce SSR without a stated reason (SEO, first-paint budget) — it costs the offline story.
- Pick the state tool by shape: local-first reads come from Dexie live queries, not a fetch cache. Do not wrap IndexedDB in TanStack Query.
- Zustand holds ephemeral UI state only. Anything durable belongs in IndexedDB or the backend.
- shadcn/ui components are copied into the repo and edited freely — treat them as your code, not vendor code.
- Ship the PWA essentials properly: web app manifest, maskable icons, offline fallback route, and a tested update prompt. An unhandled service-worker update is a stale app.
- Never cache authenticated API responses in the service worker.
- Route-level code splitting via lazy routes from the start.
- Accessibility is not optional — `accessibility.md`. Degrade gracefully when the network fails — `frontend-resilience.md`. Store time in UTC and money as integers — `localization.md`.

## Deviate when
Content sites that need SEO and fast first paint are a different problem — use a static site generator or SSR framework and say so explicitly.

## Smells
`useEffect` fetching in a component, business logic in JSX, a service worker caching everything including `/api`, `dangerouslySetInnerHTML`, a manifest with no maskable icon, global CSS fighting Tailwind.

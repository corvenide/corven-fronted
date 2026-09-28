# Corven IDE

Corven IDE (formerly FiberDev Studio) is a browser-based IDE for building, testing, debugging, and deploying Nervos CKB smart contracts. Each workspace gets its own private CKB devnet and a Rust/RISC-V build container, provided by the [Corven backend](https://github.com/corvenide/corven-backend-v2).

This repository contains the web frontend: the landing page, dashboard, workspace IDE, devnet explorer, and settings.

## Features

- **Sign-in** with email and password or a CKB wallet (via CCC); sessions refresh automatically from an httpOnly cookie
- **Dashboard** to create, open, and delete workspaces
- **Workspace IDE**
  - File explorer with create, rename, and delete
  - CodeMirror editor with Rust, JavaScript/TypeScript, JSON, Markdown, CSS, HTML, Python, and Molecule highlighting, plus syntax linting
  - Integrated terminal (xterm.js over socket.io)
  - Build and test panels that stream output and parse test results
  - Molecule schema code generation
  - Debugger: replay devnet transactions with `ckb-debugger` and inspect exit codes and cycles, or run a built binary on its own
  - Deploy panel: one-click devnet deploys, wallet-signed testnet deploys, and upgradable deploys through Type ID
  - AI assistant panel backed by Claude through the backend (the API key never reaches the browser)
- **Devnets** page with live chain data for each workspace's node, test accounts, and scripts

## Tech stack

- React 19, TypeScript, Vite 6
- Tailwind CSS 4, Framer Motion, Lucide icons
- React Router 7, TanStack Query 5
- CodeMirror 6 (`@uiw/react-codemirror`), xterm.js
- socket.io-client
- `@ckb-ccc/connector-react` for wallets and CKB transactions
- Express (`server.ts`) as the development and production host

## Project structure

```text
src/
  app/            App, router, providers
  components/     layout, header, sidebar, auth guard, shared UI
  config/env.ts   required environment variables
  features/
    auth/         login, wallet auth, auth context
    dashboard/    workspace list and create/delete dialogs
    workspace/    IDE: file explorer, editor, terminal, build, tests, AI panel
    debugger/     ckb-debugger integration
    deploy/       devnet and testnet deployment
    devnet/       devnet explorer and CCC client that relays RPC through the API
    node/         node status views
    ai/           assistant API client and Markdown rendering
  lib/            API client, session refresh, token storage, query client
  pages/          route pages
server.ts         Express server: Vite middleware in dev, static dist in production
assets/           logos and images
```

## Routes

| Path | Page | Auth |
|---|---|:---:|
| `/` | Landing page | No |
| `/auth` | Sign in / sign up | No |
| `/donate` | Donations | No |
| `/dashboard` | Workspace list | Yes |
| `/ide/:workspaceId` | Workspace IDE | Yes |
| `/nodes` | Devnets | Yes |
| `/settings` | Settings | Yes |

## Prerequisites

- Node.js 22+ and pnpm
- A running [Corven backend](https://github.com/corvenide/corven-backend-v2) (API gateway and terminal service)

## Getting started

Install dependencies:

```bash
pnpm install
```

Create a `.env` file in the repository root. The app throws on startup if either variable is missing.

```env
# API gateway base URL, including the /api prefix
VITE_API_URL=http://localhost:8000/api

# Terminal service origin (a trailing /terminal is optional)
VITE_TERMINAL_URL=http://localhost:8004
```

Start the development server:

```bash
pnpm dev
```

The app runs at <http://localhost:3000>.

Set `DISABLE_HMR=true` to turn off hot reload and file watching.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the Express + Vite dev server on port 3000 |
| `pnpm build` | Build the client into `dist/` and bundle `server.ts` into `dist/server.cjs` |
| `pnpm start` | Run the production server (`node dist/server.cjs`) |
| `pnpm lint` | Type-check with `tsc --noEmit` |
| `pnpm clean` | Remove `dist/` |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | End-to-end tests in Chromium (Playwright) |

## Testing

**Unit and component tests** (`pnpm test`) sit next to the code as `*.test.ts(x)` and run in jsdom. They cover the API client (including refreshing an expired session and retrying once), session restore and sign-out, in-memory token storage, the file tree, `cargo test` output parsing, relative times, the route guard and the confirm dialog.

**End-to-end tests** (`pnpm test:e2e`, in `e2e/`) build the app, serve the production bundle, and drive it in Chromium. A mock backend (`e2e/support/mock-api.ts`) answers every API call and keeps workspaces in memory, so no backend has to run. They cover:

- signed-out visitors being sent to sign-in, a returning user being signed back in from the refresh cookie, and a revoked session
- the dashboard: listing workspaces with their status, creating one from a template, starting and stopping, deleting with confirmation, searching, recovering from a failed load, and opening the IDE

Install the browser once before the first run:

```bash
pnpm exec playwright install chromium
```

Wallet sign-in itself isn't covered end to end, because it needs a real wallet extension; the backend's end-to-end tests cover it with real signatures.

Both suites run in GitHub Actions on every pull request (`.github/workflows/test.yml`).

## Backend integration

REST calls go to `VITE_API_URL` with `Authorization: Bearer <token>` and `credentials: 'include'`, so the refresh cookie is sent. Terminal, build, and test sessions connect with socket.io to the `/terminal` namespace on `VITE_TERMINAL_URL`.

Endpoints the frontend uses:

| Area | Endpoints |
|---|---|
| Auth | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/wallet/challenge`, `/auth/wallet/login` |
| Workspaces | `/workspaces`, `/workspaces/:id`, `/workspaces/:id/start`, `/stop`, `/status`, `/heartbeat` |
| Files | `/workspaces/:id/files`, `/files/content`, `/files/rename`, `/directories` |
| Devnet | `/workspaces/:id/devnet`, `/devnet/start`, `/devnet/stop`, `/devnet/rpc`, `/devnet/accounts`, `/devnet/scripts`, `/nodes` |
| Contracts and deploys | `/workspaces/:id/contracts`, `/contracts/:name/binary`, `/deployments`, `/deployments/devnet`, `/molecule/generate` |
| Debugger | `/workspaces/:id/debug/run`, `/debug/tx`, `/debug/transactions` |
| AI | `/ai/status`, `/ai/chat` (server-sent events) |

The API gateway must implement these routes and allow the frontend's origin with credentials in its CORS settings.

## Deployment

Production is served at `https://corven.space` from the same AWS Lightsail instance as the backend, with Caddy serving the static build. The full guide is in the backend repository: [`docs/DEPLOYMENT.md`](https://github.com/corvenide/corven-backend-v2/blob/main/docs/DEPLOYMENT.md).

To release a new version, run this on the server:

```bash
cd /opt/corven/platform
bash deploy/deploy.sh
```

The script builds in a temporary Node container and publishes `dist/` to `/opt/corven/web`. It uses these build-time values, which you can override with environment variables:

| Variable | Default |
|---|---|
| `VITE_API_URL` | `https://staging-api.corvan.space/api` |
| `VITE_TERMINAL_URL` | `https://staging-api.corvan.space` |
| `WEB_ROOT` | `/opt/corven/web` |

`VITE_*` values are baked into the bundle, so changing them requires a rebuild.

## Notes

- `server.ts` still contains mock `/api/*` routes and a Gemini endpoint from the original prototype. The current UI talks to the Corven backend through `VITE_API_URL` and doesn't use them. `GEMINI_API_KEY` in `.env.example` only applies to those legacy routes.
- `actix-web/` is an unrelated Vercel Actix Web starter and is not part of the app.
- `layout.md` sketches the planned `src/` structure.

## Related repositories

- [corvenide/corven-backend-v2](https://github.com/corvenide/corven-backend-v2): NestJS microservices backend

# Project structure overview
Short summary of main packages in this monorepo.

## packages/client
- Vite + React frontend app (UI, lobby, game screens).
- Key files and directories:
  - [`packages/client/src/App.tsx`](packages/client/src/App.tsx:1)
  - [`packages/client/src/components/`](packages/client/src/components/:1)
  - [`packages/client/src/hooks/`](packages/client/src/hooks/:1)
  - [`packages/client/src/index.css`](packages/client/src/index.css:1)
  - [`packages/client/package.json`](packages/client/package.json:1)
  - tailwind config (if used): look for `tailwind.config.{js,ts}` in the package root.

## packages/shared
- Purpose: shared TypeScript types and event payload shapes used by client and server.
- Key file:
  - [`packages/shared/src/index.ts`](packages/shared/src/index.ts:1)
- Contains definitions for Game, GameAction, Titan, AppEvent, and related types.

## packages/server
- Purpose: WebSocket server, connection & lobby handlers, and authoritative game logic.
- Key files and folders:
  - [`packages/server/src/index.ts`](packages/server/src/index.ts:1)
  - [`packages/server/src/serverContext.ts`](packages/server/src/serverContext.ts:1)
  - [`packages/server/src/handlers/`](packages/server/src/handlers/:1)
  - [`packages/server/src/game.ts`](packages/server/src/game.ts:1)
  - [`packages/server/src/titans.ts`](packages/server/src/titans.ts:1)

## Interaction (high-level)
- Client ↔ Server: real-time events over WebSocket; payload shapes are defined in [`packages/shared/src/index.ts`](packages/shared/src/index.ts:1).
- Server maintains ephemeral per-game state (HP, special charge, round logs) and broadcasts a lightweight `game.meta` for clients to render current game view.

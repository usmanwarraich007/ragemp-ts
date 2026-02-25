---
description: ragemp-ts boilerplate — architecture overview and how to add new features
---

# ragemp-ts Boilerplate

## Project Layout

```
ragemp-ts/
├── rage-server-client/   # Server + client TypeScript (bundled with esbuild)
│   └── src/
│       ├── server/       # Node.js server code (RAGE:MP server-side)
│       │   ├── index.ts            # Entry point — imports core + features
│       │   ├── core/               # Shared server utilities
│       │   │   ├── logger.ts       # log.info / log.error / log.warn
│       │   │   ├── Command.ts      # @Command decorator
│       │   │   ├── Rpc.ts          # @Rpc decorator + rpc.callClient()
│       │   │   ├── playerStore.ts  # Per-player typed runtime data
│       │   │   ├── notify.ts       # notify(player).chat/screen helpers
│       │   │   └── index.ts        # Barrel — import everything from here
│       │   ├── database/
│       │   │   ├── data-source.ts  # TypeORM AppDataSource (register entities here)
│       │   │   ├── BaseEntity.ts   # Abstract base: id, createdAt, updatedAt
│       │   │   └── index.ts        # initDatabase() export
│       │   ├── features/
│       │   │   ├── index.ts        # Feature barrel — import new features here
│       │   │   └── auth/           # Example feature
│       │   │       ├── account.entity.ts
│       │   │       ├── character.entity.ts
│       │   │       └── auth.feature.ts
│       │   └── commands.ts         # Global dev/admin commands
│       └── client/       # Client-side script (runs inside RAGE:MP)
│           ├── index.ts            # Entry: creates browser, page relay events
│           ├── browser/            # BrowserManager — controls CEF lifecycle
│           └── hud/                # Client-side HUD relays
│
├── rage-cef/             # Vue 3 + Vite app rendered in the in-game browser
│   └── src/
│       ├── main.ts                 # Mounts Vue, initialises RageBridge
│       ├── App.vue                 # Root — persistent HUDs + page switcher
│       ├── core/
│       │   ├── RageBridge.ts       # RAGE:MP ↔ CEF communication layer
│       │   ├── EventBus.ts         # Internal typed event bus
│       │   └── rpc.ts              # rpc.callServer() for CEF → Server RPCs
│       └── modules/
│           ├── index.ts            # Module barrel — register pages here
│           ├── auth/               # Page: Auth.vue + index.ts
│           ├── character-select/   # Page: CharacterSelect.vue + index.ts
│           ├── notification/       # Persistent HUD overlay
│           └── speedometer/        # Persistent HUD overlay
│
└── rage-shared/          # Types shared across server, client, and CEF
    └── src/
        ├── index.ts                # Barrel — re-exports everything
        ├── rpc.ts                  # ServerRPCs + ClientRPCs interface
        ├── events.ts               # CefEventMap (typed server→CEF events)
        └── types/
            ├── PlayerData.ts       # AccountData, CharacterData, PlayerData
            └── auth.ts             # AuthResult, CharacterSummary
```

---

## Core Patterns

### 1. Logger
```ts
import { log } from '../core';
log.info('[Feature]', 'Something happened');
log.error('[Feature]', 'Something failed', err);
log.warn('[Feature]', 'Something suspicious');
```

### 2. Player Data Store
All per-player runtime state lives here. Automatically initialised on `playerJoin`, cleaned on `playerQuit`.
```ts
import { playerStore } from '../core';

const data = playerStore.get(player);     // → PlayerData
playerStore.patch(player, { isLoggedIn: true });
playerStore.set(player, 'account', { id: 1, username: 'foo', adminLevel: 0 });
```
To add new fields: extend `PlayerData` in `rage-shared/src/types/PlayerData.ts`.

### 3. @Command Decorator
```ts
import { Command } from '../core';

class VehicleCommands {
  @Command('veh', { usage: '/veh [model]', minArgs: 1 })
  static spawn(player: PlayerMp, model: string): void { ... }
}
```

### 4. @Rpc Decorator (Server ← CEF)
Register a server-side handler for a CEF → Server RPC call.
```ts
import { Rpc } from '../core';

class MyFeature {
  @Rpc('bank:deposit')
  static async deposit(player: PlayerMp, amount: number): Promise<{ success: boolean }> {
    return { success: true };
  }
}
void MyFeature; // prevents tree-shaking
```
**Always add the RPC signature to `rage-shared/src/rpc.ts` first:**
```ts
export interface ServerRPCs {
  'bank:deposit': (amount: number) => { success: boolean };
}
```

### 5. notify() — Player Notifications
```ts
import { notify } from '../core';

notify(player).chat.success('Done!');
notify(player).chat.error('Failed!');
notify(player).screen.info('Cruise Activated');
notify(player).screen.warning('You are wanted!', 6000); // custom ms
```

### 6. TypeORM Entities
**Critical:** esbuild bundles into a single file — **never use glob paths for entities**.

```ts
// data-source.ts — add every new entity explicitly
entities: [Account, Character, YourNewEntity],
```

Every entity must:
- Extend `BaseEntity` (provides id, createdAt, updatedAt)
- Have **explicit `type`** on every `@Column()` — esbuild strips metadata:
```ts
@Column({ type: 'varchar', length: 64 })  // ✅
@Column()                                  // ❌ will crash at runtime
```
- Import `'reflect-metadata'` at the top of the entity file

---

## How to Add a New Feature

### Server Feature

1. Create `src/server/features/your-feature/your-feature.ts`
2. Register it in `src/server/features/index.ts`:
```ts
import './your-feature/your-feature';
```
3. Use core utilities:
```ts
import { Rpc, playerStore, notify, log } from '../../core';
```

### New TypeORM Entity

1. Create `src/server/features/your-feature/thing.entity.ts`:
```ts
import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../database/BaseEntity';

@Entity('things')
export class Thing extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  value!: number;
}
```
2. Register in `data-source.ts`:
```ts
import { Thing } from '../features/your-feature/thing.entity';
entities: [..., Thing],
```

### New CEF Page

1. Create `rage-cef/src/modules/your-page/YourPage.vue`
2. Create `rage-cef/src/modules/your-page/index.ts`:
```ts
import { createModule } from '@/core';
import YourPage from './YourPage.vue';
createModule('your-page', YourPage);
```
3. Import in `rage-cef/src/modules/index.ts`:
```ts
import './your-page';
```
4. Show/hide from server via `player.call`:
```ts
player.call('cmd:showPage', ['your-page']); // show
player.call('cmd:hidePage', []);            // hide
```
5. Call server RPCs from your Vue component:
```ts
import { rpc } from '@/core';
const result = await rpc.callServer('your-rpc:name', arg1, arg2);
```

### New Client Script

Client scripts run inside the RAGE:MP game client (not CEF, not server).  
They handle native game events, read native APIs, and bridge data to CEF or server.

**Folder conventions:**
```
src/client/
├── index.ts          # Entry — import everything here
├── browser/          # BrowserManager (do not modify)
├── rpc/              # RPC bridge (do not modify)
├── hud/              # Scripts that push game state → CEF (e.g. speed, health)
├── vehicles/         # Vehicle-related client logic
└── world/            # World/blip/marker client logic
```

**Create a new client script:**

1. Create `src/client/your-domain/your-script.ts`
2. Import it in `src/client/index.ts`:
```ts
import './your-domain/your-script';
```

**Push data to CEF** (game → browser):
```ts
import { browserManager } from '../browser';

mp.events.add('render', () => {
  browserManager.emit('hud', 'setHealthData', { hp: mp.players.local.hp });
});
```
`browserManager.emit(target, name, payload)` maps to `CefEventMap['{target}:{name}']` in the CEF.

**Relay a server event to CEF:**
```ts
// Server calls player.call('my:event', [data])
// Client relays it to CEF:
mp.events.add('my:event', (data: MyType) => {
  browserManager.emit('ns', 'my:event', data);
});
```

**Tell the server something from the client:**
```ts
mp.events.callRemote('server:eventName', arg1, arg2);
```

**Key gotchas for client scripts:**
- `mp.players.local` — local player object (only available after `playerReady`)
- The `render` event fires every frame — always use delta checks to avoid flooding CEF
- Never `await` inside `render` — it fires 60+ times per second
- Properties like `player.position` are synchronous reads — snapshot them before any `await`


### New Shared RPC

Always declare in `rage-shared/src/rpc.ts` before implementing:
```ts
export interface ServerRPCs {
  'your-rpc:name': (arg1: string) => { success: boolean };
}
```

### New Shared Type

Add to `rage-shared/src/types/` and export from `rage-shared/src/index.ts`.

---

## Important Gotchas

| Gotcha | Fix |
|---|---|
| `Column type cannot be guessed` | Add explicit `type:` to every `@Column()` |
| `DataSource is not set for this entity` | Register the entity class in `data-source.ts` entities array |
| `Expired multiplayer object` in `playerQuit` | Snapshot `player.position.x/y/z`, `player.heading`, `player.dimension` **before** any `await` |
| Auth page not showing | Server `playerJoin` fires before CEF browser exists — wait for `client:browserReady` event |
| `playerQuit` cleanup race condition | Don't rely on `playerStore.get()` in `playerQuit` — playerStore cleans up first. Use a local `Map` keyed by `player.id` instead |
| Entity glob not working | esbuild bundles to one file — globs find nothing. Import entity classes directly |

---

## Build & Dev

```bash
pnpm build          # Build server + client + CEF
```

CEF dev server (hot reload):
```bash
cd rage-cef && pnpm dev
```

Test CEF events in browser console (`localhost:5173`):
```js
window.callHandler('system:setPage', JSON.stringify('auth'))
window.callHandler('notify:show', { type: 'success', message: 'Test', duration: 4000 })
```

The `synchronize: process.env.NODE_ENV !== 'production'` in `data-source.ts` auto-creates/updates tables in development.

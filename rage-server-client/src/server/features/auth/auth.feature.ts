import bcrypt from 'bcryptjs';
import { Rpc, playerStore, notify, log } from '../../core';
import { Account } from './account.entity';
import { Character } from './character.entity';
import { applyAppearance } from './ped';
import { syncPlayerWorld } from '../business/business.feature';
import { syncPlayerWorld as syncGarages } from '../garage/garage.feature';
import { vehicleManager } from '../vehicles/vehicle-manager.server';
import { findByCharacter } from '../vehicles/player-vehicle.service';
import type { AuthResult, CharacterSummary, CharacterAppearance } from '@ragemp/shared';

const MAX_CHARACTERS = 3;

// Default spawn position (Los Santos Medical Center)
const DEFAULT_SPAWN = { x: -248.77, y: -971.28, z: 31.22, heading: 0 };

// Local map: playerId → characterId
// Used in playerQuit to save position independently of playerStore cleanup order.
const activeCharacters = new Map<number, { characterId: number; name: string }>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSummary(c: Character): CharacterSummary {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    gender: c.gender,
    cash: c.cash,
    bank: c.bank,
    createdAt: c.createdAt.toISOString(),
    appearance: c.appearance ?? null,
  };
}

function showPage(player: PlayerMp, page: string): void {
  player.call('cmd:showPage', [page]);
}

function hidePage(player: PlayerMp): void {
  player.call('cmd:hidePage', []);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

// Sky holding position — player stays here during auth/character-select
const SKY_HOLD = { x: -2672.5713, y: 2500.6135, z: 184.9124 };

// On join: tell the client to freeze, hide, and mute the player.
// We send the sky position so the client can teleport itself — server-side
// position assignment alone may be overridden by the spawn system.
mp.events.add('playerJoin', (player: PlayerMp) => {
  player.call('cmd:holdInSky', [SKY_HOLD.x, SKY_HOLD.y, SKY_HOLD.z]);
});

// Fires once the client's CEF browser DOM is loaded and ready to receive events
mp.events.add('client:browserReady', (player: PlayerMp) => {
  const data = playerStore.get(player);
  if (!data?.isLoggedIn) {
    showPage(player, 'auth');
  }
});

mp.events.add('playerQuit', async (player: PlayerMp) => {
  const entry = activeCharacters.get(player.id);
  activeCharacters.delete(player.id);
  if (!entry) return; // player quit before selecting a character

  // Snapshot synchronously — player object expires after disconnect,
  // accessing it after an await throws "Expired multiplayer object".
  const posX = player.position.x;
  const posY = player.position.y;
  const posZ = player.position.z;
  const heading = player.heading;
  const dimension = player.dimension;

  try {
    await Character.update(entry.characterId, { posX, posY, posZ, heading, dimension });
    log.info('[Auth]', `Saved position for ${entry.name} (${posX.toFixed(1)}, ${posY.toFixed(1)}, ${posZ.toFixed(1)})`);
  } catch (err) {
    log.error('[Auth]', 'Failed to save character position on quit', err);
  }
});

// ── Auth RPCs ─────────────────────────────────────────────────────────────────

class AuthFeature {
  @Rpc('auth:login')
  static async login(player: PlayerMp, username: string, password: string): Promise<AuthResult> {
    try {
      const account = await Account.findOne({ where: { username } });
      if (!account) return { success: false, error: 'Account not found.' };

      const match = await bcrypt.compare(password, account.passwordHash);
      if (!match) return { success: false, error: 'Incorrect password.' };

      playerStore.patch(player, { account: { id: account.id, username, adminLevel: account.adminLevel } });
      log.info('[Auth]', `${username} logged in (id: ${player.id})`);

      showPage(player, 'character-select');
      return { success: true };
    } catch (err) {
      log.error('[Auth]', 'Login error', err);
      return { success: false, error: 'Server error. Try again.' };
    }
  }

  @Rpc('auth:register')
  static async register(player: PlayerMp, username: string, password: string, email: string): Promise<AuthResult> {
    try {
      if (username.length < 3 || username.length > 32)
        return { success: false, error: 'Username must be 3–32 characters.' };
      if (password.length < 6)
        return { success: false, error: 'Password must be at least 6 characters.' };

      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_RE.test(email))
        return { success: false, error: 'Invalid email address.' };

      const existsByName = await Account.findOne({ where: { username } });
      if (existsByName) return { success: false, error: 'Username already taken.' };

      const existsByEmail = await Account.findOne({ where: { email } });
      if (existsByEmail) return { success: false, error: 'Email address already in use.' };

      const passwordHash = await bcrypt.hash(password, 10);
      const account = Account.create({ username, email, passwordHash });
      await account.save();

      playerStore.patch(player, { account: { id: account.id, username, adminLevel: 0 } });
      log.info('[Auth]', `${username} registered (id: ${player.id})`);

      showPage(player, 'character-select');
      return { success: true };
    } catch (err) {
      log.error('[Auth]', 'Registration error', err);
      return { success: false, error: 'Server error. Try again.' };
    }
  }

  // ── Character RPCs ──────────────────────────────────────────────────────────

  @Rpc('character:getList')
  static async getList(player: PlayerMp): Promise<CharacterSummary[]> {
    const data = playerStore.get(player);
    if (!data?.account) return [];

    const characters = await Character.find({ where: { accountId: data.account.id } });
    return characters.map(toSummary);
  }

  @Rpc('character:create')
  static async create(
    player: PlayerMp,
    firstName: string,
    lastName: string,
    gender: 'male' | 'female',
    appearance: CharacterAppearance,
  ): Promise<CharacterSummary> {
    const data = playerStore.get(player);
    if (!data?.account) throw new Error('Not authenticated.');

    const existing = await Character.count({ where: { accountId: data.account.id } });
    if (existing >= MAX_CHARACTERS) throw new Error(`Maximum ${MAX_CHARACTERS} characters allowed.`);

    const character = Character.create({
      accountId: data.account.id,
      firstName,
      lastName,
      gender,
      appearance,
      posX: DEFAULT_SPAWN.x,
      posY: DEFAULT_SPAWN.y,
      posZ: DEFAULT_SPAWN.z,
      heading: DEFAULT_SPAWN.heading,
    });
    await character.save();

    log.info('[Auth]', `Character created: ${firstName} ${lastName} for ${data.account.username}`);
    return toSummary(character);
  }

  @Rpc('character:saveAppearance')
  static async saveAppearance(
    player: PlayerMp,
    characterId: number,
    appearance: CharacterAppearance,
  ): Promise<AuthResult> {
    const data = playerStore.get(player);
    if (!data?.account) return { success: false, error: 'Not authenticated.' };

    const character = await Character.findOne({
      where: { id: characterId, accountId: data.account.id },
    });
    if (!character) return { success: false, error: 'Character not found.' };

    await Character.update(characterId, { appearance });
    log.info('[Auth]', `Appearance saved for character ${characterId}`);
    return { success: true };
  }

  @Rpc('character:select')
  static async select(player: PlayerMp, characterId: number): Promise<AuthResult> {
    const data = playerStore.get(player);
    if (!data?.account) return { success: false, error: 'Not authenticated.' };

    const character = await Character.findOne({
      where: { id: characterId, accountId: data.account.id },
    });
    if (!character) return { success: false, error: 'Character not found.' };

    // Store in player data + local tracking map
    const charName = `${character.firstName} ${character.lastName}`;
    playerStore.patch(player, {
      character: {
        id: character.id,
        name: charName,
        cash: character.cash,
        bank: character.bank,
        job: character.job,
        factionId: null,
        radioChannel: null,
      },
      isLoggedIn: true,
    });
    activeCharacters.set(player.id, { characterId: character.id, name: charName });

    // Spawn player at last saved position (or default if new)
    const isNewSpawn = character.posX === 0 && character.posY === 0;
    const spawnX = isNewSpawn ? DEFAULT_SPAWN.x : character.posX;
    const spawnY = isNewSpawn ? DEFAULT_SPAWN.y : character.posY;
    const spawnZ = isNewSpawn ? DEFAULT_SPAWN.z : character.posZ;
    player.position = new mp.Vector3(spawnX, spawnY, spawnZ);
    player.heading = character.heading;
    player.dimension = character.dimension;

    hidePage(player);
    notify(player).screen.success(`Welcome, ${character.firstName}!`);
    log.info('[Auth]', `${data.account.username} selected: ${character.firstName} ${character.lastName}`);

    // Apply saved appearance — called server-side so RAGE:MP syncs it to all
    // players who stream this ped. (player.call() would only apply locally.)
    if (character.appearance) {
      applyAppearance(player, character.appearance);
    }


    // Tell client who the local character is (used for ownership checks)
    player.call('character:setId', [character.id]);

    // Sync world data to the newly spawned character
    void syncPlayerWorld(player);
    void syncGarages(player);

    // ── Auto-spawn unparked vehicles ────────────────────────────────────────
    // Any vehicle with isParked=false was left on the map before disconnect.
    // Respawn it at its last saved position so the world stays consistent.
    void (async () => {
      try {
        const vehicles = await findByCharacter(character.id);
        let spawned = 0;
        for (const v of vehicles) {
          if (v.state !== 'SPAWNED') continue;              // only re-spawn vehicles left on the map
          if (vehicleManager.getRuntime(v.id) !== null) continue; // already live (shouldn't happen)
          if (v.parkedX === 0 && v.parkedY === 0) continue; // no saved position yet
          // Await each spawn so setVariable calls finish before the next vehicle is created.
          // Without await the spawns overlap and entityStreamIn fires before variables are set.
          const runtime = await vehicleManager.spawn(v.id, { x: v.parkedX, y: v.parkedY, z: v.parkedZ, heading: v.parkedHeading });
          if (runtime) {
            // Re-apply visuals after a short delay so GTA has fully loaded the vehicle entity.
            // Same pattern used by garage.feature.ts to handle the stream-in race.
            player.call('vehicle:applyVisuals', [runtime.mp.id]);
          }
          spawned++;
        }
        if (spawned > 0) {
          log.info('[Auth]', `Auto-spawned ${spawned} vehicle(s) for ${charName}`);
        }
      } catch (err) {
        log.error('[Auth]', 'Failed to auto-spawn vehicles for character', err);
      }
    })();

    return { success: true };
  }
}

void AuthFeature;

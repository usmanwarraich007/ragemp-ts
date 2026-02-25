/**
 * camera/manager.ts — Global named-camera registry.
 *
 * Any feature (character creator, barbershop, tattoo shop, …) creates a named
 * camera here and activates it. The render loop in renderLoop.ts updates the
 * active camera's position/look-target every frame.
 *
 * Usage:
 *   cameraManager.create('my-feature', pos, rot, fov);
 *   cameraManager.activate('my-feature', true, 300); // ease in
 *   // … feature runs …
 *   cameraManager.destroy('my-feature');             // ease out + cleanup
 */

class CameraManager {
  private readonly cameras = new Map<string, CameraMp>();
  private _activeName: string | null = null;
  private scriptActive = false;

  // ── Create / destroy ───────────────────────────────────────────────────────

  /** Create and register a named scripted camera. */
  create(name: string, pos: mp.Vector3, rot: mp.Vector3, fov = 50): CameraMp {
    // Destroy any existing camera with this name first
    this.destroy(name);
    const cam = mp.cameras.new('DEFAULT_SCRIPTED_CAMERA', pos, rot, fov);
    this.cameras.set(name, cam);
    return cam;
  }

  /** Deactivate and destroy a named camera. */
  destroy(name: string, ease = false, easeMs = 0): void {
    const cam = this.cameras.get(name);
    if (!cam) return;
    if (this._activeName === name) {
      this.deactivate(ease, easeMs);
    }
    if (mp.cameras.exists(cam) && (cam as any).doesExist()) {
      cam.destroy();
    }
    this.cameras.delete(name);
  }

  // ── Activate / deactivate ─────────────────────────────────────────────────

  /** Make a named camera the active scripted camera. */
  activate(name: string, ease = false, easeMs = 300): void {
    const cam = this.cameras.get(name);
    if (!cam) return;

    // Deactivate previous camera if different
    if (this._activeName && this._activeName !== name) {
      this.cameras.get(this._activeName)?.setActive(false);
    }

    cam.setActive(true);
    this._activeName = name;

    if (!this.scriptActive) {
      mp.game.cam.renderScriptCams(true, ease, ease ? easeMs : 0, true, false);
      this.scriptActive = true;
    }
  }

  /** Stop scripted camera mode and return to gameplay camera. */
  deactivate(ease = true, easeMs = 300): void {
    if (this._activeName) {
      this.cameras.get(this._activeName)?.setActive(false);
      this._activeName = null;
    }
    if (this.scriptActive) {
      mp.game.cam.renderScriptCams(false, ease, easeMs, true, false);
      this.scriptActive = false;
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get activeCamera(): CameraMp | null {
    return this._activeName ? (this.cameras.get(this._activeName) ?? null) : null;
  }

  get activeName(): string | null {
    return this._activeName;
  }

  isActive(): boolean {
    return this.scriptActive;
  }
}

export const cameraManager = new CameraManager();

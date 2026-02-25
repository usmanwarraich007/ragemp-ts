/**
 * MarkerSystem.ts — Standalone client-side world marker renderer.
 *
 * Completely separate from InteractableRegistry.
 * Markers are purely visual — no targeting, no menu, no input.
 *
 * Features:
 *  - Visible from far away (visibleRadius, typically 20–50 m)
 *  - Single render loop shared by all markers (one mp.events.add)
 *  - Optional animation (bobUpDown, rotate, faceCamera)
 *  - Optional height offset (useful when combining with a marker at ground level)
 *
 * Typical usage with InteractableRegistry:
 *   markerSystem.register({ id: 'store-01', position, type: 1, … })       // visual
 *   registry.register({ id: 'store-01', interactRadius: 1.5, … })          // menu
 */

// ── Marker definition ──────────────────────────────────────────────────────

export interface WorldMarker {
  /**
   * Globally unique ID — use the same value as the paired WorldInteractable
   * so features can link them logically.
   */
  readonly id: string;

  /**
   * GTA V marker type.
   * Common values:
   *   0  = Upward arrow cylinder          (entry marker)
   *   1  = Thick rotating ring/arrows     (interaction spot, reference blue circle)
   *   2  = Thin rotating circle
   *   20 = Horizontal flat cylinder       (zone indicator)
   *   21 = Flag pole
   *   23 = Upward-pointing plane
   *   25 = Car icon
   *   27 = Ghost (faint ring)
   *   28 = Sphere (debug / bone marker)
   *   29 = Money bag
   *   36 = Small ring (tight interaction)
   *   40 = Horizontal ring (flat)
   *   42 = Horizontal ring with arrows
   *   43 = Horizontal ring with arrows (alt)
   *   45 = Horizontal ring (thinner)
   */
  type: number;

  /** World-space position of the marker center. */
  position: Vector3;

  /** Marker colour. Alpha controls opacity (80–200 is typical). */
  color: [r: number, g: number, b: number, a: number];

  /**
   * Uniform scale (metres).
   * For entry markers: 1.0–2.0. For bone spheres: 0.05–0.15.
   */
  scale: number;

  /**
   * Draw marker within this many metres of the player.
   * Set large for prominent landmarks (40 m), small for tight props (8 m).
   * Default: 30 m.
   */
  visibleRadius?: number;

  /**
   * Y offset applied on top of position.z (moves marker up/down).
   * Useful to sink a flat ring into the floor or raise a sphere off a surface.
   * Default: 0.
   */
  heightOffset?: number;

  /** Animate the marker bobbing up and down. Default: false. */
  bobUpDown?: boolean;

  /** Rotate the marker around the Z axis. Default: false. */
  rotate?: boolean;

  /** Always face the camera (useful for flat icons). Default: false. */
  faceCamera?: boolean;
}

// ── Registry ───────────────────────────────────────────────────────────────

class MarkerSystemClass {
  private readonly markers = new Map<string, WorldMarker>();

  constructor() {
    mp.events.add('render', () => this.onRender());
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Add a world marker.
   *
   * @example
   * markerSystem.register({
   *   id:            'store-market-01',
   *   type:          1,
   *   position:      new mp.Vector3(x, y, z),
   *   color:         [80, 200, 255, 160],
   *   scale:         1.5,
   *   visibleRadius: 40,
   *   bobUpDown:     false,
   *   rotate:        true,
   * });
   */
  register(marker: WorldMarker): void {
    this.markers.set(marker.id, marker);
  }

  /** Remove a marker. Safe to call even if id was never registered. */
  unregister(id: string): void {
    this.markers.delete(id);
  }

  // ── Render loop ───────────────────────────────────────────────────────────

  private onRender(): void {
    const player = mp.players.local;
    if (!player?.handle) return;

    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;

    for (const m of this.markers.values()) {
      const radius = m.visibleRadius ?? 30;
      const dist   = mp.game.system.vdist(px, py, pz, m.position.x, m.position.y, m.position.z);
      if (dist > radius) continue;

      const mz = m.position.z + (m.heightOffset ?? 0);

      mp.game.graphics.drawMarker(
        m.type,
        m.position.x, m.position.y, mz,
        // direction (always 0 for default orientation)
        0, 0, 0,
        // rotation
        0, 0, 0,
        // scale (uniform)
        m.scale, m.scale, m.scale,
        // color
        m.color[0], m.color[1], m.color[2], m.color[3],
        m.bobUpDown  ?? false,
        m.faceCamera ?? false,
        2,           // always-on-top priority
        m.rotate     ?? false,
        null, null,
        false,
      );
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const markerSystem = new MarkerSystemClass();

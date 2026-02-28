import type { CharacterAppearance } from '@ragemp/shared';

/**
 * applyAppearance — server-side version.
 *
 * Uses the server-side PlayerMp API (different method names from client-side).
 * When called on the SERVER, RAGE:MP automatically replicates these changes to
 * every player who streams this ped — appearance syncs to all without any
 * manual broadcasting.
 *
 * Client-side ped.ts is kept for live preview during character creation only.
 */
export function applyAppearance(p: PlayerMp, a: CharacterAppearance): void {
  // ── Heritage / head blend ─────────────────────────────────────────────────
  // setHeadBlend on the server takes 9 args (no hasFaceBlending param)
  p.setHeadBlend(
    a.shapeFirst, a.shapeSecond, a.shapeThird,
    a.skinFirst,  a.skinSecond,  a.skinThird,
    a.shapeMix,   a.skinMix,     a.thirdMix,
  );

  // ── Face features (0–19) ──────────────────────────────────────────────────
  const ff = a.faceFeatures;
  [
    ff.noseWidth, ff.noseHeight, ff.noseLength, ff.noseBridge, ff.noseTip, ff.noseBridgeShift,
    ff.browHeight, ff.browWidth,
    ff.cheekboneHeight, ff.cheekboneWidth, ff.cheeksWidth,
    ff.eyes, ff.lips,
    ff.jawWidth, ff.jawHeight,
    ff.chinLength, ff.chinPosition, ff.chinWidth, ff.chinShape,
    ff.neckWidth,
  ].forEach((val, i) => p.setFaceFeature(i, val));

  // ── Eye color — server exposes as a property ──────────────────────────────
  p.eyeColor = a.eyeColor;

  // ── Hair (slot 2 component) + color ───────────────────────────────────────
  p.setClothes(2, a.hairStyle, a.hairStyleTexture, 0);
  p.setHairColor(a.hairColor, a.hairHighlightColor);

  // ── Head overlays (slots 0–12) ────────────────────────────────────────────
  // Server setHeadOverlay takes (slot, Array4d) = [index, opacity, color, secondColor]
  for (let slot = 0; slot <= 12; slot++) {
    const ov = a.overlays[slot];
    if (!ov || ov.index === -1) {
      p.setHeadOverlay(slot, [255, 1.0, 0, 0]);
    } else {
      p.setHeadOverlay(slot, [ov.index, ov.opacity, ov.color, ov.secondColor]);
    }
  }

  // ── Clothing components ───────────────────────────────────────────────────
  // Server: setClothes(component, drawable, texture, palette)
  p.setClothes(0,  a.head,        a.headTex,        0);
  p.setClothes(1,  a.mask,        a.maskTex,        0);
  p.setClothes(3,  a.torso,       a.torsoTex,       0);
  p.setClothes(4,  a.legs,        a.legsTex,        0);
  p.setClothes(6,  a.shoes,       a.shoesTex,       0);
  p.setClothes(7,  a.accessories, a.accessoriesTex, 0);
  p.setClothes(8,  a.undershirt,  a.undershirtTex,  0);
  p.setClothes(10, a.decals,      a.decalsTex,      0);
  p.setClothes(11, a.tops,        a.topsTex,        0);

  // ── Props ─────────────────────────────────────────────────────────────────
  // Server: setProp(slot, drawable, texture) — -1 drawable = clear/none
  const setProp = (slot: number, draw: number, tex: number) =>
    p.setProp(slot, draw === -1 ? 0 : draw, draw === -1 ? 0 : tex);

  setProp(0, a.hat,          a.hatTex);
  setProp(1, a.glasses,      a.glassesTex);
  setProp(2, a.earAccessory, a.earTex);
  setProp(6, a.watch,        a.watchTex);
  setProp(7, a.bracelet,     a.braceletTex);

  // ── Tattoos ───────────────────────────────────────────────────────────────
  // Server: clearDecorations() + setDecoration(collectionHash, overlayHash)
  p.clearDecorations();
  for (const tattoo of a.tattoos) {
    const colHash = mp.joaat(tattoo.collection);
    const ovHash  = mp.joaat(tattoo.overlay);
    p.setDecoration(colHash, ovHash);
  }
}

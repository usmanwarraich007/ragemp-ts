import type { CharacterAppearance } from '@ragemp/shared';

/**
 * applyAppearance — translates a CharacterAppearance object into
 * native RAGE:MP / GTA V ped API calls on the given player.
 */
export function applyAppearance(p: PlayerMp, a: CharacterAppearance): void {
  // ── Heritage / head blend ─────────────────────────────────────────────────
  p.setHeadBlendData(
    a.shapeFirst, a.shapeSecond, a.shapeThird,
    a.skinFirst,  a.skinSecond,  a.skinThird,
    a.shapeMix,   a.skinMix,     a.thirdMix,
    false,
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

  // ── Eye color ─────────────────────────────────────────────────────────────
  p.setEyeColor(a.eyeColor);

  // ── Hair (component slot 2) + color ───────────────────────────────────────
  p.setComponentVariation(2, a.hairStyle, a.hairStyleTexture, 0);
  p.setHairColor(a.hairColor, a.hairHighlightColor);

  // ── Head overlays (slots 0–12) ────────────────────────────────────────────
  for (let slot = 0; slot <= 12; slot++) {
    const ov = a.overlays[slot];
    if (!ov || ov.index === -1) {
      p.setHeadOverlay(slot, 255, 1.0, 0, 0);
    } else {
      p.setHeadOverlay(slot, ov.index, ov.opacity, ov.color, ov.secondColor);
      if (ov.colorType > 0) {
        p.setHeadOverlayColor(slot, ov.colorType, ov.color, ov.secondColor);
      }
    }
  }

  // ── Clothing components ───────────────────────────────────────────────────
  p.setComponentVariation(0,  a.head,        a.headTex,        0);
  p.setComponentVariation(1,  a.mask,        a.maskTex,        0);
  p.setComponentVariation(3,  a.torso,       a.torsoTex,       0);
  p.setComponentVariation(4,  a.legs,        a.legsTex,        0);
  p.setComponentVariation(6,  a.shoes,       a.shoesTex,       0);
  p.setComponentVariation(7,  a.accessories, a.accessoriesTex, 0);
  p.setComponentVariation(8,  a.undershirt,  a.undershirtTex,  0);
  p.setComponentVariation(10, a.decals,      a.decalsTex,      0);
  p.setComponentVariation(11, a.tops,        a.topsTex,        0);

  // ── Props ─────────────────────────────────────────────────────────────────
  const setProp = (slot: number, draw: number, tex: number) => {
    if (draw === -1) p.clearProp(slot);
    else             p.setPropIndex(slot, draw, tex, true);
  };
  setProp(0, a.hat,          a.hatTex);
  setProp(1, a.glasses,      a.glassesTex);
  setProp(2, a.earAccessory, a.earTex);
  setProp(6, a.watch,        a.watchTex);
  setProp(7, a.bracelet,     a.braceletTex);

  // ── Tattoos ───────────────────────────────────────────────────────────────
  // clearDecorations is exposed by RAGE:MP; addDecoration is not — call it via invoke.
  p.clearDecorations();
  for (const tattoo of a.tattoos) {
    const colHash = mp.game.misc.getHashKey(tattoo.collection);
    const ovHash  = mp.game.misc.getHashKey(tattoo.overlay);
    mp.game.invoke('0x5F5D1665E352A839', p.handle, colHash, ovHash); // ADD_PED_DECORATION_FROM_HASHES
  }
}

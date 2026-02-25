/**
 * Shared types for the auth + character system.
 * Imported by both CEF and server.
 */

export interface AuthResult {
  success: boolean;
  error?: string;
}

// ── Character Appearance ──────────────────────────────────────────────────────

export interface HeadOverlay {
  index: number;       // style index (-1 = off)
  opacity: number;     // 0–1
  colorType: number;   // 0=none,1=hair,2=makeup
  color: number;       // primary swatch
  secondColor: number; // highlight swatch
}

/** Face feature sliders — indices match GTA V setFaceFeature(index, value) */
export interface FaceFeatures {
  noseWidth: number;         // 0
  noseHeight: number;        // 1
  noseLength: number;        // 2
  noseBridge: number;        // 3
  noseTip: number;           // 4
  noseBridgeShift: number;   // 5
  browHeight: number;        // 6
  browWidth: number;         // 7
  cheekboneHeight: number;   // 8
  cheekboneWidth: number;    // 9
  cheeksWidth: number;       // 10
  eyes: number;              // 11
  lips: number;              // 12
  jawWidth: number;          // 13
  jawHeight: number;         // 14
  chinLength: number;        // 15
  chinPosition: number;      // 16
  chinWidth: number;         // 17
  chinShape: number;         // 18
  neckWidth: number;         // 19
}

export interface CharacterAppearance {
  // ── Heritage / Genetics ─────────────────────────────────
  shapeFirst: number;         // mother face index 0–45
  shapeSecond: number;        // father face index 0–45
  shapeThird: number;         // extra face index 0–45
  skinFirst: number;          // mother skin tone 0–45
  skinSecond: number;         // father skin tone 0–45
  skinThird: number;          // extra skin tone 0–45
  shapeMix: number;           // 0–1 (mother→father)
  skinMix: number;            // 0–1
  thirdMix: number;           // 0–1

  // ── Face Features ───────────────────────────────────────
  faceFeatures: FaceFeatures;

  // ── Colors ──────────────────────────────────────────────
  eyeColor: number;           // 0–31
  hairColor: number;          // hair swatch 0–63
  hairHighlightColor: number;

  // ── Hair component ──────────────────────────────────────
  hairStyle: number;
  hairStyleTexture: number;

  // ── Head Overlays (slots 0–12) ──────────────────────────
  // key = overlay slot number
  overlays: Record<number, HeadOverlay>;

  // ── Clothing Components ─────────────────────────────────
  head: number;          headTex: number;        // slot 0
  mask: number;          maskTex: number;        // slot 1
  // slot 2 = hair (hairStyle above)
  torso: number;         torsoTex: number;       // slot 3
  legs: number;          legsTex: number;        // slot 4
  // slot 5 = bags — skipped
  shoes: number;         shoesTex: number;       // slot 6
  accessories: number;   accessoriesTex: number; // slot 7
  undershirt: number;    undershirtTex: number;  // slot 8
  // slot 9 = body armor — skipped
  decals: number;        decalsTex: number;      // slot 10
  tops: number;          topsTex: number;        // slot 11

  // ── Props ───────────────────────────────────────────────
  hat: number;           hatTex: number;         // prop 0
  glasses: number;       glassesTex: number;     // prop 1
  earAccessory: number;  earTex: number;         // prop 2
  watch: number;         watchTex: number;       // prop 6
  bracelet: number;      braceletTex: number;    // prop 7

  // ── Tattoos ─────────────────────────────────────────────
  tattoos: TattooEntry[];
}

export interface TattooEntry {
  zone: 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';
  collection: string; // DLC collection hash string
  overlay: string;    // overlay hash string
}

export function defaultAppearance(gender: 'male' | 'female'): CharacterAppearance {
  const isMale = gender === 'male';
  const blankOverlay: HeadOverlay = { index: -1, opacity: 0, colorType: 0, color: 0, secondColor: 0 };
  return {
    shapeFirst: isMale ? 0 : 31, shapeSecond: isMale ? 0 : 31, shapeThird: isMale ? 0 : 31,
    skinFirst: isMale ? 0 : 31,  skinSecond: isMale ? 0 : 31,  skinThird: isMale ? 0 : 31,
    shapeMix: 0.5, skinMix: 0.5, thirdMix: 0,
    faceFeatures: {
      noseWidth: 0, noseHeight: 0, noseLength: 0, noseBridge: 0, noseTip: 0, noseBridgeShift: 0,
      browHeight: 0, browWidth: 0, cheekboneHeight: 0, cheekboneWidth: 0, cheeksWidth: 0,
      eyes: 0, lips: 0, jawWidth: 0, jawHeight: 0, chinLength: 0, chinPosition: 0,
      chinWidth: 0, chinShape: 0, neckWidth: 0,
    },
    eyeColor: 0, hairColor: 0, hairHighlightColor: 0,
    hairStyle: 0, hairStyleTexture: 0,
    overlays: {
      0: { ...blankOverlay }, 1: { ...blankOverlay }, 2: { ...blankOverlay, index: 0, opacity: 1, colorType: 1 },
      3: { ...blankOverlay }, 4: { ...blankOverlay }, 5: { ...blankOverlay },
      6: { ...blankOverlay }, 7: { ...blankOverlay }, 8: { ...blankOverlay },
      9: { ...blankOverlay }, 10: { ...blankOverlay }, 11: { ...blankOverlay }, 12: { ...blankOverlay },
    },
    head: 0, headTex: 0,
    mask: 0, maskTex: 0,
    torso: 0, torsoTex: 0,
    legs: 0, legsTex: 0,
    shoes: 0, shoesTex: 0,
    accessories: 0, accessoriesTex: 0,
    undershirt: 0, undershirtTex: 0,
    decals: 0, decalsTex: 0,
    tops: 0, topsTex: 0,
    hat: -1, hatTex: 0,
    glasses: -1, glassesTex: 0,
    earAccessory: -1, earTex: 0,
    watch: -1, watchTex: 0,
    bracelet: -1, braceletTex: 0,
    tattoos: [],
  };
}

// ── Character list ────────────────────────────────────────────────────────────

export interface CharacterSummary {
  id: number;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  cash: number;
  createdAt: string;
  appearance: CharacterAppearance | null;
}

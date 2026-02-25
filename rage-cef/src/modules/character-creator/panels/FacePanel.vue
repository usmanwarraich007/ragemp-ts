<template>
  <!-- Heritage ────────────────────────────────────────────────────────────── -->
  <CcSection title="Heritage" desc="Adjust shape and skin genetics" :defaultOpen="true">
    <SliderRow v-for="h in HERITAGE" :key="h.key" :label="h.label"
      :min="h.min" :max="h.max" :step="h.step"
      :modelValue="(app as any)[h.key]"
      @update:modelValue="(v: number) => { (app as any)[h.key] = v; preview(); }" />
  </CcSection>

  <!-- Facial Features ─────────────────────────────────────────────────────── -->
  <CcSection title="Facial Features" desc="Fine-tune nose, jaw, chin and more">
    <SliderRow v-for="ff in FACE_FEATURES" :key="ff.key" :label="ff.label"
      :min="-1" :max="1" :step="0.01"
      :modelValue="(app.faceFeatures as any)[ff.key]"
      @update:modelValue="(v: number) => { (app.faceFeatures as any)[ff.key] = v; preview(); }" />
  </CcSection>

  <!-- Eye Color ───────────────────────────────────────────────────────────── -->
  <CcSection title="Eye Colour">
    <div class="swatch-grid">
      <button v-for="n in 32" :key="n" :class="['sw', { active: app.eyeColor === n - 1 }]"
        :style="{ background: EYE_COLORS[n - 1] }" @click="app.eyeColor = n - 1; preview()" />
    </div>
  </CcSection>

  <!-- Hair ────────────────────────────────────────────────────────────────── -->
  <CcSection title="Hair Style" desc="Hairstyle, colour and highlight" :defaultOpen="true">
    <div class="item-grid">
      <button v-for="idx in pagedItems('hairStyle', 74)" :key="idx"
        :class="['item-card', { active: app.hairStyle === idx }]"
        @click="app.hairStyle = idx; preview()">{{ idx }}</button>
    </div>
    <div class="pager">
      <button @click="prevPage('hairStyle')" :disabled="(pages['hairStyle'] ?? 0) === 0">‹</button>
      <span>{{ (pages['hairStyle'] ?? 0) + 1 }} / {{ pageCount(74) }}</span>
      <button @click="nextPage('hairStyle', 74)">›</button>
    </div>
    <div class="group-sep">Hair Colour</div>
    <div class="swatch-grid">
      <button v-for="n in 64" :key="n" :class="['sw', { active: app.hairColor === n - 1 }]"
        :style="{ background: HAIR_COLORS[n - 1] }" @click="app.hairColor = n - 1; preview()" />
    </div>
    <div class="group-sep">Highlight Colour</div>
    <div class="swatch-grid">
      <button v-for="n in 64" :key="n" :class="['sw', { active: app.hairHighlightColor === n - 1 }]"
        :style="{ background: HAIR_COLORS[n - 1] }" @click="app.hairHighlightColor = n - 1; preview()" />
    </div>
  </CcSection>

  <!-- Facial overlays (eyebrows, facial hair, blemishes, ageing) ─────────── -->
  <CcSection v-for="ov in FACE_OVERLAYS" :key="ov.slot" :title="ov.label">
    <div class="ov-toggle">
      <span class="ov-lbl">Enable</span>
      <label class="toggle">
        <input type="checkbox" :checked="app.overlays[ov.slot].index !== -1"
          @change="toggleOverlay(ov.slot, ($event.target as HTMLInputElement).checked)" />
        <span class="track" />
      </label>
    </div>
    <template v-if="app.overlays[ov.slot].index !== -1">
      <SliderRow label="Style"   :min="0" :max="ov.max" :step="1"    :modelValue="app.overlays[ov.slot].index"
        @update:modelValue="(v: number) => { app.overlays[ov.slot].index = v; preview(); }" />
      <SliderRow label="Opacity" :min="0" :max="1"      :step="0.01" :modelValue="app.overlays[ov.slot].opacity"
        @update:modelValue="(v: number) => { app.overlays[ov.slot].opacity = v; preview(); }" />
      <div v-if="ov.colorType > 0">
        <div class="group-sep">Colour</div>
        <div class="swatch-grid">
          <button v-for="n in (ov.colorType === 1 ? 64 : 32)" :key="n"
            :class="['sw', { active: app.overlays[ov.slot].color === n - 1 }]"
            :style="{ background: ov.colorType === 1 ? HAIR_COLORS[n - 1] : MAKEUP_COLORS[n - 1] }"
            @click="app.overlays[ov.slot].color = n - 1; preview()" />
        </div>
      </div>
    </template>
  </CcSection>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { APP_KEY, PREVIEW_KEY, TOGGLE_OVERLAY_KEY } from '../injectionKeys';
import { usePagination } from '../usePagination';
import { HAIR_COLORS, MAKEUP_COLORS, EYE_COLORS } from '../constants';
import CcSection from '../CcSection.vue';
import SliderRow from '../SliderRow.vue';

const app           = inject(APP_KEY)!;
const preview       = inject(PREVIEW_KEY)!;
const toggleOverlay = inject(TOGGLE_OVERLAY_KEY)!;

const { pages, pageCount, pagedItems, prevPage, nextPage } = usePagination();

// ── Heritage sliders ──────────────────────────────────────────────────────────
const HERITAGE = [
  { key: 'shapeFirst',  label: 'Mother Shape', min: 0, max: 45, step: 1 },
  { key: 'shapeSecond', label: 'Father Shape',  min: 0, max: 45, step: 1 },
  { key: 'shapeThird',  label: 'Extra Shape',   min: 0, max: 45, step: 1 },
  { key: 'skinFirst',   label: 'Mother Skin',   min: 0, max: 45, step: 1 },
  { key: 'skinSecond',  label: 'Father Skin',   min: 0, max: 45, step: 1 },
  { key: 'skinThird',   label: 'Extra Skin',    min: 0, max: 45, step: 1 },
  { key: 'shapeMix',    label: 'Shape Mix',     min: 0, max: 1,  step: 0.01 },
  { key: 'skinMix',     label: 'Skin Mix',      min: 0, max: 1,  step: 0.01 },
  { key: 'thirdMix',    label: 'Third Mix',     min: 0, max: 1,  step: 0.01 },
];

// ── Facial feature sliders ────────────────────────────────────────────────────
const FACE_FEATURES = [
  { key: 'noseWidth',       label: 'Nose Width'        },
  { key: 'noseHeight',      label: 'Nose Height'       },
  { key: 'noseLength',      label: 'Nose Length'       },
  { key: 'noseBridge',      label: 'Nose Bridge'       },
  { key: 'noseTip',         label: 'Nose Tip'          },
  { key: 'noseBridgeShift', label: 'Bridge Shift'      },
  { key: 'browHeight',      label: 'Brow Height'       },
  { key: 'browWidth',       label: 'Brow Width'        },
  { key: 'cheekboneHeight', label: 'Cheekbone Height'  },
  { key: 'cheekboneWidth',  label: 'Cheekbone Width'   },
  { key: 'cheeksWidth',     label: 'Cheeks Width'      },
  { key: 'eyes',            label: 'Eyes'              },
  { key: 'lips',            label: 'Lips'              },
  { key: 'jawWidth',        label: 'Jaw Width'         },
  { key: 'jawHeight',       label: 'Jaw Height'        },
  { key: 'chinLength',      label: 'Chin Length'       },
  { key: 'chinPosition',    label: 'Chin Position'     },
  { key: 'chinWidth',       label: 'Chin Width'        },
  { key: 'chinShape',       label: 'Chin Shape'        },
  { key: 'neckWidth',       label: 'Neck Width'        },
];

// ── Facial overlays: slots shown in FacePanel ─────────────────────────────────
// Slots 0–3 (blemishes, facial hair, eyebrows, ageing) — face-specific
const FACE_OVERLAYS = [
  { slot: 0, label: 'Blemishes',    max: 23, colorType: 0 },
  { slot: 1, label: 'Facial Hair',  max: 28, colorType: 1 },
  { slot: 2, label: 'Eyebrows',     max: 33, colorType: 1 },
  { slot: 3, label: 'Ageing',       max: 14, colorType: 0 },
];
</script>

<style scoped>
/* Item grid */
.item-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.item-card { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s; }
.item-card:hover  { background: rgba(74,109,255,0.12); color:#d0d8ff; }
.item-card.active { background: rgba(74,109,255,0.22); border-color: #4a6dff; color:#fff; }

/* Pager */
.pager { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }
.pager button { width: 24px; height: 24px; border-radius: 4px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.12s; padding: 0; }
.pager button:hover:not(:disabled) { background: rgba(74,109,255,0.2); }
.pager button:disabled { opacity: 0.3; cursor: default; }
.pager span { font-size: 10px; color: rgba(255,255,255,0.35); }

/* Swatches */
.swatch-grid { display: flex; flex-wrap: wrap; gap: 3px; }
.sw { width: 18px; height: 18px; border-radius: 3px; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.1s, border-color 0.1s; }
.sw:hover { transform: scale(1.2); }
.sw.active { border-color: #8899ff; transform: scale(1.25); }

/* Overlay toggle */
.ov-toggle { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.ov-lbl { font-size: 11px; color: rgba(255,255,255,0.4); }
.toggle { position: relative; cursor: pointer; display: block; }
.toggle input { display: none; }
.track { display: block; width: 32px; height: 17px; border-radius: 9px; background: rgba(255,255,255,0.09); transition: background 0.2s; position: relative; }
.track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: rgba(255,255,255,0.35); transition: transform 0.2s, background 0.2s; }
.toggle input:checked + .track { background: rgba(74,109,255,0.5); }
.toggle input:checked + .track::after { transform: translateX(15px); background: #8899ff; }

/* Separators */
.group-sep { font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.28); margin: 10px 0 5px; }
</style>

<template>
  <!-- Body / makeup overlays (slots 4–12) ───────────────────────────────── -->
  <CcSection v-for="ov in BODY_OVERLAYS" :key="ov.slot" :title="ov.label">
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

  <!-- Tattoos ─────────────────────────────────────────────────────────────── -->
  <CcSection title="Tattoos" desc="Apply body decorations">
    <div class="zone-strip">
      <button v-for="z in TATTOO_ZONES" :key="z.id"
        :class="['zone-btn', { active: tattooZone === z.id }]"
        @click="tattooZone = z.id">{{ z.label }}</button>
    </div>
    <div class="tattoo-list">
      <div v-for="t in filteredTattoos" :key="t.overlay"
        :class="['tattoo-item', { active: hasTattoo(t.overlay) }]"
        @click="toggleTattoo(t)">
        <span>{{ t.name }}</span>
        <span class="tattoo-check">{{ hasTattoo(t.overlay) ? '✓' : '' }}</span>
      </div>
    </div>
    <div v-if="filteredTattoos.length === 0" class="empty-zone">No tattoos for this zone.</div>
  </CcSection>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { TattooEntry } from '@ragemp/shared';
import { APP_KEY, PREVIEW_KEY, TOGGLE_OVERLAY_KEY } from '../injectionKeys';
import { HAIR_COLORS, MAKEUP_COLORS } from '../constants';
import CcSection from '../CcSection.vue';
import SliderRow from '../SliderRow.vue';

const app           = inject(APP_KEY)!;
const preview       = inject(PREVIEW_KEY)!;
const toggleOverlay = inject(TOGGLE_OVERLAY_KEY)!;

// ── Body / makeup overlays (slots 4–12) ───────────────────────────────────────
const BODY_OVERLAYS = [
  { slot: 4,  label: 'Makeup',              max: 74, colorType: 2 },
  { slot: 5,  label: 'Blush',               max: 6,  colorType: 2 },
  { slot: 6,  label: 'Complexion',          max: 11, colorType: 0 },
  { slot: 7,  label: 'Sun Damage',          max: 10, colorType: 0 },
  { slot: 8,  label: 'Lipstick',            max: 9,  colorType: 2 },
  { slot: 9,  label: 'Moles / Freckles',   max: 17, colorType: 0 },
  { slot: 10, label: 'Chest Hair',          max: 16, colorType: 1 },
  { slot: 11, label: 'Body Blemishes',      max: 11, colorType: 0 },
  { slot: 12, label: 'Add Body Blemishes',  max: 11, colorType: 0 },
];

// ── Tattoos ───────────────────────────────────────────────────────────────────
type TattooZone = TattooEntry['zone'];

const TATTOO_ZONES: { id: TattooZone; label: string }[] = [
  { id: 'head',      label: 'Head'    },
  { id: 'torso',     label: 'Torso'   },
  { id: 'left_arm',  label: 'L. Arm'  },
  { id: 'right_arm', label: 'R. Arm'  },
  { id: 'left_leg',  label: 'L. Leg'  },
  { id: 'right_leg', label: 'R. Leg'  },
];

const tattooZone = ref<TattooZone>('torso');

const ALL_TATTOOS: (TattooEntry & { name: string })[] = [
  { zone: 'head',      name: 'Teardrop',      collection: 'mpinttattoos_01', overlay: 'FM_Tat_000_M_001' },
  { zone: 'head',      name: 'Face Lines',    collection: 'mpinttattoos_01', overlay: 'FM_Tat_000_M_002' },
  { zone: 'torso',     name: 'Eagle Back',    collection: 'mpinttattoos_01', overlay: 'FM_Tat_003_M_001' },
  { zone: 'torso',     name: 'Dragon',        collection: 'mpinttattoos_01', overlay: 'FM_Tat_003_M_002' },
  { zone: 'torso',     name: 'Chest Cross',   collection: 'mpinttattoos_01', overlay: 'FM_Tat_003_M_003' },
  { zone: 'torso',     name: 'Tribal Torso',  collection: 'mpinttattoos_01', overlay: 'FM_Tat_003_M_004' },
  { zone: 'left_arm',  name: 'Flames Sleeve', collection: 'mpinttattoos_01', overlay: 'FM_Tat_001_M_001' },
  { zone: 'left_arm',  name: 'Skull Arm',     collection: 'mpinttattoos_01', overlay: 'FM_Tat_001_M_002' },
  { zone: 'left_arm',  name: 'Stars Arm',     collection: 'mpinttattoos_01', overlay: 'FM_Tat_001_M_003' },
  { zone: 'right_arm', name: 'Barbed Wire',   collection: 'mpinttattoos_01', overlay: 'FM_Tat_002_M_001' },
  { zone: 'right_arm', name: 'Cross Arm',     collection: 'mpinttattoos_01', overlay: 'FM_Tat_002_M_002' },
  { zone: 'left_leg',  name: 'Tribal Leg',    collection: 'mpinttattoos_01', overlay: 'FM_Tat_004_M_001' },
  { zone: 'left_leg',  name: 'Flame Leg',     collection: 'mpinttattoos_01', overlay: 'FM_Tat_004_M_002' },
  { zone: 'right_leg', name: 'Scorpion Leg',  collection: 'mpinttattoos_01', overlay: 'FM_Tat_005_M_001' },
  { zone: 'right_leg', name: 'Stars Leg',     collection: 'mpinttattoos_01', overlay: 'FM_Tat_005_M_002' },
];

const filteredTattoos = computed(() => ALL_TATTOOS.filter(t => t.zone === tattooZone.value));

function hasTattoo(overlay: string): boolean {
  return app.tattoos.some(t => t.overlay === overlay);
}

function toggleTattoo(t: TattooEntry & { name: string }): void {
  const idx = app.tattoos.findIndex(x => x.overlay === t.overlay);
  if (idx === -1) app.tattoos.push({ zone: t.zone, collection: t.collection, overlay: t.overlay });
  else            app.tattoos.splice(idx, 1);
  preview();
}
</script>

<style scoped>
.ov-toggle { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.ov-lbl { font-size: 11px; color: rgba(255,255,255,0.4); }
.toggle { position: relative; cursor: pointer; display: block; }
.toggle input { display: none; }
.track { display: block; width: 32px; height: 17px; border-radius: 9px; background: rgba(255,255,255,0.09); transition: background 0.2s; position: relative; }
.track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: rgba(255,255,255,0.35); transition: transform 0.2s, background 0.2s; }
.toggle input:checked + .track { background: rgba(74,109,255,0.5); }
.toggle input:checked + .track::after { transform: translateX(15px); background: #8899ff; }

.swatch-grid { display: flex; flex-wrap: wrap; gap: 3px; }
.sw { width: 18px; height: 18px; border-radius: 3px; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.1s, border-color 0.1s; }
.sw:hover { transform: scale(1.2); }
.sw.active { border-color: #8899ff; transform: scale(1.25); }

.group-sep { font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.28); margin: 10px 0 5px; }

.zone-strip { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.zone-btn { padding: 4px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.12s; }
.zone-btn.active { background: rgba(74,109,255,0.16); border-color: rgba(74,109,255,0.4); color: #8899ff; }

.tattoo-list { display: flex; flex-direction: column; gap: 3px; }
.tattoo-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 5px; background: rgba(255,255,255,0.03); border: 1px solid transparent; font-size: 11px; color: rgba(255,255,255,0.55); cursor: pointer; transition: all 0.12s; }
.tattoo-item:hover { background: rgba(74,109,255,0.08); }
.tattoo-item.active { background: rgba(74,109,255,0.14); border-color: rgba(74,109,255,0.3); color: #e0e8ff; }
.tattoo-check { color: #4a6dff; font-weight: 700; }
.empty-zone { font-size: 11px; color: rgba(255,255,255,0.2); text-align: center; padding: 12px 0; }
</style>

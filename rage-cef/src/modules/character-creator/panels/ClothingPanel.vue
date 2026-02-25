<template>
  <!-- Clothing components ─────────────────────────────────────────────────── -->
  <CcSection v-for="c in CLOTHING" :key="c.key" :title="c.label" :desc="`Customize your ${c.label}`">
    <div class="item-grid">
      <button v-for="idx in pagedItems(c.key, c.max + 1)" :key="idx"
        :class="['item-card', { active: (app as any)[c.key] === idx }]"
        @click="(app as any)[c.key] = idx; preview()">{{ idx }}</button>
    </div>
    <div class="pager">
      <button @click="prevPage(c.key)" :disabled="(pages[c.key] ?? 0) === 0">‹</button>
      <span>{{ (pages[c.key] ?? 0) + 1 }} / {{ pageCount(c.max + 1) }}</span>
      <button @click="nextPage(c.key, c.max + 1)">›</button>
    </div>
    <div v-if="c.maxTex > 0" class="variant-row">
      <span class="variant-label">{{ c.label }} Variation</span>
      <div class="variant-ctrl">
        <button @click="(app as any)[c.texKey] = Math.max(0, (app as any)[c.texKey] - 1); preview()">‹</button>
        <span>{{ (app as any)[c.texKey] }}</span>
        <button @click="(app as any)[c.texKey] = Math.min(c.maxTex, (app as any)[c.texKey] + 1); preview()">›</button>
      </div>
    </div>
  </CcSection>

  <!-- Props ──────────────────────────────────────────────────────────────── -->
  <CcSection v-for="p in PROPS" :key="p.key" :title="p.label" :desc="`Customize your ${p.label}`">
    <div class="item-grid">
      <button :class="['item-card none-card', { active: (app as any)[p.key] === -1 }]"
        @click="(app as any)[p.key] = -1; preview()">None</button>
      <button v-for="idx in pagedItems(p.key, p.max + 1)" :key="idx"
        :class="['item-card', { active: (app as any)[p.key] === idx }]"
        @click="(app as any)[p.key] = idx; preview()">{{ idx }}</button>
    </div>
    <div class="pager">
      <button @click="prevPage(p.key)" :disabled="(pages[p.key] ?? 0) === 0">‹</button>
      <span>{{ (pages[p.key] ?? 0) + 1 }} / {{ pageCount(p.max + 1) }}</span>
      <button @click="nextPage(p.key, p.max + 1)">›</button>
    </div>
  </CcSection>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { APP_KEY, PREVIEW_KEY } from '../injectionKeys';
import { usePagination } from '../usePagination';
import CcSection from '../CcSection.vue';

const app     = inject(APP_KEY)!;
const preview = inject(PREVIEW_KEY)!;

const { pages, pageCount, pagedItems, prevPage, nextPage } = usePagination();

// ── Clothing component slots ──────────────────────────────────────────────────
const CLOTHING = [
  { key: 'head',        texKey: 'headTex',        label: 'Head',          max: 20,  maxTex: 2  },
  { key: 'mask',        texKey: 'maskTex',        label: 'Mask',          max: 255, maxTex: 5  },
  { key: 'torso',       texKey: 'torsoTex',       label: 'Torso',         max: 255, maxTex: 15 },
  { key: 'tops',        texKey: 'topsTex',        label: 'Jacket / Top',  max: 400, maxTex: 15 },
  { key: 'undershirt',  texKey: 'undershirtTex',  label: 'Undershirt',    max: 61,  maxTex: 5  },
  { key: 'legs',        texKey: 'legsTex',        label: 'Pants',         max: 120, maxTex: 6  },
  { key: 'shoes',       texKey: 'shoesTex',       label: 'Shoes',         max: 120, maxTex: 6  },
  { key: 'accessories', texKey: 'accessoriesTex', label: 'Accessories',   max: 50,  maxTex: 5  },
  { key: 'decals',      texKey: 'decalsTex',      label: 'Decals',        max: 10,  maxTex: 2  },
] as const;

// ── Prop slots ────────────────────────────────────────────────────────────────
const PROPS = [
  { key: 'hat',          label: 'Hat / Helmet',  max: 200 },
  { key: 'glasses',      label: 'Glasses',       max: 45  },
  { key: 'earAccessory', label: 'Ear Accessory', max: 12  },
  { key: 'watch',        label: 'Watch',         max: 35  },
  { key: 'bracelet',     label: 'Bracelet',      max: 8   },
] as const;
</script>

<style scoped>
.item-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.item-card { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s; }
.item-card:hover  { background: rgba(74,109,255,0.12); color: #d0d8ff; }
.item-card.active { background: rgba(74,109,255,0.22); border-color: #4a6dff; color: #fff; }
.none-card { font-size: 9px; color: rgba(255,80,80,0.5); }
.none-card.active { background: rgba(255,60,60,0.12); border-color: rgba(255,60,60,0.4); color: #ff8080; }

.pager { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; }
.pager button { width: 24px; height: 24px; border-radius: 4px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.12s; padding: 0; }
.pager button:hover:not(:disabled) { background: rgba(74,109,255,0.2); }
.pager button:disabled { opacity: 0.3; cursor: default; }
.pager span { font-size: 10px; color: rgba(255,255,255,0.35); }

.variant-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }
.variant-label { font-size: 10px; color: rgba(255,255,255,0.4); }
.variant-ctrl { display: flex; align-items: center; gap: 6px; }
.variant-ctrl button { width: 20px; height: 20px; border-radius: 4px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; }
.variant-ctrl span { font-size: 11px; color: #d0d8ff; min-width: 20px; text-align: center; }
</style>

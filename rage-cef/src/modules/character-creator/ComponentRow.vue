<template>
  <div class="cr-wrap">
    <span class="cr-label">{{ label }}</span>
    <div class="cr-controls">
      <!-- Draw (style index) -->
      <button class="cr-btn" @click="decDraw">‹</button>
      <span class="cr-val">{{ draw === -1 ? 'None' : draw }}</span>
      <button class="cr-btn" @click="incDraw">›</button>

      <!-- Texture index -->
      <span class="cr-sep">Tex</span>
      <button class="cr-btn" @click="decTex">‹</button>
      <span class="cr-val">{{ tex }}</span>
      <button class="cr-btn" @click="incTex">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  max: number;
  maxTex: number;
  draw: number;
  tex: number;
  allowNone?: boolean;
}>();

const emit = defineEmits<{
  'update:draw': [value: number];
  'update:tex':  [value: number];
}>();

function incDraw() {
  emit('update:draw', Math.min(props.draw + 1, props.max));
}
function decDraw() {
  const minVal = props.allowNone ? -1 : 0;
  emit('update:draw', Math.max(props.draw - 1, minVal));
}
function incTex() {
  emit('update:tex', Math.min(props.tex + 1, props.maxTex));
}
function decTex() {
  emit('update:tex', Math.max(props.tex - 1, 0));
}
</script>

<style scoped>
.cr-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cr-label {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  font-weight: 500;
  width: 110px;
  flex-shrink: 0;
}
.cr-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cr-btn {
  width: 24px; height: 24px;
  border-radius: 5px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.09);
  color: #fff; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
  padding: 0;
}
.cr-btn:hover { background: rgba(85,119,255,0.2); }
.cr-val {
  min-width: 30px;
  text-align: center;
  font-size: 13px;
  color: #d0d8ff;
  font-variant-numeric: tabular-nums;
}
.cr-sep {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-left: 6px;
}
</style>

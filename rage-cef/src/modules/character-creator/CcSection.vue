<template>
  <div class="ccs">
    <button class="ccs-hdr" @click="open = !open">
      <span class="ccs-title">{{ title }}</span>
      <svg class="ccs-chevron" :class="{ rotated: open }" viewBox="0 0 10 6" fill="none">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <div v-show="open" class="ccs-body">
      <p v-if="desc" class="ccs-desc">{{ desc }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  title: string;
  desc?: string;
  defaultOpen?: boolean;
}>();

const open = ref(props.defaultOpen ?? false);
</script>

<style scoped>
.ccs {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.ccs-hdr {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255,255,255,0.82);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  transition: background 0.12s;
}
.ccs-hdr:hover { background: rgba(255,255,255,0.04); }

.ccs-title { flex: 1; }

.ccs-chevron {
  width: 10px; height: 6px;
  color: rgba(255,255,255,0.35);
  transition: transform 0.2s;
}
.ccs-chevron.rotated { transform: rotate(180deg); }

.ccs-body {
  padding: 4px 14px 12px;
}

.ccs-desc {
  font-size: 10px;
  color: rgba(255,255,255,0.35);
  margin: 0 0 8px;
}
</style>

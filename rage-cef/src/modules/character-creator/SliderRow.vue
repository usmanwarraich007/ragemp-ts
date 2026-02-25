<template>
  <div class="slider-wrap">
    <span class="sr-label">{{ label }}</span>
    <input
      class="sr-input"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="emit('update:modelValue', parseFloat(($event.target as HTMLInputElement).value))"
    />
    <span class="sr-val">{{ displayValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  min: number;
  max: number;
  step: number;
  modelValue: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const displayValue = computed(() => {
  const v = props.modelValue;
  // Show integer for whole numbers, 2 decimals for fractions
  return props.step < 1 ? v.toFixed(2) : String(Math.round(v));
});
</script>

<style scoped>
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}
.sr-label {
  width: 130px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  font-weight: 500;
}
.sr-input {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  outline: none;
  cursor: pointer;
}
.sr-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #5577ff;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.2);
  transition: transform 0.1s;
}
.sr-input::-webkit-slider-thumb:hover { transform: scale(1.2); }
.sr-val {
  width: 38px;
  text-align: right;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  font-variant-numeric: tabular-nums;
}
</style>

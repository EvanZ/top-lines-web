<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const onChange = (event) => {
  emit('update:modelValue', event.target.checked)
}
</script>

<template>
  <label class="toggle-switch">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="ariaLabel || undefined"
      @change="onChange"
    >
    <span class="toggle-slider"></span>
  </label>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
  display: inline-flex;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-dark, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--border-glow, rgba(255, 255, 255, 0.15));
  border-radius: 24px;
  transition: all 0.25s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  bottom: 2px;
  background: var(--text-secondary, #b3b8c2);
  border-radius: 50%;
  transition: all 0.25s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: rgba(0, 212, 255, 0.18);
  border-color: var(--accent-cyan, #00d4ff);
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.2);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: var(--accent-cyan, #00d4ff);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

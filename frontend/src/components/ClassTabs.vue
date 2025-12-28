<script setup>
const props = defineProps({
  classes: {
    type: Array,
    required: true
  },
  selectedClasses: {
    type: Array,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:selectedClasses'])

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const toggleClass = (cls) => {
  if (props.disabled) return
  const current = props.selectedClasses || []
  if (current.includes(cls)) {
    if (current.length <= 1) return
    emit('update:selectedClasses', current.filter(item => item !== cls))
    return
  }
  emit('update:selectedClasses', [...current, cls])
}
</script>

<template>
  <div class="class-tabs">
    <button 
      v-for="cls in classes" 
      :key="cls"
      class="class-tab"
      :class="{ active: selectedClasses.includes(cls) }"
      :disabled="disabled"
      @click="toggleClass(cls)"
    >
      {{ capitalize(cls) }}
    </button>
  </div>
</template>

<style scoped>
.class-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.class-tab {
  padding: 0.5rem 1.25rem;
  background: transparent;
  border: 1px solid var(--border-glow);
  color: var(--text-secondary);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.class-tab:hover {
  border-color: var(--accent-cyan);
  color: var(--text-primary);
}

.class-tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.class-tab:disabled:hover {
  border-color: var(--border-glow);
  color: var(--text-secondary);
}

.class-tab.active {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
  color: var(--bg-dark);
}
</style>

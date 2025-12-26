<script setup>
defineProps({
  classes: {
    type: Array,
    required: true
  },
  activeClass: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:activeClass'])

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)
</script>

<template>
  <div class="class-tabs">
    <button 
      v-for="cls in classes" 
      :key="cls"
      class="class-tab"
      :class="{ active: activeClass === cls }"
      @click="emit('update:activeClass', cls)"
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

.class-tab.active {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
  color: var(--bg-dark);
}
</style>


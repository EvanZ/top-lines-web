<script setup>
import { computed } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['vote'])

const isRsci = computed(() => props.player?.rsci_rank)
</script>

<template>
  <div 
    v-if="player"
    class="voting-card" 
    :class="{ rsci: isRsci }"
    @click="emit('vote')"
  >
    <img 
      :src="player.headshot" 
      class="voting-player-photo" 
      :alt="player.name"
    >
    <div class="voting-player-name">{{ player.name }}</div>
    <div class="voting-player-meta">
      {{ player.height }} / {{ player.weight }} lbs<br>
      {{ player.class }} {{ player.position }}<br>
      {{ player.team }}<br>
      <span v-if="player.birthplace">{{ player.birthplace }} • </span>Age {{ player.age }}<br>
      {{ player.ppg }} PPG • {{ player.rpg }} RPG • {{ player.bpg }} BPG
    </div>
    <span v-if="isRsci" class="voting-rsci-badge">#{{ player.rsci_rank }} RSCI</span>
  </div>
</template>

<style scoped>
.voting-card {
  flex: 1;
  max-width: 350px;
  min-width: 280px;
  background: var(--bg-dark);
  border: 2px solid var(--border-glow);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  text-align: center;
}

.voting-card:hover {
  border-color: var(--accent-cyan);
  transform: scale(1.02);
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.2);
}

.voting-card:active {
  transform: scale(0.98);
}

.voting-card.rsci {
  border-color: var(--accent-gold);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
}

.voting-card.rsci::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--accent-gold), #ff8800);
  border-radius: 10px 10px 0 0;
}

.voting-card.rsci:hover {
  border-color: var(--accent-gold);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
}

.voting-player-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid var(--border-glow);
  margin: 0 auto 1rem;
  display: block;
  filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.15));
  transition: all 0.3s ease;
}

.voting-card:hover .voting-player-photo {
  border-color: var(--accent-cyan);
  filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.6));
}

.voting-card.rsci:hover .voting-player-photo {
  border-color: var(--accent-gold);
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
}

.voting-player-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.voting-player-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.voting-rsci-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--accent-gold), #ff8800);
  color: var(--bg-dark);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}
</style>


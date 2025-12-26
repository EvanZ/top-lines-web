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
    <div class="voting-header">
      <div class="voting-left">
        <img 
          :src="player.headshot" 
          class="voting-player-photo" 
          :alt="player.name"
        >
        <div class="voting-player-name">{{ player.name }}</div>
      </div>
      <div class="voting-player-meta">
        {{ player.height }} / {{ player.weight }} lbs<br>
        {{ player.class }} {{ player.position }}<br>
        {{ player.team }}<br>
        <span v-if="player.birthplace">{{ player.birthplace }} • </span>Age {{ player.age }}<br>
        <span v-if="isRsci" class="voting-rsci-badge">#{{ player.rsci_rank }} RSCI</span>
      </div>
    </div>
    <div class="voting-stats">
      <div class="voting-stat">
        <span class="voting-stat-label">PPG</span>
        <span class="voting-stat-value">{{ player.ppg }}</span>
      </div>
      <div class="voting-stat">
        <span class="voting-stat-label">RPG</span>
        <span class="voting-stat-value">{{ player.rpg }}</span>
      </div>
      <div class="voting-stat">
        <span class="voting-stat-label">APG</span>
        <span class="voting-stat-value">{{ player.apg }}</span>
      </div>
      <div class="voting-stat">
        <span class="voting-stat-label">SPG</span>
        <span class="voting-stat-value">{{ player.spg }}</span>
      </div>
      <div class="voting-stat">
        <span class="voting-stat-label">TOV</span>
        <span class="voting-stat-value">{{ player.tpg }}</span>
      </div>
      <div class="voting-stat">
        <span class="voting-stat-label">BPG</span>
        <span class="voting-stat-value">{{ player.bpg }}</span>
      </div>
    </div>
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
}

.voting-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.voting-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 0 0 auto;
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
  margin: 0 0 0.75rem;
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
  font-family: 'Sora', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.voting-player-meta {
  text-align: left;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
  flex: 1 1 auto;
  min-width: 160px;
}

.voting-stats {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.3rem;
  width: 100%;
}

.voting-stat {
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 6px;
  padding: 0.3rem 0.4rem;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
}

.voting-stat-label {
  display: block;
  font-size: 0.55rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.voting-stat-value {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-gold);
}

.voting-rsci-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--accent-gold), #ff8800);
  color: var(--bg-dark);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

@media (max-width: 420px) {
  .voting-header {
    flex-direction: column;
    align-items: center;
  }

  .voting-player-meta {
    text-align: center;
    min-width: auto;
  }
}
</style>

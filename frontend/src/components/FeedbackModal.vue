<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  message: { type: String, default: '' },
  contact: { type: String, default: '' },
  submitting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  success: { type: Boolean, default: false },
  maxLength: { type: Number, default: 1000 }
})

const emit = defineEmits(['close', 'submit', 'update:message', 'update:contact'])

const onMessageInput = (event) => {
  const value = event.target.value.slice(0, props.maxLength)
  emit('update:message', value)
}

const onContactInput = (event) => {
  emit('update:contact', event.target.value.slice(0, 200))
}
</script>

<template>
  <div v-if="open" class="feedback-overlay" @click.self="emit('close')">
    <div class="feedback-modal" role="dialog" aria-modal="true" aria-label="Send feedback">
      <button class="feedback-close" type="button" aria-label="Close feedback" @click="emit('close')">×</button>
      <div class="feedback-card" :class="{ flipped: success }">
        <div class="feedback-card-inner">
          <div class="feedback-face feedback-front">
            <h3>Send Feedback</h3>
            <p class="feedback-subtitle">Tell us what you like, what feels off, or anything you'd like to see.</p>

            <form class="feedback-form" @submit.prevent="emit('submit')">
              <label for="feedback-message">Message</label>
              <textarea
                id="feedback-message"
                name="message"
                rows="5"
                :value="message"
                :maxlength="maxLength"
                placeholder="Share your thoughts..."
                @input="onMessageInput"
                required
              ></textarea>
              <div class="feedback-meta">
                <span>{{ message.length }} / {{ maxLength }} characters</span>
              </div>

              <label for="feedback-contact">Contact (optional)</label>
              <input
                id="feedback-contact"
                name="contact"
                type="text"
                :value="contact"
                placeholder="Email or social handle if you want a reply"
                @input="onContactInput"
              />

              <p v-if="error" class="feedback-error">{{ error }}</p>

              <div class="feedback-actions">
                <button type="button" class="ghost" :disabled="submitting" @click="emit('close')">Cancel</button>
                <button type="submit" class="primary" :disabled="submitting">
                  {{ submitting ? 'Sending…' : 'Send' }}
                </button>
              </div>
            </form>
          </div>

          <div class="feedback-face feedback-back">
            <div class="thanks-icon">★</div>
            <h3>Thank you!</h3>
            <p class="thanks-copy">We got your note. Appreciate you taking the time.</p>
            <button type="button" class="primary close-toast" @click="emit('close')">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 200;
}

.feedback-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 212, 255, 0.08);
  padding: 1.5rem;
  max-width: 520px;
  width: min(520px, 100%);
  position: relative;
}

.feedback-card {
  position: relative;
  perspective: 1400px;
}

.feedback-card-inner {
  position: relative;
  display: grid;
  transform-style: preserve-3d;
  transition: transform 0.65s ease;
  min-height: 320px;
}

.feedback-card.flipped .feedback-card-inner {
  transform: rotateY(180deg);
}

.feedback-face {
  grid-area: 1 / 1;
  width: 100%;
  backface-visibility: hidden;
  transform: translateZ(1px);
}

.feedback-front {
  display: block;
}

.feedback-back {
  display: grid;
  place-items: center;
  text-align: center;
  padding: 1rem;
  gap: 0.75rem;
  transform: rotateY(180deg);
}

.feedback-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

h3 {
  font-size: 1.3rem;
  margin-bottom: 0.25rem;
}

.feedback-subtitle {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  font-weight: 600;
  color: var(--text-primary);
}

textarea,
input[type="text"] {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-glow);
  background: var(--card-overlay);
  color: var(--text-primary);
  padding: 0.75rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

textarea:focus,
input[type="text"]:focus {
  border-color: var(--accent-cyan);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.feedback-meta {
  display: flex;
  justify-content: flex-end;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: -0.5rem;
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.feedback-actions button {
  border-radius: 8px;
  padding: 0.6rem 1.1rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.feedback-actions .ghost {
  border-color: var(--border-glow);
}

.feedback-actions .primary {
  background: linear-gradient(120deg, var(--accent-cyan), var(--accent-gold));
  color: #0a0e1a;
  font-weight: 700;
  box-shadow: 0 6px 20px rgba(0, 212, 255, 0.25);
}

.feedback-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.feedback-error {
  color: var(--accent-red);
  background: rgba(255, 51, 102, 0.08);
  border: 1px solid rgba(255, 51, 102, 0.3);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
}

.feedback-success {
  color: var(--accent-green);
  background: rgba(0, 255, 136, 0.08);
  border: 1px solid rgba(0, 255, 136, 0.25);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
}

.thanks-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto;
  font-size: 1.4rem;
  font-weight: 800;
  color: #0a0e1a;
  background: linear-gradient(120deg, var(--accent-cyan), var(--accent-gold));
  box-shadow: 0 10px 30px rgba(0, 212, 255, 0.25);
}

.thanks-copy {
  color: var(--text-secondary);
}

.close-toast {
  margin-top: 0.5rem;
}

@media (max-width: 480px) {
  .feedback-modal {
    padding: 1.2rem;
  }
}
</style>

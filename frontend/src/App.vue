<script setup>
import { ref, provide, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FeedbackModal from './components/FeedbackModal.vue'

const router = useRouter()
const route = useRoute()

const gender = ref('men')
const theme = ref('dark')
const feedbackOpen = ref(false)
const feedbackMessage = ref('')
const feedbackContact = ref('')
const feedbackSubmitting = ref(false)
const feedbackError = ref('')
const feedbackSuccess = ref(false)
const FEEDBACK_MAX_LENGTH = 1000
const INVALID_TEXT_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F<>]/
const FEEDBACK_TOAST_MS = 3000
const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const feedbackEndpoint = `${apiBase}/api/feedback`
let feedbackToastTimer = null

const navLinks = [
  { name: 'daily', label: 'Games', path: '/' },
  { name: 'schedule', label: 'Schedule', path: '/schedule' },
  { name: 'rankings', label: 'Season', path: '/rankings' },
  { name: 'voting', label: 'Voting', path: '/voting' },
  { name: 'glossary', label: 'Glossary', path: '/glossary' }
]

const isActive = (name) => {
  if (name === 'daily' && route.path === '/') return true
  return route.path === `/${name}`
}

const applyTheme = (value) => {
  document.documentElement.dataset.theme = value
}

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

const clearFeedbackToast = () => {
  if (feedbackToastTimer) {
    clearTimeout(feedbackToastTimer)
    feedbackToastTimer = null
  }
}

const openFeedback = () => {
  clearFeedbackToast()
  feedbackError.value = ''
  feedbackSuccess.value = false
  feedbackOpen.value = true
}

const closeFeedback = () => {
  clearFeedbackToast()
  feedbackOpen.value = false
}

const validateFeedback = (message, contact) => {
  if (!message) return 'Please enter a message.'
  if (message.length > FEEDBACK_MAX_LENGTH) return 'Feedback is too long.'
  if (INVALID_TEXT_PATTERN.test(message)) return 'Message must be plain text only.'
  if (contact && INVALID_TEXT_PATTERN.test(contact)) return 'Contact info must be text only.'
  if (contact && contact.length > 200) return 'Contact info is too long.'
  return null
}

const submitFeedback = async () => {
  feedbackError.value = ''
  feedbackSuccess.value = false
  const message = feedbackMessage.value.trim()
  const contact = feedbackContact.value.trim()
  const validationError = validateFeedback(message, contact)
  if (validationError) {
    feedbackError.value = validationError
    return
  }

  feedbackSubmitting.value = true
  try {
    const payload = {
      message,
      contact: contact || undefined,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined
    }
    const resp = await fetch(feedbackEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      const detail = data?.detail || `HTTP ${resp.status}`
      throw new Error(typeof detail === 'string' ? detail : 'Unable to send feedback')
    }
    feedbackSuccess.value = true
    feedbackMessage.value = ''
    feedbackContact.value = ''
    clearFeedbackToast()
    if (typeof window !== 'undefined') {
      feedbackToastTimer = window.setTimeout(() => {
        closeFeedback()
      }, FEEDBACK_TOAST_MS)
    } else {
      closeFeedback()
    }
  } catch (err) {
    feedbackError.value = err?.message || 'Unable to send feedback right now.'
  } finally {
    feedbackSubmitting.value = false
  }
}

// Provide shared app state to all child components
provide('gender', gender)
provide('theme', theme)
provide('toggleTheme', toggleTheme)

onMounted(() => {
  const stored = localStorage.getItem('toplines-theme')
  if (stored === 'light' || stored === 'dark') {
    theme.value = stored
  }
  applyTheme(theme.value)

  const storedGender = localStorage.getItem('toplines-gender')
  if (storedGender === 'men' || storedGender === 'women') {
    gender.value = storedGender
  }
})

watch(theme, (value) => {
  applyTheme(value)
  localStorage.setItem('toplines-theme', value)
})

watch(gender, (value) => {
  localStorage.setItem('toplines-gender', value)
})
</script>

<template>
  <div class="app">
    <!-- Hero Banner -->
    <div class="hero-banner">
      <img src="/top_lines_websplash_stylized.jpg" alt="Top Lines" class="hero-image">
      <div class="hero-overlay"></div>
    </div>

    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <span class="logo-text">TOP LINES!</span>
          <span class="logo-sub">NBA Draft Prospect Tracker</span>
        </div>
        <nav class="nav">
          <router-link 
            v-for="link in navLinks" 
            :key="link.name"
            :to="link.path"
            class="nav-link"
            :class="{ active: isActive(link.name) }"
          >
            {{ link.label }}
          </router-link>
        </nav>
        <div class="header-actions">
          <div id="compare-trigger" class="compare-trigger"></div>
          <div id="settings-trigger" class="settings-trigger"></div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="footer">
      <p>© 2025 Top Lines! — NBA Draft Prospect Analytics</p>
      <p class="footer-links">
        <a href="https://patreon.com/toplines" target="_blank">Support on Patreon</a>
        <button class="footer-feedback" type="button" @click="openFeedback">Send Feedback</button>
      </p>
    </footer>

    <FeedbackModal
      :open="feedbackOpen"
      :message="feedbackMessage"
      :contact="feedbackContact"
      :submitting="feedbackSubmitting"
      :error="feedbackError"
      :success="feedbackSuccess"
      :max-length="FEEDBACK_MAX_LENGTH"
      @close="closeFeedback"
      @submit="submitFeedback"
      @update:message="feedbackMessage = $event"
      @update:contact="feedbackContact = $event"
    />
  </div>
</template>

<style>
/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

/* CSS Variables */
:root {
  --bg-dark: #0a0e1a;
  --bg-card: #111827;
  --bg-card-hover: #1a2332;
  --border-glow: #1e3a5f;
  --accent-cyan: #00d4ff;
  --accent-gold: #ffd700;
  --accent-orange: #ff8800;
  --accent-red: #ff3366;
  --accent-green: #00ff88;
  --text-primary: #d2d9e5;
  --text-secondary: #8a9bb0;
  --text-muted: #63748a;
  --header-bg: rgba(10, 14, 26, 0.95);
  --hero-overlay-gradient: linear-gradient(transparent, var(--bg-dark));
  --hero-image-opacity: 1;
  --hero-image-filter: none;
  --card-overlay: rgba(17, 24, 39, 0.92);
}

:root[data-theme="light"] {
  --bg-dark: #f5f7fb;
  --bg-card: #ffffff;
  --bg-card-hover: #eef2f7;
  --border-glow: #d0dae6;
  --accent-cyan: #007fa6;
  --accent-gold: #c08a00;
  --accent-orange: #c86500;
  --accent-red: #cc2a4a;
  --accent-green: #00a06b;
  --text-primary: #1f2a37;
  --text-secondary: #4d5c70;
  --text-muted: #7a8798;
  --header-bg: rgba(245, 247, 251, 0.95);
  --hero-overlay-gradient: linear-gradient(transparent, rgba(245, 247, 251, 0.95));
  --hero-image-opacity: 0.25;
  --hero-image-filter: saturate(0.6) brightness(1.05);
  --card-overlay: rgba(255, 255, 255, 0.92);
}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Sora', sans-serif;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(ellipse at 20% 20%, rgba(0, 212, 255, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(255, 51, 102, 0.03) 0%, transparent 50%);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

:root[data-theme="light"] body {
  background-image:
    radial-gradient(ellipse at 20% 20%, rgba(0, 127, 166, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(255, 205, 102, 0.1) 0%, transparent 55%);
}

a {
  color: var(--accent-cyan);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Hero Banner */
.hero-banner {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  opacity: var(--hero-image-opacity);
  filter: var(--hero-image-filter);
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: var(--hero-overlay-gradient);
}

/* Header */
.header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-glow);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.logo {
  display: flex;
  flex-direction: column;
}

.logo-text {
  font-family: 'Sora', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-sub {
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

.nav {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.settings-trigger,
.compare-trigger {
  display: flex;
  align-items: center;
}

.nav-link {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(0, 212, 255, 0.1);
  text-decoration: none;
}

.nav-link.active {
  color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.15);
}

/* Main */
.main {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem 2rem;
}

/* Footer */
.footer {
  border-top: 1px solid var(--border-glow);
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.footer-links {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.footer-links a {
  color: var(--accent-cyan);
}

.footer-feedback {
  padding: 0.45rem 0.9rem;
  border-radius: 20px;
  border: 1px solid var(--border-glow);
  background: rgba(0, 212, 255, 0.08);
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.footer-feedback:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 212, 255, 0.18);
}

.footer-feedback:active {
  transform: translateY(0);
  box-shadow: none;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    padding: 1rem;
    gap: 1rem;
  }

  .nav {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    row-gap: 0.4rem;
  }

  .nav-link {
    padding: 0.4rem 0.7rem;
    font-size: 0.65rem;
    letter-spacing: 0.04em;
  }

  .main {
    padding: 1rem;
  }

  .hero-banner {
    height: 150px;
  }
}

@media (max-width: 480px) {
  .nav {
    column-gap: 0.35rem;
  }

  .nav-link {
    padding: 0.35rem 0.6rem;
    font-size: 0.6rem;
    letter-spacing: 0.03em;
  }
}
</style>

<script setup>
import { ref, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const gender = ref('men')

// Provide gender to all child components
provide('gender', gender)

const navLinks = [
  { name: 'daily', label: 'Daily Reports', path: '/' },
  { name: 'rankings', label: 'Season Rankings', path: '/rankings' },
  { name: 'voting', label: 'Prospect Voting', path: '/voting' }
]

const isActive = (name) => {
  if (name === 'daily' && route.path === '/') return true
  return route.path === `/${name}`
}
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
      </p>
    </footer>
  </div>
</template>

<style>
/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Sora:wght@400;500;600;700;800&display=swap');

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
  --text-primary: #e8f0ff;
  --text-secondary: #8899aa;
  --text-muted: #556677;
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
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(transparent, var(--bg-dark));
}

/* Header */
.header {
  background: rgba(10, 14, 26, 0.95);
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
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-gold));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

.nav {
  display: flex;
  gap: 0.5rem;
  flex: 1;
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
}

.footer-links a {
  color: var(--accent-cyan);
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
  }

  .main {
    padding: 1rem;
  }

  .hero-banner {
    height: 150px;
  }
}
</style>

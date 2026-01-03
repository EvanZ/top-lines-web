import { createRouter, createWebHistory } from 'vue-router'
const DailyReports = () => import('../views/DailyReports.vue')
const ScheduleView = () => import('../views/Schedule.vue')
const SeasonRankings = () => import('../views/SeasonRankings.vue')
const ProspectVoting = () => import('../views/ProspectVoting.vue')
const Glossary = () => import('../views/Glossary.vue')

const routes = [
  {
    path: '/',
    name: 'daily',
    component: DailyReports
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: ScheduleView
  },
  {
    path: '/rankings',
    name: 'rankings',
    component: SeasonRankings
  },
  {
    path: '/voting',
    name: 'voting',
    component: ProspectVoting
  },
  {
    path: '/glossary',
    name: 'glossary',
    component: Glossary
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import DailyReports from '../views/DailyReports.vue'
import SeasonRankings from '../views/SeasonRankings.vue'
import ProspectVoting from '../views/ProspectVoting.vue'

const routes = [
  {
    path: '/',
    name: 'daily',
    component: DailyReports
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
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

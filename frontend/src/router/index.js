import { createRouter, createWebHistory } from 'vue-router'
import DailyReports from '../views/DailyReports.vue'
import ScheduleView from '../views/Schedule.vue'
import SeasonRankings from '../views/SeasonRankings.vue'
import ProspectVoting from '../views/ProspectVoting.vue'
import Glossary from '../views/Glossary.vue'

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

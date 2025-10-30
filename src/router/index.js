import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import ProgressionBuilder from '../components/ProgressionBuilder.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/progression/:id',
    name: 'progression',
    component: ProgressionBuilder,
    props: route => ({ initialProgressionId: route.params.id })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

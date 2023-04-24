import HomeView from '../views/HomeView.vue'

export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/callback',
    name: 'callback',
    component: () => import('../views/CallbackView.vue')
  },
  {
    path: '/me',
    name: 'config',
    component: () => import('../views/ConfigView.vue')
  }
]

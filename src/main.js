import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { startSmoothScroll } from './composables/useSmoothScroll'

// Antes de montar, así la intro puede detenerlo desde el principio
startSmoothScroll()
createApp(App).use(router).mount('#app')

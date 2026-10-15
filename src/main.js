import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { startSmoothScroll } from './composables/useSmoothScroll'
import { aplicarPaleta, paletaGuardada } from './composables/usePaleta'

// En desarrollo se recuerda la paleta elegida en /guia, para recorrer el sitio con ella
if (import.meta.env.DEV) aplicarPaleta(paletaGuardada())

// Antes de montar, así la intro puede detenerlo desde el principio
startSmoothScroll()
createApp(App).use(router).mount('#app')

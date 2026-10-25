import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { startSmoothScroll } from './composables/useSmoothScroll'
import { aplicarPaleta, paletaGuardada } from './composables/usePaleta'
import { aplicarTitulos, tituloGuardado, aplicarLogoSerif, logoSerifGuardado } from './composables/useTitulos'
import { aplicarPersiana, persianaGuardada } from './composables/usePersiana'

// En desarrollo se recuerdan la paleta y la tipografía de títulos elegidas en /guia, para
// recorrer el sitio con ellas
if (import.meta.env.DEV) {
  aplicarPaleta(paletaGuardada())
  aplicarTitulos(tituloGuardado())
  aplicarLogoSerif(logoSerifGuardado())
  aplicarPersiana(persianaGuardada())
}

// Antes de montar, así la intro puede detenerlo desde el principio
startSmoothScroll()
createApp(App).use(router).mount('#app')

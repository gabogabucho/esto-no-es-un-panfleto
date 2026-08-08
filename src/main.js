// src/main.js — bootstrap (M4, T-039/T-040).
// Monta las hojas de estilo y arranca el shell: máquina de estados de
// pantallas, bucle de escena, La Señal y resume de sesión desde enp-save-v1.
//
// Service worker: lo registra vite-plugin-pwa. Con injectRegister en modo auto
// y registerType autoUpdate, el build inyecta registerSW.js en el index; en dev
// queda desactivado a propósito (devOptions.enabled false, vite.config.js) para
// no arrastrar caché sucia. Registrarlo otra vez desde aquí lo duplicaría.

import './styles/base.css'
// M2: estilos de los renderers de modo (FEED/ZINE/RADIO + decisiones).
import './styles/modes.css'
// M3: La Señal — glitch CSS, rasgado ZINE y canvas decorativo (GS-030/031/032).
import './styles/signal.css'
// M4: pantallas del shell (portada, rol, HUD, final, cierre, memorial, menú).
import './styles/pantallas.css'

import { crearApp } from './app.js'

crearApp().montar()

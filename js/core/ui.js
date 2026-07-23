/**
 * UIManager — every DOM interaction lives here. Buttons in index.html use
 * `data-action` (+ optional `data-arg`) instead of inline `onclick`, and a
 * single delegated listener dispatches them, so markup stays free of JS.
 */
class UIManager {
    constructor() {
        this.lastUpdate = 0;
    }

    init() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            this.dispatch(el.dataset.action, el.dataset.arg, el);
        });

        const bindToggle = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => handler(el.checked));
        };
        bindToggle('cfg-music', (v) => GameApp.Audio.toggleMusic(v));
        bindToggle('cfg-sfx', (v) => { GameApp.Audio.sfxEnabled = v; });
        bindToggle('cfg-vfx', (v) => { GameApp.Config.vfx = v; });
        bindToggle('cfg-hp', (v) => { GameApp.Config.showHP = v; });

        this.setupHotkeys();
    }

    dispatch(action, arg) {
        switch (action) {
            case 'show-screen': this.showScreen(arg); break;
            case 'init-mode': GameApp.initMode(arg); break;
            case 'close-settings': this.closeSettings(); break;
            case 'set-group-mode': this.setGroupMode(arg); break;
            case 'switch-group': this.switchGroup(Number(arg)); break;
            case 'toggle-zoom': this.toggleZoom(); break;
            case 'center-camera': this.triggerCenterCamera(); break;
            case 'toggle-pause': this.togglePause(); break;
            case 'reload': location.reload(); break;
        }
    }

    showScreen(id) {
        GameApp.Audio.initCtx(); GameApp.Audio.playBtn();
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('screen--visible'));
        const target = document.getElementById(id);
        if (target) target.classList.add('screen--visible');
    }

    closeSettings() {
        GameApp.Audio.playBtn();
        document.getElementById('screen-settings').classList.remove('screen--visible');
        if (!GameApp.State.gameStarted) this.showScreen('screen-start');
    }

    showToast(msg, isWarning = false) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const t = document.createElement('div');
        t.className = 'toast' + (isWarning ? ' toast--warning' : '');
        t.textContent = msg;
        c.appendChild(t);

        requestAnimationFrame(() => t.classList.add('toast--show'));
        GameApp.Audio.playTone(isWarning ? 280 : 550, 'triangle', 0.15, 0.08);

        setTimeout(() => {
            t.classList.remove('toast--show');
            setTimeout(() => t.remove(), 300);
        }, 3000);
    }

    setupHotkeys() {
        window.addEventListener('keydown', (e) => {
            if (GameApp.State.isPaused && GameApp.State.gameStarted && e.key.toUpperCase() !== 'P') return;
            switch (e.key.toUpperCase()) {
                case '1': this.switchGroup(1); break;
                case '2': this.switchGroup(2); break;
                case '3': this.switchGroup(3); break;
                case '4': this.switchGroup(4); break;
                case 'Z': this.toggleZoom(); break;
                case 'X': this.triggerCenterCamera(); break;
                case 'P': this.togglePause(); break;
            }
        });
    }

    triggerCenterCamera() {
        if (GameApp.Scene && typeof GameApp.Scene.centerCamera === 'function') {
            GameApp.Scene.centerCamera();
        } else {
            this.showToast('Cargando mapa...');
        }
    }

    switchGroup(id) {
        if (GameApp.State.isPaused) return;
        GameApp.Audio.playBtn();
        GameApp.State.stats.grupoSeleccionado = id;
        document.querySelectorAll('.chip').forEach(b => b.classList.remove('chip--active'));
        const chip = document.getElementById('sh-' + id);
        if (chip) chip.classList.add('chip--active');
        this.forceUpdateHUD();
    }

    setGroupMode(mode) {
        if (GameApp.State.isPaused) return;
        const activeG = GameApp.State.stats.grupoSeleccionado;
        if (activeG < 4) {
            GameApp.Audio.playBtn();
            GameApp.State.stats.modoGrupo[activeG - 1] = mode;
            this.forceUpdateHUD();
        }
    }

    toggleZoom() {
        if (GameApp.State.isPaused) return;
        GameApp.Audio.playBtn();
        GameApp.State.zoomOut = !GameApp.State.zoomOut;
        if (GameApp.Scene && GameApp.Scene.cameras && GameApp.Scene.cameras.main) {
            GameApp.Scene.cameras.main.zoomTo(GameApp.State.zoomOut ? 0.35 : 1.0, 300, 'Cubic.easeInOut');
        }
        const btn = document.getElementById('btn-zoom');
        if (btn) btn.classList.toggle('chip--active', GameApp.State.zoomOut);
    }

    togglePause() {
        if (!GameApp.State.gameStarted || !GameApp.Scene) return;
        GameApp.Audio.playBtn();
        GameApp.State.isPaused = !GameApp.State.isPaused;
        const btn = document.getElementById('btn-pause');
        if (GameApp.State.isPaused) {
            GameApp.Scene.physics.pause();
            if (btn) { btn.textContent = '▶️'; btn.classList.add('icon-btn--active'); }
            this.showToast('Simulación Pausada');
        } else {
            GameApp.Scene.physics.resume();
            if (btn) { btn.textContent = '⏸️'; btn.classList.remove('icon-btn--active'); }
            this.showToast('Simulación Reanudada');
        }
    }

    updateHUD(time, scene) {
        if (time - this.lastUpdate < 300) return;
        this.lastUpdate = time;
        this.forceUpdateHUD(scene);
    }

    forceUpdateHUD(scene = GameApp.Scene) {
        if (!scene || !scene.hormigas) return;
        const st = GameApp.State.stats;
        const activeG = st.grupoSeleccionado;

        const counts = { explorar: 0, recolectar: 0, atacar: 0, defender: 0 };
        scene.hormigas.getChildren().forEach(h => {
            if (h.active && h.data && h.getData('grupo') == activeG) {
                counts[st.modoGrupo[activeG - 1]]++;
            }
        });

        document.getElementById('c-explorar').textContent = counts.explorar;
        document.getElementById('c-recolectar').textContent = counts.recolectar;
        document.getElementById('c-atacar').textContent = counts.atacar;
        document.getElementById('c-defender').textContent = counts.defender;

        document.getElementById('ui-resources').textContent = Math.floor(st.recursos);
        document.getElementById('ui-pop').textContent = `${st.hormigasVivas}/${st.maxHormigas}`;
        document.getElementById('ui-conquest').textContent = `${st.reinosKilled}/${TOTAL_KINGDOMS}`;

        const r = st.recursos;
        let nLvl = 1, nextReq = 300, prevReq = 0;
        if (r >= 15000) { nLvl = 5; nextReq = 15000; prevReq = 15000; }
        else if (r >= 6000) { nLvl = 4; nextReq = 15000; prevReq = 6000; }
        else if (r >= 2000) { nLvl = 3; nextReq = 6000; prevReq = 2000; }
        else if (r >= 300) { nLvl = 2; nextReq = 2000; prevReq = 300; }

        if (nLvl > st.nivelReina) { GameApp.Audio.playLevelUp(); this.showToast(`¡Tu hormiguero base subió al Nivel ${nLvl}!`); }
        st.nivelReina = nLvl;

        const rBar = document.getElementById('reina-bar');
        const rLvlText = document.getElementById('ui-queen-lvl');
        if (nLvl === 5) {
            if (rLvlText) rLvlText.textContent = 'NIVEL BASE: MÁXIMO (50 tropas/30s)';
            if (rBar) rBar.style.width = '100%';
        } else {
            if (rLvlText) rLvlText.textContent = `NIVEL BASE: ${nLvl} · Siguiente: ${Math.floor(r)}/${nextReq}`;
            const pct = ((r - prevReq) / (nextReq - prevReq)) * 100;
            if (rBar) rBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
        }

        const gPanel = document.getElementById('ui-active-group');
        if (gPanel) gPanel.textContent = 'GRUPO ACTIVO: ' + (activeG == 4 ? 'CÁMARA' : activeG);
        const dock = document.getElementById('command-dock');
        if (dock) dock.style.setProperty('--group-color', '#' + (GameApp.Config.COLORS[activeG - 1] || 0x888888).toString(16).padStart(6, '0'));

        document.querySelectorAll('.cmd-btn').forEach(b => b.classList.remove('cmd-btn--active'));
        if (activeG < 4) {
            const activeBtn = document.getElementById('btn-' + st.modoGrupo[activeG - 1]);
            if (activeBtn) activeBtn.classList.add('cmd-btn--active');
        }
    }

    showLoader() {
        const el = document.getElementById('boot-loader');
        if (el) el.classList.add('boot-loader--visible');
    }

    hideLoader() {
        const el = document.getElementById('boot-loader');
        if (el) el.classList.remove('boot-loader--visible');
    }

    gameOver(title, desc) {
        GameApp.State.isPaused = true;
        if (GameApp.Scene && GameApp.Scene.physics) GameApp.Scene.physics.pause();
        document.getElementById('go-title').textContent = title;
        document.getElementById('go-desc').textContent = desc;
        this.showScreen('screen-gameover');
    }
}
GameApp.UI = new UIManager();

/**
 * bootstrap.js — last file loaded. Wires up the DOM-driven UI and exposes
 * the two entry points the menu screens call: GameApp.initMode() and the
 * lazy Phaser.Game construction.
 */
function bootstrapPhaser() {
    const config = {
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: MainScene,
        transparent: false,
        backgroundColor: '#0d0d15',
        parent: 'phaser-container'
    };
    GameApp.Engine = new Phaser.Game(config);
    GameApp.State.gameStarted = true;
}

GameApp.initMode = function (mode) {
    GameApp.State.mode = mode;
    document.getElementById('screen-mode').classList.remove('screen--visible');
    document.getElementById('hud').hidden = false;

    if (mode === 'random') {
        GameApp.State.playerSpeciesId = Math.floor(Math.random() * 8) + 1;
        GameApp.State.stats.maxHormigas = SPECIES_DATA[GameApp.State.playerSpeciesId].maxPop;
    } else {
        GameApp.State.playerSpeciesId = 0;
        GameApp.State.stats.maxHormigas = 500;
    }

    GameApp.Audio.startMusicForMode(mode);
    GameApp.UI.showToast('Sistema Táctico Inicializado. ¡Protege a la Reina!');
    GameApp.UI.showLoader();

    GameApp.State.isPaused = false;
    const btn = document.getElementById('btn-pause');
    if (btn) { btn.textContent = '⏸️'; btn.classList.remove('icon-btn--active'); }

    if (!GameApp.Engine) {
        bootstrapPhaser();
    } else {
        GameApp.State.stats = { recursos: 0, hormigasVivas: 0, nivelReina: 1, reinosKilled: 0, maxHormigas: GameApp.State.stats.maxHormigas, grupoSeleccionado: 1, modoGrupo: ['explorar', 'explorar', 'explorar'] };
        GameApp.State.coloniesInfo = {};
        if (GameApp.Scene) GameApp.Scene.scene.restart();
    }
};

document.addEventListener('DOMContentLoaded', () => GameApp.UI.init());

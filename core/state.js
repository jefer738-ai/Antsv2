/**
 * GameApp — global namespace shared across every script file.
 * Loaded first so every other file can attach to it safely.
 */
const GameApp = {
    Config: {
        MAP_SIZE: 8000,
        CENTER: 4000,
        COLORS: [0xe2b340, 0x2ecc71, 0x9b59b6, 0x888888], // per-group marker colors (G1-G3 + camera)
        SPEED_EMPTY: 115,
        SPEED_LOADED: 55,
        vfx: true,
        showHP: true,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    State: {
        mode: 'normal',
        playerSpeciesId: 0,
        isPaused: true,
        zoomOut: false,
        stats: {
            recursos: 0,
            hormigasVivas: 0,
            nivelReina: 1,
            reinosKilled: 0,
            maxHormigas: 500,
            grupoSeleccionado: 1,
            modoGrupo: ['explorar', 'explorar', 'explorar']
        },
        coloniesInfo: {},
        gameStarted: false
    },
    Engine: null,
    Scene: null
};

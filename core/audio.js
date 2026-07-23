/**
 * AudioManager — Web Audio SFX (procedural, no assets) + streamed music beds.
 * Music elements are only constructed on first use (initTracks) instead of
 * at page load, so a visitor who never starts a match never pays for the
 * MP3 download.
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.bgmNormal = null;
        this.bgmBattle = null;
    }

    initCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    initTracks() {
        if (this.bgmNormal) return;
        this.bgmNormal = new Audio('https://kirev.vercel.app/Beneath_the_Thicket.mp3');
        this.bgmBattle = new Audio('https://kirev.vercel.app/Mandibles_and_Sand.mp3');
        this.bgmNormal.loop = true; this.bgmNormal.volume = 0.35;
        this.bgmBattle.loop = true; this.bgmBattle.volume = 0.22;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.sfxEnabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* audio unavailable — game continues silently */ }
    }

    playHit() { this.playTone(140 + Math.random() * 40, 'sawtooth', 0.08, 0.04); }
    playKill() { this.playTone(90, 'square', 0.25, 0.08); }
    playGather() {
        this.playTone(580, 'sine', 0.08, 0.04);
        setTimeout(() => this.playTone(750, 'sine', 0.12, 0.04), 80);
    }
    playLevelUp() {
        [440, 554, 659, 880].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.35, 0.08), i * 120);
        });
    }
    playBtn() { this.playTone(700, 'sine', 0.04, 0.04); }
    playVictory() { this.playTone(400, 'square', 1.0, 0.2); }

    toggleMusic(state) {
        this.musicEnabled = state;
        if (!this.bgmNormal) return;
        if (!state) { this.bgmNormal.pause(); this.bgmBattle.pause(); }
        else if (GameApp.State.gameStarted) {
            (GameApp.State.mode === 'random' ? this.bgmBattle : this.bgmNormal).play().catch(() => {});
        }
    }

    startMusicForMode(mode) {
        this.initTracks();
        if (!this.musicEnabled) return;
        this.bgmNormal.pause(); this.bgmBattle.pause();
        (mode === 'random' ? this.bgmBattle : this.bgmNormal).play().catch(() => {});
    }
}
GameApp.Audio = new AudioManager();

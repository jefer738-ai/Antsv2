/**
 * ParticleManager — short-lived combat/gather VFX bursts.
 * Uses Phaser's own `duration` + `stop`-on-complete lifecycle instead of
 * `setTimeout(() => emitter.destroy(), ms)`, so cleanup can never drift
 * out of sync with the actual particle lifespan.
 */
class ParticleManager {
    constructor(scene) {
        this.scene = scene;
    }

    _burst(x, y, texture, config) {
        if (!GameApp.Config.vfx || typeof x === 'undefined' || typeof y === 'undefined') return;
        const quantity = config.quantity || 10;
        const emitter = this.scene.add.particles(x, y, texture, Object.assign({ emitting: false }, config));
        emitter.explode(quantity);
        emitter.once('complete', () => emitter.destroy());
    }

    playHit(x, y) {
        this._burst(x, y, 'organic_dirt', {
            speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 },
            scale: { start: 0.1, end: 0 }, alpha: { start: 1, end: 0 },
            lifespan: 200, quantity: 3, blendMode: 'ADD', tint: 0xffaa00
        });
    }

    playDeath(x, y, colorTint) {
        this._burst(x, y, 'organic_dirt', {
            speed: { min: 100, max: 300 }, angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 }, alpha: { start: 1, end: 0 },
            lifespan: 500, quantity: 15, tint: colorTint
        });
    }

    playGather(x, y) {
        this._burst(x, y, 'biome_glow', {
            speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
            scale: { start: 0.05, end: 0 }, alpha: { start: 0.8, end: 0 },
            lifespan: 400, quantity: 5, blendMode: 'ADD', tint: 0x2ecc71
        });
    }
}

/**
 * AmbientEmitter — long-lived, low-frequency atmospheric particles used to
 * give each kingdom's biome a sense of motion (fireflies, sand drift, ash,
 * pollen...). One persistent emitter per kingdom instead of per-decoration,
 * so eight kingdoms cost eight emitters, not hundreds.
 */
class AmbientEmitter {
    static create(scene, texture, x, y, radius, config) {
        const emitZone = { type: 'random', source: new Phaser.Geom.Circle(0, 0, radius) };
        return scene.add.particles(x, y, texture, Object.assign({
            emitZone,
            frequency: 220,
            lifespan: 4000
        }, config));
    }
}

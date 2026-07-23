/**
 * TerrainBuilder — turns a flat tinted square into eight kingdoms that each
 * look and feel like a distinct place: their own ground color, their own
 * procedural scenery (drawn with Graphics primitives, no extra image
 * assets) and their own ambient particle weather.
 *
 * Nothing here is a static image — every territory is generated at
 * create()-time from the kingdom's `biome` descriptor in species.js, so a
 * ninth kingdom would only need a new biome entry, not new art.
 */
class TerrainBuilder {
    /** Two shared particle textures reused (tinted) by every biome's ambient weather. */
    static ensureParticleTextures(scene) {
        if (scene.textures.exists('particle_soft')) return;

        const soft = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let r = 16; r > 0; r -= 1) {
            soft.fillStyle(0xffffff, (16 - r) / 60);
            soft.fillCircle(16, 16, r);
        }
        soft.generateTexture('particle_soft', 32, 32);

        const speck = scene.make.graphics({ x: 0, y: 0, add: false });
        speck.fillStyle(0xffffff, 1).fillCircle(4, 4, 3);
        speck.generateTexture('particle_speck', 8, 8);
    }

    /** Paints the organic ground patch + ambient light + scenery + weather for one kingdom. */
    static buildTerritory(scene, cx, cy, radius, biome) {
        TerrainBuilder.ensureParticleTextures(scene);
        TerrainBuilder._paintGround(scene, cx, cy, radius, biome);
        TerrainBuilder._scatterDecoration(scene, cx, cy, radius, biome);
        TerrainBuilder._spawnAmbientWeather(scene, cx, cy, radius, biome);
        if (biome.fog > 0.18) TerrainBuilder._addFog(scene, cx, cy, radius, biome);
    }

    static _paintGround(scene, cx, cy, radius, biome) {
        // Irregular watercolor-style patch: several offset soft blobs instead of one perfect circle.
        const blobCount = 5;
        for (let i = 0; i < blobCount; i++) {
            const ox = Phaser.Math.Between(-radius * 0.25, radius * 0.25);
            const oy = Phaser.Math.Between(-radius * 0.25, radius * 0.25);
            const size = radius * Phaser.Math.FloatBetween(1.3, 1.7);
            const img = scene.add.image(cx + ox, cy + oy, 'biome_glow');
            img.setTint(biome.base).setDisplaySize(size, size).setAlpha(0.5).setDepth(0.1);
        }
        // Brighter clearing glow at the kingdom core.
        scene.add.image(cx, cy, 'biome_glow').setTint(biome.glow).setDisplaySize(radius * 1.1, radius * 1.1).setAlpha(0.25).setDepth(0.2).setBlendMode(Phaser.BlendModes.ADD);
    }

    static _scatterDecoration(scene, cx, cy, radius, biome) {
        const gfx = scene.add.graphics().setDepth(0.5);
        const draw = TerrainBuilder.DECORATORS[biome.decoration] || TerrainBuilder.DECORATORS.canopy;
        const count = Phaser.Math.Between(16, 24);

        for (let i = 0; i < count; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = Phaser.Math.FloatBetween(radius * 0.35, radius * 0.92);
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;
            draw(gfx, x, y, biome);
        }
    }

    static _spawnAmbientWeather(scene, cx, cy, radius, biome) {
        const spec = TerrainBuilder.WEATHER[biome.particle] || TerrainBuilder.WEATHER.dust;
        const emitter = AmbientEmitter.create(scene, spec.texture, cx, cy, radius * 0.85, {
            tint: biome.glow,
            speed: spec.speed,
            scale: spec.scale,
            alpha: spec.alpha,
            lifespan: spec.lifespan,
            frequency: spec.frequency,
            blendMode: spec.blend,
            gravityY: spec.gravityY || 0
        });
        emitter.setDepth(0.6);
        scene.ambientEmitters.push(emitter);
    }

    static _addFog(scene, cx, cy, radius, biome) {
        const fog = scene.add.image(cx, cy, 'biome_glow')
            .setTint(0x05050a).setDisplaySize(radius * 2.1, radius * 2.1)
            .setAlpha(biome.fog).setDepth(0.8).setBlendMode(Phaser.BlendModes.MULTIPLY);
        scene.tweens.add({ targets: fog, alpha: biome.fog * 0.5, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
}

/** decoration(x,y) painters — pure Graphics, zero extra assets. */
TerrainBuilder.DECORATORS = {
    canopy(gfx, x, y, biome) {
        const r = Phaser.Math.Between(22, 42);
        gfx.fillStyle(0x0a1a0e, 0.9).fillCircle(x, y + r * 0.6, r * 0.35);
        gfx.fillStyle(biome.base, 0.85).fillCircle(x, y, r);
        gfx.fillStyle(biome.accent, 0.35).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.5);
    },
    dunes(gfx, x, y, biome) {
        const w = Phaser.Math.Between(60, 110), h = Phaser.Math.Between(14, 24);
        gfx.fillStyle(biome.base, 0.8);
        gfx.beginPath();
        gfx.arc(x, y, w / 2, Math.PI, 0, false);
        gfx.fillPath();
        gfx.fillStyle(biome.accent, 0.3).fillEllipse(x, y - h * 0.2, w * 0.7, h);
    },
    crystals(gfx, x, y, biome) {
        const s = Phaser.Math.Between(14, 30);
        const pts = [{ x, y: y - s }, { x: x + s * 0.5, y }, { x, y: y + s }, { x: x - s * 0.5, y }];
        gfx.fillStyle(biome.accent, 0.55).fillPoints(pts, true);
        gfx.fillStyle(biome.glow, 0.8).fillCircle(x, y, s * 0.18);
    },
    embers(gfx, x, y, biome) {
        const r = Phaser.Math.Between(16, 34);
        const pts = [];
        for (let a = 0; a < Math.PI * 2; a += 1.05) {
            pts.push({ x: x + Math.cos(a) * Phaser.Math.FloatBetween(0.6, 1) * r, y: y + Math.sin(a) * Phaser.Math.FloatBetween(0.6, 1) * r });
        }
        gfx.fillStyle(0x1a0e0e, 0.9).fillPoints(pts, true);
        gfx.fillStyle(biome.glow, 0.6).fillCircle(x, y, r * 0.22);
    },
    ramparts(gfx, x, y, biome) {
        const bw = 26, bh = 16;
        for (let i = -1; i <= 1; i++) {
            gfx.fillStyle(biome.base, 0.85).fillRect(x + i * (bw + 3) - bw / 2, y - bh / 2, bw, bh);
        }
        gfx.lineStyle(2, biome.accent, 0.5).strokeRect(x - bw * 1.5 - 4, y - bh / 2, bw * 3 + 8, bh);
    },
    meadow(gfx, x, y, biome) {
        const r = Phaser.Math.Between(18, 34);
        gfx.fillStyle(0xffffff, 0.18).fillCircle(x, y, r);
        gfx.fillStyle(biome.accent, 0.6).fillCircle(x + r * 0.3, y + r * 0.5, r * 0.15);
    },
    mounds(gfx, x, y, biome) {
        const w = Phaser.Math.Between(34, 60), h = w * 0.75;
        gfx.fillStyle(biome.base, 0.85).fillEllipse(x, y, w, h);
        gfx.lineStyle(2, biome.accent, 0.4);
        for (let i = 1; i <= 3; i++) gfx.strokeEllipse(x, y + h * 0.1 * i, w * (1 - i * 0.18), h * (1 - i * 0.18));
    },
    bioluminescence(gfx, x, y, biome) {
        const r = Phaser.Math.Between(20, 38);
        gfx.fillStyle(0x081a10, 0.9).fillCircle(x, y, r);
        gfx.lineStyle(1.5, biome.glow, 0.7);
        gfx.beginPath();
        gfx.moveTo(x - r * 0.6, y);
        gfx.lineTo(x, y - r * 0.5);
        gfx.lineTo(x + r * 0.6, y);
        gfx.strokePath();
        gfx.fillStyle(biome.glow, 0.9).fillCircle(x, y - r * 0.5, 3);
    }
};

/** ambient weather presets keyed by biome.particle */
TerrainBuilder.WEATHER = {
    fireflies: { texture: 'particle_soft', speed: { min: 4, max: 14 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 3200, frequency: 260, blend: 'ADD' },
    sand: { texture: 'particle_speck', speed: { min: 20, max: 46 }, scale: { start: 0.9, end: 0.2 }, alpha: { start: 0.6, end: 0 }, lifespan: 2600, frequency: 180, blend: 'NORMAL' },
    spores: { texture: 'particle_soft', speed: { min: 3, max: 10 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 3600, frequency: 300, blend: 'ADD' },
    ash: { texture: 'particle_speck', speed: { min: 10, max: 24 }, scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.55, end: 0 }, lifespan: 3000, frequency: 220, blend: 'NORMAL', gravityY: -6 },
    dust: { texture: 'particle_speck', speed: { min: 6, max: 16 }, scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.35, end: 0 }, lifespan: 2800, frequency: 320, blend: 'NORMAL' },
    pollen: { texture: 'particle_soft', speed: { min: 8, max: 20 }, scale: { start: 0.45, end: 0 }, alpha: { start: 0.7, end: 0 }, lifespan: 3000, frequency: 240, blend: 'ADD' }
};

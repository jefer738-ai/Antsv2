/**
 * MainScene — the Phaser scene driving the whole match: world generation,
 * player/enemy spawning, input, timers and the per-frame simulation loop.
 */
class MainScene extends Phaser.Scene {
    constructor() { super({ key: 'MainScene' }); }

    preload() {
        this.load.spritesheet('img_ant', 'https://kirev.vercel.app/Hormigas.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('img_termita', 'https://kirev.vercel.app/Termitas.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('img_duna', 'https://kirev.vercel.app/Dunas.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('img_nube', 'https://kirev.vercel.app/Nube.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('img_cueva', 'https://kirev.vercel.app/Cueva.png', { frameWidth: 32, frameHeight: 32 });
    }

    safeCreateAnim(key, texture) {
        if (this.textures.exists(texture) && !this.anims.exists(key)) {
            this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
        }
    }

    create() {
        GameApp.Scene = this;
        this.vfx = new ParticleManager(this);
        this.ambientEmitters = [];

        if (GameApp.State.isPaused) this.physics.pause();

        this.safeCreateAnim('walk_ant', 'img_ant');
        this.safeCreateAnim('walk_termita', 'img_termita');
        this.safeCreateAnim('walk_duna', 'img_duna');
        this.safeCreateAnim('walk_nube', 'img_nube');
        this.safeCreateAnim('walk_cueva', 'img_cueva');

        this.cameras.main.setBounds(0, 0, GameApp.Config.MAP_SIZE, GameApp.Config.MAP_SIZE);
        this.physics.world.setBounds(0, 0, GameApp.Config.MAP_SIZE, GameApp.Config.MAP_SIZE);

        this._buildBaseGround();
        this._buildHomeNest();
        this.centerCamera();

        this.hormigas = this.physics.add.group();
        this.recursos = this.physics.add.group();
        this.enemigos = this.physics.add.group();

        this.marcadoresDestino = [];
        for (let i = 0; i < 3; i++) {
            const m = this.add.circle(0, 0, 40, GameApp.Config.COLORS[i], 0.3).setStrokeStyle(4, GameApp.Config.COLORS[i]).setVisible(false).setDepth(2);
            m.targetColonyId = null;
            this.marcadoresDestino.push(m);
        }

        this.buildWorld();
        this._buildMinimap();
        this.setupInputs();
        this.setupTimers();

        this.scale.on('resize', () => this._positionMinimap());
        GameApp.UI.hideLoader();
    }

    /** Procedural dirt base — random speckle tile instead of a flat fill, plus the reusable radial glow texture every biome tints. */
    _buildBaseGround() {
        const dirtGen = this.make.graphics({ x: 0, y: 0, add: false });
        dirtGen.fillStyle(0x0d0d15, 1).fillRect(0, 0, 512, 512);
        for (let i = 0; i < 4000; i++) {
            const px = Phaser.Math.Between(0, 512), py = Phaser.Math.Between(0, 512), size = Phaser.Math.Between(1, 4);
            const colors = [0x151520, 0x1a1a25, 0x0a0a10];
            dirtGen.fillStyle(colors[Phaser.Math.Between(0, 2)], Phaser.Math.FloatBetween(0.3, 0.9));
            Phaser.Math.Between(0, 1) === 0 ? dirtGen.fillCircle(px, py, size) : dirtGen.fillRect(px, py, size * 2, size);
        }
        dirtGen.generateTexture('organic_dirt', 512, 512);
        this.add.tileSprite(GameApp.Config.CENTER, GameApp.Config.CENTER, GameApp.Config.MAP_SIZE, GameApp.Config.MAP_SIZE, 'organic_dirt');

        const glowGen = this.make.graphics({ x: 0, y: 0, add: false });
        for (let r = 256; r > 0; r -= 8) { glowGen.fillStyle(0xffffff, 0.05); glowGen.fillCircle(256, 256, r); }
        glowGen.generateTexture('biome_glow', 512, 512);

        // Scattered rocks across the neutral wilderness between kingdoms.
        for (let i = 0; i < 150; i++) {
            const rx = Phaser.Math.Between(100, GameApp.Config.MAP_SIZE - 100), ry = Phaser.Math.Between(100, GameApp.Config.MAP_SIZE - 100);
            if (Phaser.Math.Distance.Between(rx, ry, GameApp.Config.CENTER, GameApp.Config.CENTER) < 500) continue;
            const rock = this.add.graphics({ x: rx, y: ry }).setDepth(0.4);
            rock.fillStyle(0x333344, 1).lineStyle(3, 0x11111a);
            const pts = [];
            for (let a = 0; a < Math.PI * 2; a += 0.8) pts.push({ x: Math.cos(a) * Phaser.Math.Between(15, 45), y: Math.sin(a) * Phaser.Math.Between(15, 45) });
            rock.fillPoints(pts, true).strokePoints(pts, true);
        }
    }

    _buildHomeNest() {
        const isRandom = GameApp.State.mode === 'random';
        const homeSpecies = isRandom ? SPECIES_DATA[GameApp.State.playerSpeciesId] : null;
        const nestColor = homeSpecies ? homeSpecies.color : 0x5d4037;
        const homeBiome = homeSpecies ? homeSpecies.biome : { base: 0x1a140e, accent: 0xc98a4b, glow: 0xe8c290, decoration: 'mounds', particle: 'dust', fog: 0 };

        TerrainBuilder.buildTerritory(this, GameApp.Config.CENTER, GameApp.Config.CENTER, 900, homeBiome);
        this.add.circle(GameApp.Config.CENTER, GameApp.Config.CENTER, 65, nestColor).setStrokeStyle(4, 0x333333).setDepth(1);
        this.add.image(GameApp.Config.CENTER, GameApp.Config.CENTER, 'biome_glow').setTint(nestColor).setDisplaySize(400, 400).setAlpha(0.6).setDepth(1.1).setBlendMode(Phaser.BlendModes.ADD);
    }

    centerCamera() { this.cameras.main.pan(GameApp.Config.CENTER, GameApp.Config.CENTER, 500, 'Power2'); }

    buildWorld() {
        KINGDOMS.forEach(k => {
            const species = SPECIES_DATA[k.id];
            if (GameApp.State.mode === 'random' && k.id === GameApp.State.playerSpeciesId) {
                this.crearColonia(k.x, k.y, 'HORMIGAS ORIG.', '🐜', 9, 30, EXTRA_UNIT_STATS[9]);
            } else {
                this.crearColonia(k.x, k.y, species.name, species.e, k.id, k.pop, species.biome);
            }
        });

        this.spawnRecursos(250, false);
        for (let i = 0; i < 10; i++) this.crearHormigaPlayer((i % 3) + 1);
    }

    crearColonia(x, y, nombre, emoji, id, pop, biomeOrExtra) {
        const biome = biomeOrExtra && biomeOrExtra.base !== undefined ? biomeOrExtra : { base: 0x333333, accent: 0xe74c3c, glow: 0xff8a5c, decoration: 'mounds', particle: 'dust', fog: 0 };
        TerrainBuilder.buildTerritory(this, x, y, 750, biome);

        this.add.circle(x, y, 150, 0xffffff, 0.05).setStrokeStyle(2, 0x555).setDepth(1);
        const lbl = this.add.text(x, y - 180, `${nombre} (${pop})`, { fontFamily: 'Inter', fontSize: '28px', fill: '#fff', fontStyle: '800' }).setOrigin(0.5).setDepth(4);

        const spriteKey = EntityFactory.getSpriteKey(id, emoji);
        let mini;
        if (spriteKey && this.textures.exists(spriteKey)) {
            mini = this.add.sprite(x, y, spriteKey, 0).setOrigin(0.5).setDisplaySize(90, 90).setDepth(2);
            if (id === 7) mini.setTint(0xaaaaaa);
        } else {
            mini = this.add.text(x, y, emoji, { fontSize: '90px' }).setOrigin(0.5).setDepth(2);
        }

        GameApp.State.coloniesInfo[id] = { nombre, vivo: pop, max: id == 7 ? 50 : (id == 6 ? 6 : pop), mini, label: lbl, x, y, emoji, killed: false };
        for (let i = 0; i < pop; i++) this.spawnEnemigoUnit(x, y, id, false);
    }

    spawnEnemigoUnit(x, y, id, isMission = false, tPos = null) {
        const emoji = GameApp.State.coloniesInfo[id].emoji;
        const startX = x + Phaser.Math.Between(-120, 120), startY = y + Phaser.Math.Between(-120, 120);

        const spriteKey = EntityFactory.getSpriteKey(id, emoji);
        let e;

        if (spriteKey && this.textures.exists(spriteKey)) {
            e = this.add.sprite(startX, startY, spriteKey).setOrigin(0.5).setDepth(3);
            if (id === 7) e.setTint(0xaaaaaa);
            try { e.play('walk_' + spriteKey.split('_')[1]); } catch (err) {}
        } else {
            e = this.add.text(startX, startY, emoji, { fontSize: '32px' }).setOrigin(0.5).setDepth(3);
        }

        const { hp, p, v } = getUnitCombatStats(id);
        const scale = (hp + p + (v * 2)) / 350 + 0.5;
        if (isMission && !tPos) tPos = { x: GameApp.Config.CENTER, y: GameApp.Config.CENTER };

        if (spriteKey) e.setDisplaySize(32 * scale, 32 * scale);
        else e.setScale(scale).setStroke('#000', 4);

        this.physics.add.existing(e);
        e.setData({ hp, maxHp: hp, poder: p, vel: v, tipo: id, homeX: x, homeY: y, isMission, targetPos: tPos, carga: 0, targetRec: null, valor: hp, stamina: 100 });
        e.setData('hpBar', EntityFactory.createHPBar(this, e));
        this.enemigos.add(e);
    }

    crearHormigaPlayer(gId) {
        const st = GameApp.State.stats;
        if (st.hormigasVivas >= st.maxHormigas) return;

        const isTank = (st.hormigasVivas > 0 && st.hormigasVivas % 100 === 0);
        const startX = GameApp.Config.CENTER + Phaser.Math.Between(-40, 40), startY = GameApp.Config.CENTER + Phaser.Math.Between(-40, 40);

        const shadow = this.add.circle(startX, startY + 8, isTank ? 25 : 14, GameApp.Config.COLORS[gId - 1], 0.4).setDepth(2);

        const pId = GameApp.State.playerSpeciesId;
        const emoji = GameApp.State.mode === 'random' ? SPECIES_DATA[pId].e : '🐜';
        const spriteKey = EntityFactory.getSpriteKey(pId, emoji);
        let h;

        if (spriteKey && this.textures.exists(spriteKey)) {
            h = this.add.sprite(startX, startY, spriteKey).setOrigin(0.5).setDepth(4);
            h.setDisplaySize(isTank ? 48 : 30, isTank ? 48 : 30);
            if (pId === 7) h.setTint(0xaaaaaa);
            try { h.play('walk_' + spriteKey.split('_')[1]); } catch (err) {}
        } else {
            h = this.add.text(startX, startY, emoji, { fontSize: isTank ? '48px' : '30px' }).setOrigin(0.5).setDepth(4);
            h.setStroke(Phaser.Display.Color.IntegerToColor(GameApp.Config.COLORS[gId - 1]).rgba, 6);
            if (GameApp.State.mode === 'random' && pId === 7) h.setTint(0xaaaaaa);
        }

        this.physics.add.existing(h);

        const hpVal = GameApp.State.mode === 'random' ? SPECIES_DATA[pId].hp : (isTank ? 600 : 100);
        const pVal = GameApp.State.mode === 'random' ? SPECIES_DATA[pId].p : (isTank ? 45 : 8);

        h.setData({ grupo: gId, carga: 0, hp: hpVal, maxHp: hpVal, poder: pVal, target: null, offset: Phaser.Math.Between(0, 360), shadow });
        h.setData('hpBar', EntityFactory.createHPBar(this, h));

        this.hormigas.add(h);
        st.hormigasVivas++;
        GameApp.UI.forceUpdateHUD(this);
    }

    spawnRecursos(cant, isDry) {
        for (let i = 0; i < cant; i++) {
            const x = Phaser.Math.Between(500, GameApp.Config.MAP_SIZE - 500), y = Phaser.Math.Between(500, GameApp.Config.MAP_SIZE - 500);
            if (Phaser.Math.Distance.Between(x, y, GameApp.Config.CENTER, GameApp.Config.CENTER) < 600) continue;
            EntityFactory.createResource(this, x, y, isDry);
        }
    }

    matarEnemigo(e, isPlayerKill) {
        if (!e || !e.active || typeof e.x === 'undefined') return;
        const tid = e.getData('tipo');
        const info = GameApp.State.coloniesInfo[tid];

        if (e.getData('hpBar')) { e.getData('hpBar').bg.destroy(); e.getData('hpBar').fg.destroy(); }
        this.vfx.playDeath(e.x, e.y, isPlayerKill ? 0xe74c3c : 0x888888);
        if (isPlayerKill) GameApp.Audio.playKill();

        if (e.getData('hasRobbed') && isPlayerKill) {
            GameApp.State.stats.recursos += 200;
        } else {
            const valMeat = e.getData('valor') || 100;
            EntityFactory.createResource(this, e.x, e.y, true, valMeat);
        }

        if (info) {
            info.vivo--;
            if (info.vivo <= 0 && !info.killed) {
                info.mini.setTint(0x444444); info.label.setText('CONQUISTADO 💀').setColor('#888');
                info.killed = true;
                GameApp.State.stats.reinosKilled++;
                GameApp.Audio.playVictory();
                if (GameApp.State.stats.reinosKilled >= TOTAL_KINGDOMS) {
                    GameApp.UI.gameOver('VICTORIA MILITAR', '¡Dominación total del ecosistema conseguida! Has demostrado ser la especie superior.');
                }
            } else if (!info.killed) {
                info.label.setText(`${info.nombre} (${info.vivo})`);
            }
        }
        e.destroy();
        GameApp.UI.updateHUD(this.time.now, this);
    }

    _buildMinimap() {
        const mSize = window.innerWidth < 768 ? 110 : 190;
        this.minimapSize = mSize;
        this.minimap = this.cameras.add(0, 0, mSize, mSize)
            .setZoom(mSize / GameApp.Config.MAP_SIZE)
            .setBackgroundColor(0x0a0a14)
            .setBounds(0, 0, GameApp.Config.MAP_SIZE, GameApp.Config.MAP_SIZE);
        this.minimap.alpha = 0.9;
        this._positionMinimap();

        this.rectVision = this.add.graphics({ lineStyle: { width: 60, color: 0xe2b340, alpha: 0.8 } });
        this.cameras.main.ignore(this.rectVision);
    }

    _positionMinimap() {
        if (!this.minimap) return;
        const mSize = window.innerWidth < 768 ? 110 : 190;
        this.minimapSize = mSize;
        this.minimap.setSize(mSize, mSize).setZoom(mSize / GameApp.Config.MAP_SIZE);
        this.minimap.setPosition(this.scale.width - mSize - 16, 16);
    }

    setupInputs() {
        this.input.on('pointerdown', (p) => {
            if (GameApp.State.isPaused) return;
            const st = GameApp.State.stats;
            if (st.grupoSeleccionado < 4 && p.getDuration() < 200) {
                const wp = p.positionToCamera(this.cameras.main);
                const gIdx = st.grupoSeleccionado - 1;
                const m = this.marcadoresDestino[gIdx];

                m.setPosition(wp.x, wp.y).setVisible(true);
                m.targetColonyId = null;

                if (st.modoGrupo[gIdx] === 'atacar') {
                    for (const id in GameApp.State.coloniesInfo) {
                        const c = GameApp.State.coloniesInfo[id];
                        if (!c.killed && Phaser.Math.Distance.Between(wp.x, wp.y, c.x, c.y) < 160) {
                            m.targetColonyId = id; GameApp.Audio.playBtn(); break;
                        }
                    }
                }
            }
        });

        this.input.on('pointermove', (p) => {
            if (GameApp.State.isPaused) return;
            if (p.isDown) {
                this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
            }
        });
    }

    setupTimers() {
        this.time.addEvent({
            delay: 30000, loop: true, callback: () => {
                if (GameApp.State.isPaused) return;
                const st = GameApp.State.stats;
                const queenCost = [0, 0, 20, 80, 200, 500][st.nivelReina] || 0;
                st.recursos = Math.max(0, st.recursos - queenCost);

                const n = [0, 2, 5, 10, 25, 50][st.nivelReina];
                for (let i = 0; i < n; i++) this.crearHormigaPlayer((i % 3) + 1);
                GameApp.UI.forceUpdateHUD(this);
            }
        });

        this.time.addEvent({ delay: 35000, loop: true, callback: () => this.regenColony(9, 30, 3) });
        this.time.addEvent({ delay: 60000, loop: true, callback: () => this.regenColony(7, 50, 5) });
        this.time.addEvent({ delay: 300000, loop: true, callback: () => this.raidBees() });
        this.time.addEvent({ delay: 180000, loop: true, callback: () => this.spawnThief() });
        this.time.addEvent({ delay: 600000, loop: true, callback: () => this.spawnRecursos(100, true) });
    }

    regenColony(id, maxPop, amt) {
        if (GameApp.State.isPaused) return;
        const info = GameApp.State.coloniesInfo[id];
        if (info && !info.killed && info.vivo < maxPop) {
            for (let i = 0; i < amt; i++) { if (info.vivo < maxPop) { this.spawnEnemigoUnit(info.x, info.y, id); info.vivo++; } }
            GameApp.UI.updateHUD(this.time.now, this);
        }
    }

    raidBees() {
        if (GameApp.State.isPaused) return;
        const info = GameApp.State.coloniesInfo[6];
        if (info && !info.killed && info.vivo < 6) {
            for (let i = 0; i < 2; i++) {
                if (info.vivo < 6) {
                    let tx = GameApp.Config.CENTER, ty = GameApp.Config.CENTER;
                    if (Math.random() > 0.5) {
                        const keys = Object.keys(GameApp.State.coloniesInfo).filter(k => k != 6 && !GameApp.State.coloniesInfo[k].killed);
                        if (keys.length > 0) {
                            const rID = keys[Math.floor(Math.random() * keys.length)];
                            tx = GameApp.State.coloniesInfo[rID].x; ty = GameApp.State.coloniesInfo[rID].y;
                        }
                    }
                    this.spawnEnemigoUnit(info.x, info.y, 6, true, { x: tx, y: ty }); info.vivo++;
                }
            }
        }
    }

    spawnThief() {
        if (GameApp.State.isPaused) return;
        const info = GameApp.State.coloniesInfo[2];
        if (info && !info.killed) this.spawnEnemigoUnit(info.x, info.y, 2, true, { x: GameApp.Config.CENTER, y: GameApp.Config.CENTER });
    }

    update(time, delta) {
        if (GameApp.State.isPaused) return;

        const vw = window.innerWidth / this.cameras.main.zoom, vh = window.innerHeight / this.cameras.main.zoom;
        this.rectVision.clear().lineStyle(40, 0xe2b340, 0.8).strokeRect(0, 0, vw, vh).setPosition(this.cameras.main.scrollX, this.cameras.main.scrollY);
        GameApp.UI.updateHUD(time, this);

        const st = GameApp.State.stats;
        const pId = GameApp.State.playerSpeciesId;
        const myVel = GameApp.State.mode === 'random' ? SPECIES_DATA[pId].v : GameApp.Config.SPEED_EMPTY;

        // 1. Combat resolves before movement filtering so this frame's deaths are excluded below.
        const separar = (o1, o2) => {
            if (!o1 || !o2 || !o1.active || !o2.active || typeof o1.x === 'undefined' || typeof o2.x === 'undefined') return;
            if (o1.getData('carga') > 0 || o2.getData('carga') > 0) return;
            const dx = o1.x - o2.x, dy = o1.y - o2.y, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0 && dist < 30) { o1.x += (dx / dist) * 2.5; o1.y += (dy / dist) * 2.5; }
        };

        this.physics.overlap(this.hormigas, this.hormigas, separar);
        this.physics.overlap(this.enemigos, this.enemigos, separar);
        this.physics.overlap(this.hormigas, this.enemigos, (h, e) => CombatSystem.resolveMelee(delta, h, e, this));
        this.physics.overlap(this.enemigos, this.enemigos, (e1, e2) => CombatSystem.resolveInfighting(delta, e1, e2, this));

        // 2. Only entities with a live body/position survive into this frame's AI/movement pass.
        const validHormigas = this.hormigas.getChildren().filter(h => h && h.active && h.body && typeof h.x !== 'undefined');
        const validEnemigos = this.enemigos.getChildren().filter(e => e && e.active && e.body && typeof e.x !== 'undefined');
        const validRecursos = this.recursos.getChildren().filter(r => r && r.active && r.body && typeof r.x !== 'undefined');

        // 3. Resources being hauled home.
        validRecursos.forEach(res => {
            if (!res || !res.active || typeof res.x === 'undefined') return;

            let ants = res.getData('antsAttached');
            if (ants && ants.length > 0) {
                ants = ants.filter(a => a && a.active && typeof a.x !== 'undefined');
                res.setData('antsAttached', ants);

                if (ants.length > 0) {
                    let isPlayer = true, tx = GameApp.Config.CENTER, ty = GameApp.Config.CENTER;
                    const req = res.getData('maxAnts'), speed = (ants.length >= req - 1) ? GameApp.Config.SPEED_LOADED : GameApp.Config.SPEED_LOADED * 0.15;

                    const leader = ants[0];
                    if (leader.getData('tipo')) { tx = leader.getData('homeX'); ty = leader.getData('homeY'); isPlayer = false; }

                    this.physics.moveTo(res, tx, ty, speed);
                    ants.forEach(a => { if (a && a.active && typeof a.x !== 'undefined') a.setPosition(res.x, res.y); });

                    if (Phaser.Math.Distance.Between(res.x, res.y, tx, ty) < 80) {
                        if (isPlayer) {
                            const val = res.getData('valor');
                            st.recursos += val;
                            GameApp.Audio.playGather();
                            this.vfx.playGather(GameApp.Config.CENTER, GameApp.Config.CENTER);
                            if (GameApp.State.mode === 'random' && st.recursos >= 15000) GameApp.UI.gameOver('VICTORIA ECONÓMICA', '¡Has acumulado 15,000 recursos demostrando superioridad global!');
                        }
                        ants.forEach(a => { if (a && a.active && a.data) { a.setData('carga', 0); a.setData('target', null); a.setData('targetRec', null); a.setAlpha(1); } });
                        res.destroy(); GameApp.UI.forceUpdateHUD(this);
                    }
                }
            }
        });

        // 4. Player units.
        validHormigas.forEach(h => {
            if (!h || !h.active || typeof h.x === 'undefined') return;

            const gIdx = h.getData('grupo') - 1, modo = st.modoGrupo[gIdx], m = this.marcadoresDestino[gIdx];

            const shadow = h.getData('shadow');
            if (shadow && shadow.active && typeof shadow.x !== 'undefined') { shadow.setPosition(h.x, h.y + 8); shadow.setAlpha(h.getData('carga') > 0 ? 0.2 : 0.4); }
            if (h.data.values.hpBar) h.data.values.hpBar.update(h.x, h.y, h.data.values.hp / h.data.values.maxHp);

            if (h.type === 'Sprite' && h.body) {
                const isMoving = Math.abs(h.body.velocity.x) > 10 || Math.abs(h.body.velocity.y) > 10;
                if (h.anims && h.anims.currentAnim) {
                    if (!isMoving && h.anims.isPlaying) { h.stop(); h.setFrame(0); }
                    else if (isMoving && !h.anims.isPlaying) { h.play(h.anims.currentAnim.key, true); }
                }
            }

            if (h.getData('carga') > 0) return;

            if (modo === 'recolectar') {
                let t = h.getData('target');
                let tAtt = (t && t.active && typeof t.x !== 'undefined') ? t.getData('antsAttached') : null;

                if (!t || !t.active || !t.body || !tAtt || tAtt.length >= t.getData('maxAnts') || typeof t.x === 'undefined') {
                    let best = null, minDist = Infinity;
                    const sx = (m && m.visible) ? m.x : h.x, sy = (m && m.visible) ? m.y : h.y;

                    validRecursos.forEach(rec => {
                        if (!rec || !rec.active || typeof rec.x === 'undefined') return;
                        const recAtt = rec.getData('antsAttached');
                        if (recAtt && recAtt.length < rec.getData('maxAnts')) {
                            if (GameApp.State.mode === 'random' && SPECIES_DATA[pId].diet === 'meat' && !rec.getData('isMeat')) return;
                            let dist = Phaser.Math.Distance.Between(sx, sy, rec.x, rec.y);
                            if (rec.getData('isMeat')) dist -= 2000;
                            if (dist < minDist) { minDist = dist; best = rec; }
                        }
                    });
                    if (best) h.setData('target', best);
                }

                const tFinal = h.getData('target');
                if (tFinal && tFinal.active && typeof tFinal.x !== 'undefined') {
                    this.physics.moveToObject(h, tFinal, myVel);
                    if (Phaser.Math.Distance.Between(h.x, h.y, tFinal.x, tFinal.y) < 30) {
                        tFinal.getData('antsAttached').push(h); h.setData('carga', 10); h.setAlpha(0.6);
                    }
                } else this.physics.moveTo(h, GameApp.Config.CENTER, GameApp.Config.CENTER, myVel / 2);
            }
            else if (modo === 'defender') {
                const intruders = validEnemigos.filter(e => Phaser.Math.Distance.Between(GameApp.Config.CENTER, GameApp.Config.CENTER, e.x, e.y) < 500);
                const closest = this.physics.closest(h, intruders);

                if (closest && closest.active && typeof closest.x !== 'undefined' && Phaser.Math.Distance.Between(h.x, h.y, closest.x, closest.y) < 500) {
                    this.physics.moveToObject(h, closest, myVel + 20);
                } else {
                    const a = (time / 1500) + h.getData('offset');
                    this.physics.moveTo(h, GameApp.Config.CENTER + Math.cos(a) * 180, GameApp.Config.CENTER + Math.sin(a) * 180, myVel);
                }
            }
            else if (modo === 'atacar') {
                if (m && m.visible) {
                    let tx = m.x, ty = m.y;
                    if (m.targetColonyId && GameApp.State.coloniesInfo[m.targetColonyId] && !GameApp.State.coloniesInfo[m.targetColonyId].killed) {
                        tx = GameApp.State.coloniesInfo[m.targetColonyId].x; ty = GameApp.State.coloniesInfo[m.targetColonyId].y; m.setPosition(tx, ty);
                    }
                    this.physics.moveTo(h, tx, ty, myVel);
                } else if (h.body) h.body.setVelocity(0);
            }
            else {
                if (m && m.visible) { this.physics.moveToObject(h, m, myVel); } else if (h.body) h.body.setVelocity(0);
            }
        });

        // 5. Enemy AI.
        validEnemigos.forEach(e => {
            if (!e || !e.active || typeof e.x === 'undefined') return;

            if (e.data.values.hpBar) e.data.values.hpBar.update(e.x, e.y, e.data.values.hp / e.data.values.maxHp);
            if (e.type === 'Sprite' && e.body) {
                const isMoving = Math.abs(e.body.velocity.x) > 10 || Math.abs(e.body.velocity.y) > 10;
                if (e.anims && e.anims.currentAnim) {
                    if (!isMoving && e.anims.isPlaying) { e.stop(); e.setFrame(0); }
                    else if (isMoving && !e.anims.isPlaying) { e.play(e.anims.currentAnim.key, true); }
                }
            }
            EnemyAI.update(e, this, validRecursos, [...validHormigas, ...validEnemigos.filter(ent => ent.getData('tipo') !== e.getData('tipo'))]);
        });
    }
}

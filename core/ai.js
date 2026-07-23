/**
 * EnemyAI — autonomous behavior per unit "role" (gatherer / guard / raider
 * / thief). Roles are looked up by species id, but the branching happens
 * on the role name rather than a chain of raw numeric ids, so adding a
 * ninth species only means adding one entry to ROLE_BY_SPECIES.
 */
const ROLE_BY_SPECIES = {
    1: 'guard',
    2: 'thief',    // isMission handled per-instance
    3: 'guard',
    4: 'guard',
    5: 'guard',
    6: 'raider',   // isMission handled per-instance
    7: 'gatherer',
    8: 'guard',
    9: 'gatherer'
};

class EnemyAI {
    static update(e, scene, validResources, validIntruders) {
        if (!e || !e.active || typeof e.x === 'undefined') return;
        const d = e.data.values;
        if (d.carga > 0) return;

        const role = ROLE_BY_SPECIES[d.tipo] || 'guard';

        if (role === 'gatherer') this._updateGatherer(e, d, scene, validResources);
        else if (d.tipo === 1) this._updateStaminaChaser(e, d, scene, validIntruders);
        else if (d.isMission && role === 'thief') this._updateThief(e, d, scene);
        else if (d.isMission && role === 'raider') this._updateRaider(e, d, scene);
        else this._updateGuard(e, d, scene, validIntruders);
    }

    static _updateGatherer(e, d, scene, validResources) {
        let t = d.targetRec;
        let tAtt = (t && t.active && t.data && typeof t.x !== 'undefined') ? t.getData('antsAttached') : null;

        if (!t || !t.active || !t.body || !tAtt || tAtt.length >= t.getData('maxAnts') || typeof t.x === 'undefined') {
            let best = null, minDist = Infinity;
            validResources.forEach(r => {
                if (!r || !r.active || typeof r.x === 'undefined') return;
                const rAtt = r.getData('antsAttached');
                if (rAtt && rAtt.length < r.getData('maxAnts')) {
                    let dist = Phaser.Math.Distance.Between(e.x, e.y, r.x, r.y);
                    if (r.getData('isMeat')) dist -= 2000;
                    if (dist < minDist) { minDist = dist; best = r; }
                }
            });
            if (best) e.setData('targetRec', best);
        }

        const tFinal = e.getData('targetRec');
        if (tFinal && tFinal.active && tFinal.body && tFinal.data && tFinal.getData('antsAttached') && typeof tFinal.x !== 'undefined') {
            scene.physics.moveToObject(e, tFinal, d.vel);
            if (Phaser.Math.Distance.Between(e.x, e.y, tFinal.x, tFinal.y) < 25) {
                tFinal.getData('antsAttached').push(e);
                e.setData('carga', 10); e.setAlpha(0.6);
            }
        } else {
            scene.physics.moveTo(e, d.homeX, d.homeY, d.vel * 0.4);
        }
    }

    static _updateStaminaChaser(e, d, scene, validIntruders) {
        const close = scene.physics.closest(e, validIntruders);
        const st = e.getData('stamina') || 100;

        if (close && close.active && close.body && typeof close.x !== 'undefined' && Phaser.Math.Distance.Between(e.x, e.y, close.x, close.y) < 300) {
            if (st > 0) {
                scene.physics.moveToObject(e, close, d.vel);
                e.setData('stamina', st - 2);
            } else {
                if (e.body) e.body.setVelocity(0);
                e.setData('stamina', Math.max(-50, st - 1));
            }
        } else {
            if (st < 100) e.setData('stamina', st + 1);
            if (Phaser.Math.Distance.Between(e.x, e.y, d.homeX, d.homeY) > 50) {
                scene.physics.moveTo(e, d.homeX, d.homeY, d.vel * 0.5);
            } else if (e.body) e.body.setVelocity(0);
        }
    }

    static _updateThief(e, d, scene) {
        if (!d.targetPos || typeof d.targetPos.x === 'undefined') { if (e.body) e.body.setVelocity(0); return; }

        scene.physics.moveTo(e, d.targetPos.x, d.targetPos.y, d.vel);

        if (!e.getData('hasRobbed') && Phaser.Math.Distance.Between(e.x, e.y, GameApp.Config.CENTER, GameApp.Config.CENTER) < 70) {
            e.setData('hasRobbed', true);
            if (e.type === 'Text') e.setText('🐞📦'); else e.setTint(0xffaa00);
            GameApp.State.stats.recursos = Math.max(0, GameApp.State.stats.recursos - 200);
            GameApp.UI.forceUpdateHUD(scene);
            GameApp.UI.showToast('¡Un escarabajo robó recursos!', true);
            e.setData('targetPos', { x: d.homeX, y: d.homeY });
        }
        if (e.getData('hasRobbed') && Phaser.Math.Distance.Between(e.x, e.y, d.homeX, d.homeY) < 50) {
            if (e.data.values.hpBar) { e.data.values.hpBar.bg.destroy(); e.data.values.hpBar.fg.destroy(); }
            e.destroy();
        }
    }

    static _updateRaider(e, d, scene) {
        if (!d.targetPos || typeof d.targetPos.x === 'undefined') { if (e.body) e.body.setVelocity(0); return; }

        scene.physics.moveTo(e, d.targetPos.x, d.targetPos.y, d.vel);
        if (Phaser.Math.Distance.Between(e.x, e.y, d.targetPos.x, d.targetPos.y) < 100) {
            e.setData('isMission', false);
            e.setData('homeX', d.targetPos.x); e.setData('homeY', d.targetPos.y);
        }
    }

    static _updateGuard(e, d, scene, validIntruders) {
        const target = scene.physics.closest(e, validIntruders);
        if (target && target.active && target.body && typeof target.x !== 'undefined' &&
            Phaser.Math.Distance.Between(d.homeX, d.homeY, target.x, target.y) < 800 &&
            Phaser.Math.Distance.Between(e.x, e.y, target.x, target.y) < 600) {
            scene.physics.moveToObject(e, target, d.vel);
        } else if (Phaser.Math.Distance.Between(e.x, e.y, d.homeX, d.homeY) > 30) {
            scene.physics.moveTo(e, d.homeX, d.homeY, d.vel * 0.5);
        } else if (e.body) {
            e.body.setVelocity(0);
        }
    }
}

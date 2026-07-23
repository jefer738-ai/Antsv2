/**
 * CombatSystem — fixed-deltaTime damage resolution for player-vs-enemy
 * melee and enemy-vs-enemy infighting (rival kingdoms clash automatically
 * when their patrols cross paths).
 */
class CombatSystem {
    static resolveMelee(dt, h, e, scene) {
        if (!h || !e || !h.active || !e.active || !h.data || !e.data || typeof h.x === 'undefined' || typeof e.x === 'undefined') return;

        const dpsE = e.data.values.poder * 60;
        const dmgToAnt = dpsE * (dt / 1000);

        const bonus = GameApp.State.stats.hormigasVivas >= 500 ? 1.3 : 1.0;
        const dpsH = (h.data.values.poder * bonus) * 60;
        const dmgToEnemy = dpsH * (dt / 1000);

        h.data.values.hp -= dmgToAnt;
        e.data.values.hp -= dmgToEnemy;

        if (h.data.values.hpBar) h.data.values.hpBar.update(h.x, h.y, h.data.values.hp / h.data.values.maxHp);
        if (e.data.values.hpBar) e.data.values.hpBar.update(e.x, e.y, e.data.values.hp / e.data.values.maxHp);

        if (Math.random() < 0.1) {
            scene.vfx.playHit(h.x, h.y);
            GameApp.Audio.playHit();
        }

        if (h.data.values.hp <= 0 && h.active) {
            if (h.getData('shadow')) h.getData('shadow').destroy();
            if (h.getData('hpBar')) { h.getData('hpBar').bg.destroy(); h.getData('hpBar').fg.destroy(); }
            scene.vfx.playDeath(h.x, h.y, 0x2ecc71);
            h.destroy();
            GameApp.State.stats.hormigasVivas--;
            GameApp.UI.updateHUD(scene.time.now, scene);
            if (GameApp.State.stats.hormigasVivas <= 0) {
                GameApp.UI.gameOver('EXTINCIÓN', 'Tu colonia ha sido exterminada. El ecosistema te ha devorado.');
            }
        }

        if (e.data.values.hp <= 0 && e.active) scene.matarEnemigo(e, true);
    }

    static resolveInfighting(dt, e1, e2, scene) {
        if (!e1 || !e2 || !e1.active || !e2.active || !e1.data || !e2.data || typeof e1.x === 'undefined' || typeof e2.x === 'undefined') return;
        if (e1.getData('tipo') === e2.getData('tipo')) return;

        const dmg1 = (e2.data.values.poder * 6) * (dt / 1000);
        const dmg2 = (e1.data.values.poder * 6) * (dt / 1000);

        e1.data.values.hp -= dmg1;
        e2.data.values.hp -= dmg2;

        if (e1.data.values.hpBar) e1.data.values.hpBar.update(e1.x, e1.y, e1.data.values.hp / e1.data.values.maxHp);
        if (e2.data.values.hpBar) e2.data.values.hpBar.update(e2.x, e2.y, e2.data.values.hp / e2.data.values.maxHp);

        if (e1.data.values.hp <= 0 && e1.active) scene.matarEnemigo(e1, false);
        if (e2.data.values.hp <= 0 && e2.active) scene.matarEnemigo(e2, false);
    }
}

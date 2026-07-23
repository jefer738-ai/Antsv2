/**
 * EntityFactory — builds resource pickups and HP bars.
 * Sprite-key resolution centralizes which species have a real spritesheet
 * vs. which fall back to a stroked emoji glyph.
 */
class EntityFactory {
    static getSpriteKey(id, emoji) {
        if (id === 7) return 'img_termita';
        if (id === 2) return 'img_duna';
        if (id === 6) return 'img_nube';
        if (id === 3) return 'img_cueva';
        if (emoji === '🐜') return 'img_ant';
        return null;
    }

    static createResource(scene, x, y, isDry, valOverwrite = null) {
        let r = scene.add.text(x, y, isDry ? '🥩' : '🍃', { fontSize: '28px' }).setOrigin(0.5).setDepth(3);
        if (isDry && valOverwrite === null) r.setTint(0x8b5a2b);
        scene.physics.add.existing(r);

        let val = valOverwrite !== null ? valOverwrite : (isDry ? 3 : 25);
        r.setData({ valor: val, antsAttached: [], maxAnts: Math.ceil(val / 10) + 1, isMeat: isDry });
        scene.recursos.add(r);
        return r;
    }

    static createHPBar(scene, entity) {
        if (!GameApp.Config.showHP) return null;
        let bg = scene.add.rectangle(entity.x, entity.y - 22, 32, 5, 0x000000).setOrigin(0.5).setDepth(5);
        let fg = scene.add.rectangle(entity.x, entity.y - 22, 30, 3, 0x2ecc71).setOrigin(0.5).setDepth(6);
        return {
            bg, fg, update: (x, y, pct) => {
                if (!GameApp.Config.showHP || !bg.active || !fg.active) {
                    if (bg && bg.active) bg.setVisible(false);
                    if (fg && fg.active) fg.setVisible(false);
                    return;
                }
                bg.setVisible(true); fg.setVisible(true);
                bg.setPosition(x, y - 22); fg.setPosition(x, y - 22);
                fg.width = 30 * Math.max(0, Math.min(1, pct));
                fg.fillColor = pct < 0.3 ? 0xe74c3c : (pct < 0.6 ? 0xe2b340 : 0x2ecc71);
            }
        };
    }
}

/**
 * SPECIES_DATA — single source of truth for every insect faction.
 * Both the colony seeding logic and the combat/AI systems read from here,
 * so balance values only ever live in one place.
 *
 * biome: visual identity used by js/world/terrain.js to render each
 * kingdom's territory (palette, decoration type, ambient particle type).
 */
const SPECIES_DATA = {
    1: {
        e: '🐛', name: 'GUSANOS', title: 'Selva Ancestral', maxPop: 70,
        hp: 300, p: 25, v: 140, diet: 'all', color: 0x2ecc71,
        biome: { base: 0x0e2e18, accent: 0x2ecc71, glow: 0x63e6a4, decoration: 'canopy', particle: 'fireflies', fog: 0.22 }
    },
    2: {
        e: '🐞', name: 'DUNAS', title: 'Dunas Ardientes', maxPop: 50,
        hp: 400, p: 35, v: 110, diet: 'all', color: 0xe08a2b,
        biome: { base: 0x2e1c0e, accent: 0xe08a2b, glow: 0xffd28a, decoration: 'dunes', particle: 'sand', fog: 0.12 }
    },
    3: {
        e: '🕷️', name: 'ARAÑAS', title: 'Cueva de Cristal', maxPop: 20,
        hp: 1200, p: 70, v: 80, diet: 'meat', color: 0x8e5ce0,
        biome: { base: 0x150e2e, accent: 0x8e5ce0, glow: 0xc9a6ff, decoration: 'crystals', particle: 'spores', fog: 0.38 }
    },
    4: {
        e: '🦂', name: 'ESCORPIONES', title: 'Yermo Volcánico', maxPop: 15,
        hp: 1600, p: 90, v: 90, diet: 'meat', color: 0xe0432b,
        biome: { base: 0x2e0e0e, accent: 0xe0432b, glow: 0xff8a5c, decoration: 'embers', particle: 'ash', fog: 0.28 }
    },
    5: {
        e: '🐢', name: 'TORTUGAS', title: 'Fortaleza de Muros', maxPop: 10,
        hp: 3500, p: 50, v: 50, diet: 'all', color: 0x5c7ce0,
        biome: { base: 0x151c2e, accent: 0x5c7ce0, glow: 0x9fb8ff, decoration: 'ramparts', particle: 'dust', fog: 0.16 }
    },
    6: {
        e: '🐝', name: 'ABEJAS', title: 'Pradera del Cielo', maxPop: 35,
        hp: 450, p: 40, v: 130, diet: 'all', color: 0xe2b340,
        biome: { base: 0x2e2a0e, accent: 0xe2b340, glow: 0xfff2b0, decoration: 'meadow', particle: 'pollen', fog: 0.10 }
    },
    7: {
        e: '🐜', name: 'TERMITAS', title: 'Montículos de Arcilla', maxPop: 60,
        hp: 200, p: 15, v: 80, diet: 'all', color: 0xc98a4b,
        biome: { base: 0x2e200e, accent: 0xc98a4b, glow: 0xe8c290, decoration: 'mounds', particle: 'dust', fog: 0.14 }
    },
    8: {
        e: '🦗', name: 'MANTIS', title: 'Jungla Neón', maxPop: 25,
        hp: 800, p: 80, v: 130, diet: 'all', color: 0x39ff8c,
        biome: { base: 0x0e2e22, accent: 0x39ff8c, glow: 0x9dffce, decoration: 'bioluminescence', particle: 'spores', fog: 0.30 }
    }
};

/** Extra non-player factions spawned dynamically (thieves, raiders, the "original" ant home in random mode). */
const EXTRA_UNIT_STATS = {
    9: { hp: 200, p: 15, v: 90, color: 0xe74c3c } // "HORMIGAS ORIG." — reskinned home colony in random mode
};

function getUnitCombatStats(speciesId) {
    const sp = SPECIES_DATA[speciesId];
    if (sp) return { hp: sp.hp, p: sp.p, v: sp.v };
    const extra = EXTRA_UNIT_STATS[speciesId];
    if (extra) return { hp: extra.hp, p: extra.p, v: extra.v };
    return { hp: 150, p: 10, v: 60 };
}

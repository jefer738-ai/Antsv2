/**
 * KINGDOMS — the eight rival territories placed on the world map.
 * Positions are spread so each kingdom's biome patch (see terrain.js)
 * never overlaps a neighbor, which is what makes the map read as
 * eight distinct places instead of one flat tinted square.
 */
const KINGDOMS = [
    { x: 1500, y: 1500, id: 1, pop: 15 },
    { x: 6500, y: 1500, id: 2, pop: 15 },
    { x: 1500, y: 6500, id: 3, pop: 6 },
    { x: 6500, y: 6500, id: 4, pop: 15 },
    { x: 4000, y: 1500, id: 5, pop: 6 },
    { x: 4000, y: 6500, id: 6, pop: 6 },
    { x: 1500, y: 4000, id: 7, pop: 15 },
    { x: 6500, y: 4000, id: 8, pop: 15 }
];

const TOTAL_KINGDOMS = KINGDOMS.length;

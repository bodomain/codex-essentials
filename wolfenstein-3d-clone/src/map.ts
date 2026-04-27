import type { Door, Enemy, Pickup, Tile } from "./types";

export const MAP_WIDTH = 16;
export const MAP_HEIGHT = 16;

const rows = [
  "1111111111111111",
  "1000000001000001",
  "1011110201011101",
  "1000010001000001",
  "1111011111110101",
  "1001000000010101",
  "1021011111010101",
  "1001001000010001",
  "1011101031111101",
  "1000001000000001",
  "1011111111110101",
  "1000000020000101",
  "1011111011111101",
  "1000001000000061",
  "1000000001111111",
  "1111111111111111"
];

export const levelMap: Tile[] = rows.join("").split("").map((value) => Number(value) as Tile);

export const startPosition = {
  x: 2.35,
  y: 1.65,
  angle: 0
};

export const initialDoors: Door[] = [
  { x: 6, y: 2, open: 0, locked: false },
  { x: 1, y: 6, open: 0, locked: false },
  { x: 8, y: 8, open: 0, locked: true },
  { x: 8, y: 11, open: 0, locked: false }
];

export const initialEnemies: Enemy[] = [
  { id: 1, x: 8.5, y: 1.5, hp: 72, state: "idle", cooldown: 0, pain: 0 },
  { id: 2, x: 6.5, y: 7.5, hp: 72, state: "idle", cooldown: 0, pain: 0 },
  { id: 3, x: 13.5, y: 9.5, hp: 90, state: "idle", cooldown: 0, pain: 0 },
  { id: 4, x: 5.5, y: 14.5, hp: 72, state: "idle", cooldown: 0, pain: 0 }
];

export const initialPickups: Pickup[] = [
  { id: 1, kind: "ammo", x: 3.5, y: 1.5, taken: false },
  { id: 2, kind: "health", x: 7.5, y: 5.5, taken: false },
  { id: 3, kind: "key", x: 12.5, y: 7.5, taken: false },
  { id: 4, kind: "ammo", x: 13.5, y: 13.5, taken: false },
  { id: 5, kind: "health", x: 2.5, y: 14.5, taken: false }
];

export function tileAt(x: number, y: number): Tile {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) {
    return 1;
  }
  return levelMap[ty * MAP_WIDTH + tx];
}

export function setTile(x: number, y: number, tile: Tile): void {
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    return;
  }
  levelMap[y * MAP_WIDTH + x] = tile;
}

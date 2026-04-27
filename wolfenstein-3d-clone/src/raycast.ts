import { MAP_HEIGHT, MAP_WIDTH, tileAt } from "./map";
import type { RayHit, Tile } from "./types";

type HitPredicate = (tile: Tile, mapX: number, mapY: number) => boolean;

export function castRay(originX: number, originY: number, angle: number, maxDistance = 20, shouldHit: HitPredicate = (tile) => tile !== 0): RayHit {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);
  let mapX = Math.floor(originX);
  let mapY = Math.floor(originY);
  const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
  const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  let sideDistX = rayDirX < 0 ? (originX - mapX) * deltaDistX : (mapX + 1 - originX) * deltaDistX;
  let sideDistY = rayDirY < 0 ? (originY - mapY) * deltaDistY : (mapY + 1 - originY) * deltaDistY;
  let side: 0 | 1 = 0;
  let distance = 0;
  let tile: Tile = 0;

  while (distance < maxDistance) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }

    if (mapX < 0 || mapY < 0 || mapX >= MAP_WIDTH || mapY >= MAP_HEIGHT) {
      tile = 1;
      break;
    }

    tile = tileAt(mapX, mapY);
    if (shouldHit(tile, mapX, mapY)) {
      break;
    }
  }

  distance =
    side === 0
      ? (mapX - originX + (1 - stepX) / 2) / (rayDirX || 0.00001)
      : (mapY - originY + (1 - stepY) / 2) / (rayDirY || 0.00001);

  const hitX = originX + rayDirX * distance;
  const hitY = originY + rayDirY * distance;
  const wallCoord = side === 0 ? hitY : hitX;
  const textureX = wallCoord - Math.floor(wallCoord);

  return {
    x: hitX,
    y: hitY,
    distance: Math.max(0.001, distance),
    tile,
    side,
    textureX
  };
}

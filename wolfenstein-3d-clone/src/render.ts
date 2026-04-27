import { FOV, HUD_HEIGHT, SCREEN_HEIGHT, SCREEN_WIDTH, VIEW_HEIGHT } from "./constants";
import { MAP_HEIGHT, MAP_WIDTH, levelMap } from "./map";
import { castRay } from "./raycast";
import { blocksSight } from "./game";
import type { Enemy, GameState, Pickup, Tile } from "./types";

type TextureSet = Record<number, ImageData>;

const TEXTURE_SIZE = 32;

function makeImageData(ctx: CanvasRenderingContext2D, draw: (x: number, y: number) => [number, number, number]): ImageData {
  const image = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const [r, g, b] = draw(x, y);
      const index = (y * TEXTURE_SIZE + x) * 4;
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = 255;
    }
  }
  return image;
}

export function createTextures(ctx: CanvasRenderingContext2D): TextureSet {
  return {
    1: makeImageData(ctx, (x, y) => {
      const mortar = x % 16 === 0 || y % 8 === 0;
      const brick = ((x >> 4) + (y >> 3)) % 2;
      const shade = mortar ? 42 : brick ? 104 : 86;
      return [shade + 20, shade + 12, shade + 8];
    }),
    2: makeImageData(ctx, (x, y) => {
      const rivet = (x - 7) ** 2 + (y - 7) ** 2 < 8 || (x - 24) ** 2 + (y - 24) ** 2 < 8;
      const seam = x % 16 === 0 || y % 16 === 0;
      const base = rivet ? 178 : seam ? 58 : 112 + ((x ^ y) & 9);
      return [base, base - 8, base - 26];
    }),
    3: makeImageData(ctx, (x, y) => {
      const stripe = Math.abs(x - 16) < 2 || y % 10 === 0;
      const base = stripe ? 170 : 92 + ((x * y) % 17);
      return [base, 54, 34];
    }),
    4: makeImageData(ctx, (x, y) => {
      const panel = x < 4 || x > 27 || y < 4 || y > 27;
      const grain = ((x * 5 + y * 3) % 19) - 9;
      return panel ? [64, 41, 24] : [112 + grain, 66 + grain, 35 + grain];
    }),
    5: makeImageData(ctx, (x, y) => {
      const line = x % 8 === 0 || y % 8 === 0;
      return line ? [46, 77, 56] : [31 + (x % 5), 101 + (y % 7), 67];
    }),
    6: makeImageData(ctx, (x, y) => {
      const glow = Math.max(0, 20 - Math.hypot(x - 16, y - 16));
      return [42 + glow * 6, 92 + glow * 4, 58 + glow * 2];
    })
  };
}

function sampleTexture(texture: ImageData, tx: number, ty: number, shade: number): string {
  const x = Math.max(0, Math.min(TEXTURE_SIZE - 1, Math.floor(tx * TEXTURE_SIZE)));
  const y = Math.max(0, Math.min(TEXTURE_SIZE - 1, Math.floor(ty * TEXTURE_SIZE)));
  const index = (y * TEXTURE_SIZE + x) * 4;
  const r = Math.floor(texture.data[index] * shade);
  const g = Math.floor(texture.data[index + 1] * shade);
  const b = Math.floor(texture.data[index + 2] * shade);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 8, color = "#f4d26a", align: CanvasTextAlign = "left"): void {
  ctx.save();
  ctx.font = `${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = "#090604";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawWeapon(ctx: CanvasRenderingContext2D, state: GameState): void {
  const bob = Math.sin(state.elapsed * 8) * 2;
  const recoil = state.player.shotFlash > 0 ? 7 : 0;
  const x = SCREEN_WIDTH / 2 - 22;
  const y = VIEW_HEIGHT - 35 + bob + recoil;
  ctx.fillStyle = "#2b2a2a";
  ctx.fillRect(x + 14, y + 8, 16, 34);
  ctx.fillStyle = "#56514a";
  ctx.fillRect(x + 18, y, 8, 30);
  ctx.fillStyle = "#1a1512";
  ctx.fillRect(x + 12, y + 30, 20, 22);
  ctx.fillStyle = "#80633d";
  ctx.fillRect(x + 9, y + 37, 26, 14);
  if (state.player.shotFlash > 0) {
    ctx.fillStyle = "#fff3a0";
    ctx.fillRect(SCREEN_WIDTH / 2 - 4, y - 16, 8, 16);
    ctx.fillStyle = "#ec6d2f";
    ctx.fillRect(SCREEN_WIDTH / 2 - 8, y - 8, 16, 8);
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, screenX: number, baseY: number, size: number): void {
  const x = screenX - size / 2;
  const y = baseY - size;
  const coat = enemy.pain > 0 ? "#f2b167" : "#335c55";
  ctx.fillStyle = "#1d1410";
  ctx.fillRect(x + size * 0.3, y + size * 0.12, size * 0.4, size * 0.22);
  ctx.fillStyle = "#d2a16a";
  ctx.fillRect(x + size * 0.34, y + size * 0.18, size * 0.32, size * 0.18);
  ctx.fillStyle = coat;
  ctx.fillRect(x + size * 0.22, y + size * 0.36, size * 0.56, size * 0.42);
  ctx.fillStyle = "#202020";
  ctx.fillRect(x + size * 0.28, y + size * 0.78, size * 0.16, size * 0.22);
  ctx.fillRect(x + size * 0.56, y + size * 0.78, size * 0.16, size * 0.22);
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(x + size * 0.41, y + size * 0.26, size * 0.05, size * 0.04);
  ctx.fillRect(x + size * 0.54, y + size * 0.26, size * 0.05, size * 0.04);
  ctx.fillStyle = "#44321f";
  ctx.fillRect(x + size * 0.18, y + size * 0.5, size * 0.22, size * 0.08);
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, screenX: number, baseY: number, size: number): void {
  const x = screenX - size / 2;
  const y = baseY - size * 0.58;
  if (pickup.kind === "ammo") {
    ctx.fillStyle = "#77663d";
    ctx.fillRect(x + size * 0.15, y + size * 0.28, size * 0.7, size * 0.35);
    ctx.fillStyle = "#d6bd58";
    ctx.fillRect(x + size * 0.25, y + size * 0.36, size * 0.5, size * 0.1);
  } else if (pickup.kind === "health") {
    ctx.fillStyle = "#eee7cf";
    ctx.fillRect(x + size * 0.18, y + size * 0.2, size * 0.64, size * 0.5);
    ctx.fillStyle = "#a82626";
    ctx.fillRect(x + size * 0.43, y + size * 0.27, size * 0.14, size * 0.36);
    ctx.fillRect(x + size * 0.32, y + size * 0.38, size * 0.36, size * 0.13);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(x + size * 0.3, y + size * 0.46, size * 0.4, size * 0.15);
    ctx.fillStyle = "#d0a13a";
    ctx.fillRect(x + size * 0.44, y + size * 0.14, size * 0.14, size * 0.55);
    ctx.fillRect(x + size * 0.55, y + size * 0.14, size * 0.26, size * 0.12);
  }
}

function renderSprites(ctx: CanvasRenderingContext2D, state: GameState, depth: number[]): void {
  const sprites = [
    ...state.pickups.filter((pickup) => !pickup.taken).map((pickup) => ({ kind: "pickup" as const, item: pickup, x: pickup.x, y: pickup.y })),
    ...state.enemies.filter((enemy) => enemy.state !== "dead").map((enemy) => ({ kind: "enemy" as const, item: enemy, x: enemy.x, y: enemy.y }))
  ].sort((a, b) => Math.hypot(state.player.x - b.x, state.player.y - b.y) - Math.hypot(state.player.x - a.x, state.player.y - a.y));

  for (const sprite of sprites) {
    const dx = sprite.x - state.player.x;
    const dy = sprite.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - state.player.angle;
    const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (Math.abs(wrapped) > FOV * 0.7 || distance < 0.2) {
      continue;
    }
    const screenX = SCREEN_WIDTH / 2 + Math.tan(wrapped) * (SCREEN_WIDTH / 2) / Math.tan(FOV / 2);
    const size = Math.min(120, VIEW_HEIGHT / distance);
    const baseY = VIEW_HEIGHT / 2 + size / 2;
    const left = Math.max(0, Math.floor(screenX - size / 2));
    const right = Math.min(SCREEN_WIDTH - 1, Math.ceil(screenX + size / 2));
    let visible = false;
    for (let x = left; x <= right; x += 1) {
      if (distance < depth[x]) {
        visible = true;
        break;
      }
    }
    if (!visible) {
      continue;
    }
    if (sprite.kind === "enemy") {
      drawEnemy(ctx, sprite.item, screenX, baseY, size);
    } else {
      drawPickup(ctx, sprite.item, screenX, baseY, size * 0.65);
    }
  }
}

function renderWorld(ctx: CanvasRenderingContext2D, state: GameState, textures: TextureSet): void {
  const ceiling = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT / 2);
  ceiling.addColorStop(0, "#24212a");
  ceiling.addColorStop(1, "#16151a");
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, SCREEN_WIDTH, VIEW_HEIGHT / 2);
  const floor = ctx.createLinearGradient(0, VIEW_HEIGHT / 2, 0, VIEW_HEIGHT);
  floor.addColorStop(0, "#3c352c");
  floor.addColorStop(1, "#171311");
  ctx.fillStyle = floor;
  ctx.fillRect(0, VIEW_HEIGHT / 2, SCREEN_WIDTH, VIEW_HEIGHT / 2);

  const depth = new Array<number>(SCREEN_WIDTH).fill(99);
  for (let x = 0; x < SCREEN_WIDTH; x += 1) {
    const cameraX = (x / SCREEN_WIDTH - 0.5) * FOV;
    const rayAngle = state.player.angle + cameraX;
    const hit = castRay(state.player.x, state.player.y, rayAngle, 20, (tile, tx, ty) => blocksSight(state, tile, tx, ty));
    const corrected = hit.distance * Math.cos(cameraX);
    depth[x] = corrected;
    const wallHeight = Math.min(VIEW_HEIGHT * 1.7, VIEW_HEIGHT / corrected);
    const start = Math.floor(VIEW_HEIGHT / 2 - wallHeight / 2);
    const end = Math.floor(VIEW_HEIGHT / 2 + wallHeight / 2);
    const texture = textures[hit.tile] ?? textures[1];
    const shade = Math.max(0.24, Math.min(1, 1.15 - corrected / 8)) * (hit.side === 1 ? 0.78 : 1);

    for (let y = Math.max(0, start); y < Math.min(VIEW_HEIGHT, end); y += 1) {
      const ty = (y - start) / wallHeight;
      ctx.fillStyle = sampleTexture(texture, hit.textureX, ty, shade);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  renderSprites(ctx, state, depth);
  drawWeapon(ctx, state);

  if (state.player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(160, 0, 0, ${state.player.hurtFlash})`;
    ctx.fillRect(0, 0, SCREEN_WIDTH, VIEW_HEIGHT);
  }
}

function renderHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "#17110d";
  ctx.fillRect(0, VIEW_HEIGHT, SCREEN_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = "#4c3a2a";
  ctx.fillRect(0, VIEW_HEIGHT, SCREEN_WIDTH, 3);
  ctx.fillStyle = "#0b0806";
  ctx.fillRect(104, VIEW_HEIGHT + 8, 42, 34);
  ctx.fillStyle = state.player.hp > 35 ? "#d6a474" : "#a62a25";
  ctx.fillRect(115, VIEW_HEIGHT + 13, 20, 16);
  ctx.fillStyle = "#2e2018";
  ctx.fillRect(110, VIEW_HEIGHT + 29, 30, 11);
  ctx.fillStyle = "#0b0806";
  ctx.fillRect(119, VIEW_HEIGHT + 20, 3, 3);
  ctx.fillRect(128, VIEW_HEIGHT + 20, 3, 3);
  ctx.fillStyle = "#100b08";
  ctx.fillRect(120, VIEW_HEIGHT + 31, 11, 2);
  drawText(ctx, `SCORE ${state.player.score}`, 8, VIEW_HEIGHT + 17, 8);
  drawText(ctx, `HP ${state.player.hp}`, 156, VIEW_HEIGHT + 17, 8);
  drawText(ctx, `AMMO ${state.player.ammo}`, 214, VIEW_HEIGHT + 17, 8);
  drawText(ctx, `KEY ${state.player.keys}`, 270, VIEW_HEIGHT + 17, 8);
  if (state.messageTimer > 0) {
    drawText(ctx, state.message, SCREEN_WIDTH / 2, VIEW_HEIGHT + 39, 8, "#f7e48a", "center");
  }
}

function renderOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.mode === "playing") {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  const title = state.mode === "title" ? "IRON KEEP" : state.mode === "paused" ? "PAUSED" : state.mode === "won" ? "SECTOR CLEARED" : "MISSION FAILED";
  const detail = state.mode === "won" ? "PRESS R TO RAID AGAIN" : state.mode === "lost" ? "PRESS R TO RETRY" : "CLICK OR PRESS ENTER";
  drawText(ctx, title, SCREEN_WIDTH / 2, 76, 20, "#f4d26a", "center");
  drawText(ctx, detail, SCREEN_WIDTH / 2, 102, 9, "#f4e7bf", "center");
  drawText(ctx, "WASD MOVE  ARROWS TURN  E OPEN  SPACE FIRE", SCREEN_WIDTH / 2, 128, 7, "#b79a64", "center");
}

function renderMap(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.showMap) {
    return;
  }
  const scale = 4;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(4, 4, MAP_WIDTH * scale + 4, MAP_HEIGHT * scale + 4);
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const tile = levelMap[y * MAP_WIDTH + x] as Tile;
      ctx.fillStyle = tile === 0 ? "#1c1c1c" : tile === 6 ? "#3da66d" : "#8b7a58";
      ctx.fillRect(6 + x * scale, 6 + y * scale, scale - 1, scale - 1);
    }
  }
  ctx.fillStyle = "#f2df70";
  ctx.fillRect(6 + state.player.x * scale - 1, 6 + state.player.y * scale - 1, 3, 3);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, textures: TextureSet): void {
  ctx.imageSmoothingEnabled = false;
  renderWorld(ctx, state, textures);
  renderHud(ctx, state);
  renderMap(ctx, state);
  renderOverlay(ctx, state);
}

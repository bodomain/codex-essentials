import {
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_RANGE,
  ENEMY_RADIUS,
  ENEMY_SIGHT,
  ENEMY_SPEED,
  INTERACT_DISTANCE,
  MOVE_SPEED,
  PISTOL_COOLDOWN,
  PISTOL_DAMAGE,
  PISTOL_RANGE,
  PLAYER_RADIUS,
  STRAFE_SPEED,
  TURN_SPEED
} from "./constants";
import { initialDoors, initialEnemies, initialPickups, startPosition, tileAt } from "./map";
import { castRay } from "./raycast";
import type { Controls, Door, Enemy, GameState, Pickup } from "./types";

function cloneDoors(): Door[] {
  return initialDoors.map((door) => ({ ...door }));
}

function cloneEnemies(): Enemy[] {
  return initialEnemies.map((enemy) => ({ ...enemy }));
}

function clonePickups(): Pickup[] {
  return initialPickups.map((pickup) => ({ ...pickup }));
}

export function createGame(): GameState {
  return {
    mode: "title",
    player: {
      x: startPosition.x,
      y: startPosition.y,
      angle: startPosition.angle,
      hp: 100,
      ammo: 10,
      score: 0,
      keys: 0,
      weaponCooldown: 0,
      hurtFlash: 0,
      shotFlash: 0
    },
    enemies: cloneEnemies(),
    pickups: clonePickups(),
    doors: cloneDoors(),
    message: "CLICK OR PRESS ENTER",
    messageTimer: 99,
    elapsed: 0,
    showMap: false
  };
}

export function resetGame(state: GameState): void {
  const fresh = createGame();
  Object.assign(state, fresh, { mode: "playing", message: "FIND THE BRASS KEY", messageTimer: 2.4 });
}

export function doorAt(state: GameState, x: number, y: number): Door | undefined {
  return state.doors.find((door) => door.x === x && door.y === y);
}

export function isBlocked(state: GameState, x: number, y: number): boolean {
  const tile = tileAt(x, y);
  if (tile === 0 || tile === 6) {
    return false;
  }
  const door = doorAt(state, Math.floor(x), Math.floor(y));
  if (door) {
    return door.open < 0.78;
  }
  return true;
}

export function blocksSight(state: GameState, tile: number, x: number, y: number): boolean {
  if (tile === 0) {
    return false;
  }
  const door = doorAt(state, x, y);
  return !door || door.open < 0.78;
}

function moveWithCollision(state: GameState, dx: number, dy: number): void {
  const { player } = state;
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (!isBlocked(state, nextX + Math.sign(dx) * PLAYER_RADIUS, player.y) && !isBlocked(state, nextX, player.y + PLAYER_RADIUS) && !isBlocked(state, nextX, player.y - PLAYER_RADIUS)) {
    player.x = nextX;
  }
  if (!isBlocked(state, player.x, nextY + Math.sign(dy) * PLAYER_RADIUS) && !isBlocked(state, player.x + PLAYER_RADIUS, nextY) && !isBlocked(state, player.x - PLAYER_RADIUS, nextY)) {
    player.y = nextY;
  }
}

export function canSeePlayer(state: GameState, enemy: Enemy): boolean {
  const dx = state.player.x - enemy.x;
  const dy = state.player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance > ENEMY_SIGHT) {
    return false;
  }
  const hit = castRay(enemy.x, enemy.y, Math.atan2(dy, dx), distance, (tile, x, y) => blocksSight(state, tile, x, y));
  return hit.distance >= distance - 0.18;
}

function updateEnemies(state: GameState, dt: number): void {
  for (const enemy of state.enemies) {
    if (enemy.state === "dead") {
      continue;
    }

    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    enemy.pain = Math.max(0, enemy.pain - dt);
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (enemy.state === "idle" && canSeePlayer(state, enemy)) {
      enemy.state = "chase";
    }

    if (distance <= ENEMY_ATTACK_RANGE && enemy.cooldown <= 0) {
      enemy.state = "attack";
      enemy.cooldown = 1.1;
      state.player.hp = Math.max(0, state.player.hp - ENEMY_ATTACK_DAMAGE);
      state.player.hurtFlash = 0.28;
      state.message = "UNDER FIRE";
      state.messageTimer = 0.8;
      if (state.player.hp <= 0) {
        state.mode = "lost";
        state.message = "MISSION FAILED";
        state.messageTimer = 99;
      }
    } else if (enemy.state !== "idle" && distance > ENEMY_ATTACK_RANGE && enemy.pain <= 0) {
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      const step = ENEMY_SPEED * dt;
      const targetX = enemy.x + nx * step;
      const targetY = enemy.y + ny * step;
      if (!isBlocked(state, targetX + Math.sign(nx) * ENEMY_RADIUS, enemy.y)) {
        enemy.x = targetX;
      }
      if (!isBlocked(state, enemy.x, targetY + Math.sign(ny) * ENEMY_RADIUS)) {
        enemy.y = targetY;
      }
      enemy.state = "chase";
    }
  }
}

function collectPickups(state: GameState): void {
  for (const pickup of state.pickups) {
    if (pickup.taken || Math.hypot(state.player.x - pickup.x, state.player.y - pickup.y) > 0.52) {
      continue;
    }
    pickup.taken = true;
    if (pickup.kind === "ammo") {
      state.player.ammo += 8;
      state.message = "AMMO";
    } else if (pickup.kind === "health") {
      state.player.hp = Math.min(100, state.player.hp + 28);
      state.message = "MED KIT";
    } else {
      state.player.keys += 1;
      state.player.score += 500;
      state.message = "BRASS KEY";
    }
    state.messageTimer = 1.2;
  }
}

function useDoor(state: GameState): void {
  const lookX = state.player.x + Math.cos(state.player.angle) * INTERACT_DISTANCE;
  const lookY = state.player.y + Math.sin(state.player.angle) * INTERACT_DISTANCE;
  const door = doorAt(state, Math.floor(lookX), Math.floor(lookY));
  if (!door) {
    return;
  }
  if (door.locked && state.player.keys <= 0) {
    state.message = "LOCKED";
    state.messageTimer = 1.1;
    return;
  }
  if (door.locked) {
    door.locked = false;
    state.player.keys -= 1;
    state.player.score += 250;
  }
  door.open = 1;
  state.message = "OPEN";
  state.messageTimer = 0.8;
}

export function fireWeapon(state: GameState): void {
  const player = state.player;
  if (player.weaponCooldown > 0 || player.ammo <= 0) {
    if (player.ammo <= 0) {
      state.message = "NO AMMO";
      state.messageTimer = 0.8;
    }
    return;
  }

  player.weaponCooldown = PISTOL_COOLDOWN;
  player.shotFlash = 0.12;
  player.ammo -= 1;

  const wallHit = castRay(player.x, player.y, player.angle, PISTOL_RANGE, (tile, x, y) => blocksSight(state, tile, x, y));
  let target: Enemy | undefined;
  let bestDistance = wallHit.distance;

  for (const enemy of state.enemies) {
    if (enemy.state === "dead") {
      continue;
    }
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angleToEnemy = Math.atan2(dy, dx);
    const delta = Math.atan2(Math.sin(angleToEnemy - player.angle), Math.cos(angleToEnemy - player.angle));
    if (Math.abs(delta) < 0.13 && distance < bestDistance && canSeePlayerFrom(state, player.x, player.y, enemy.x, enemy.y)) {
      bestDistance = distance;
      target = enemy;
    }
  }

  if (!target) {
    return;
  }

  target.hp -= PISTOL_DAMAGE;
  target.pain = 0.18;
  target.state = "chase";
  state.player.score += 50;
  if (target.hp <= 0) {
    target.state = "dead";
    state.player.score += 350;
  }
}

function canSeePlayerFrom(state: GameState, fromX: number, fromY: number, toX: number, toY: number): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  const hit = castRay(fromX, fromY, Math.atan2(dy, dx), distance, (tile, x, y) => blocksSight(state, tile, x, y));
  if (hit.distance >= distance - 0.15) {
    return true;
  }
  const door = doorAt(state, Math.floor(hit.x), Math.floor(hit.y));
  return !!door && door.open > 0.78;
}

function updateDoors(state: GameState, dt: number): void {
  for (const door of state.doors) {
    if (door.open > 0 && door.open < 1) {
      door.open = Math.min(1, door.open + dt * 1.8);
    }
  }
}

function checkExit(state: GameState): void {
  if (tileAt(state.player.x, state.player.y) === 6) {
    state.mode = "won";
    state.player.score += Math.max(0, Math.floor(3000 - state.elapsed * 10));
    state.message = "SECTOR CLEARED";
    state.messageTimer = 99;
  }
}

export function updateGame(state: GameState, controls: Controls, dt: number): void {
  const clampedDt = Math.min(dt, 0.05);

  if (controls.restart) {
    resetGame(state);
    controls.restart = false;
    return;
  }

  if (state.mode === "title") {
    if (controls.shoot || controls.use || controls.forward) {
      resetGame(state);
    }
    return;
  }

  if (controls.pause) {
    state.mode = state.mode === "paused" ? "playing" : state.mode === "playing" ? "paused" : state.mode;
    controls.pause = false;
  }

  if (controls.debug) {
    state.showMap = !state.showMap;
    controls.debug = false;
  }

  if (state.mode !== "playing") {
    return;
  }

  state.elapsed += clampedDt;
  state.messageTimer = Math.max(0, state.messageTimer - clampedDt);
  state.player.weaponCooldown = Math.max(0, state.player.weaponCooldown - clampedDt);
  state.player.hurtFlash = Math.max(0, state.player.hurtFlash - clampedDt);
  state.player.shotFlash = Math.max(0, state.player.shotFlash - clampedDt);

  const turn = (Number(controls.turnRight) - Number(controls.turnLeft)) * TURN_SPEED * clampedDt;
  state.player.angle = Math.atan2(Math.sin(state.player.angle + turn), Math.cos(state.player.angle + turn));

  const forward = (Number(controls.forward) - Number(controls.backward)) * MOVE_SPEED * clampedDt;
  const strafe = (Number(controls.strafeRight) - Number(controls.strafeLeft)) * STRAFE_SPEED * clampedDt;
  const dx = Math.cos(state.player.angle) * forward + Math.cos(state.player.angle + Math.PI / 2) * strafe;
  const dy = Math.sin(state.player.angle) * forward + Math.sin(state.player.angle + Math.PI / 2) * strafe;
  moveWithCollision(state, dx, dy);

  if (controls.use) {
    useDoor(state);
    controls.use = false;
  }

  if (controls.shoot) {
    fireWeapon(state);
    controls.shoot = false;
  }

  updateDoors(state, clampedDt);
  collectPickups(state);
  updateEnemies(state, clampedDt);
  checkExit(state);
}

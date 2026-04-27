import { describe, expect, it } from "vitest";
import { createGame, fireWeapon, isBlocked, resetGame, updateGame } from "./game";
import { castRay } from "./raycast";
import { createControls } from "./input";

describe("raycasting", () => {
  it("hits a wall from the start corridor", () => {
    const hit = castRay(2.5, 1.5, 0);
    expect(hit.tile).not.toBe(0);
    expect(hit.distance).toBeGreaterThan(5);
  });
});

describe("movement and collision", () => {
  it("blocks solid wall tiles", () => {
    const state = createGame();
    resetGame(state);
    expect(isBlocked(state, 0.5, 0.5)).toBe(true);
    expect(isBlocked(state, 2.5, 1.5)).toBe(false);
  });

  it("does not move through a wall", () => {
    const state = createGame();
    const controls = createControls();
    resetGame(state);
    state.player.x = 1.25;
    state.player.y = 1.5;
    state.player.angle = Math.PI;
    controls.forward = true;
    updateGame(state, controls, 0.5);
    expect(state.player.x).toBeGreaterThan(1.1);
  });
});

describe("combat", () => {
  it("spends ammo and damages a visible enemy", () => {
    const state = createGame();
    resetGame(state);
    state.player.x = 7.2;
    state.player.y = 1.5;
    state.player.angle = 0;
    const enemy = state.enemies[0];
    enemy.x = 8.2;
    enemy.y = 1.5;
    const hp = enemy.hp;
    fireWeapon(state);
    expect(state.player.ammo).toBe(9);
    expect(enemy.hp).toBeLessThan(hp);
  });
});

describe("pickups and states", () => {
  it("collects ammo", () => {
    const state = createGame();
    const controls = createControls();
    resetGame(state);
    state.player.x = 3.5;
    state.player.y = 1.5;
    state.player.ammo = 0;
    updateGame(state, controls, 0.016);
    expect(state.player.ammo).toBe(8);
  });

  it("wins on the exit tile", () => {
    const state = createGame();
    const controls = createControls();
    resetGame(state);
    state.player.x = 14.2;
    state.player.y = 13.2;
    updateGame(state, controls, 0.016);
    expect(state.mode).toBe("won");
  });
});

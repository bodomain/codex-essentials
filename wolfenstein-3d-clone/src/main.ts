import "./style.css";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";
import { createGame, updateGame } from "./game";
import { bindInput, createControls } from "./input";
import { createTextures, render } from "./render";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Game canvas not found");
}

canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;
canvas.tabIndex = 0;

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("2D canvas context is unavailable");
}
const context = ctx;

const state = createGame();
const controls = createControls();
const textures = createTextures(context);
bindInput(canvas, controls);

let last = performance.now();

function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  updateGame(state, controls, dt);
  render(context, state, textures);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

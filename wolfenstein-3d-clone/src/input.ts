import type { Controls } from "./types";

export function createControls(): Controls {
  return {
    forward: false,
    backward: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
    shoot: false,
    use: false,
    pause: false,
    restart: false,
    debug: false
  };
}

const keyMap: Record<string, keyof Controls> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "strafeLeft",
  KeyD: "strafeRight",
  ArrowLeft: "turnLeft",
  ArrowRight: "turnRight",
  Space: "shoot",
  Enter: "shoot",
  KeyE: "use",
  ShiftLeft: "use",
  KeyP: "pause",
  Escape: "pause",
  KeyR: "restart",
  Tab: "debug"
};

export function bindInput(canvas: HTMLCanvasElement, controls: Controls): void {
  window.addEventListener("keydown", (event) => {
    const action = keyMap[event.code];
    if (!action) {
      return;
    }
    event.preventDefault();
    controls[action] = true;
  });

  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.code];
    if (!action) {
      return;
    }
    event.preventDefault();
    if (action === "pause" || action === "restart" || action === "debug" || action === "shoot" || action === "use") {
      return;
    }
    controls[action] = false;
  });

  canvas.addEventListener("click", () => {
    controls.shoot = true;
    void canvas.requestPointerLock?.();
  });

  window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas) {
      return;
    }
    controls.turnLeft = event.movementX < -1;
    controls.turnRight = event.movementX > 1;
    window.setTimeout(() => {
      controls.turnLeft = false;
      controls.turnRight = false;
    }, 24);
  });

  const touchControls = document.querySelector("#touch-controls");
  touchControls?.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const action = target.dataset.action as keyof Controls | undefined;
    if (!action || !(action in controls)) {
      return;
    }
    controls[action] = true;
  });
  touchControls?.addEventListener("pointerup", (event) => {
    const target = event.target as HTMLElement;
    const action = target.dataset.action as keyof Controls | undefined;
    if (!action || action === "shoot" || action === "use") {
      return;
    }
    controls[action] = false;
  });
}

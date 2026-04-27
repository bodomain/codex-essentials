export type Tile = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GameMode = "title" | "playing" | "paused" | "won" | "lost";

export type Vec2 = {
  x: number;
  y: number;
};

export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  state: "idle" | "chase" | "attack" | "dead";
  cooldown: number;
  pain: number;
};

export type Pickup = {
  id: number;
  kind: "ammo" | "health" | "key";
  x: number;
  y: number;
  taken: boolean;
};

export type Door = {
  x: number;
  y: number;
  open: number;
  locked: boolean;
};

export type Controls = {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  shoot: boolean;
  use: boolean;
  pause: boolean;
  restart: boolean;
  debug: boolean;
};

export type GameState = {
  mode: GameMode;
  player: {
    x: number;
    y: number;
    angle: number;
    hp: number;
    ammo: number;
    score: number;
    keys: number;
    weaponCooldown: number;
    hurtFlash: number;
    shotFlash: number;
  };
  enemies: Enemy[];
  pickups: Pickup[];
  doors: Door[];
  message: string;
  messageTimer: number;
  elapsed: number;
  showMap: boolean;
};

export type RayHit = {
  x: number;
  y: number;
  distance: number;
  tile: Tile;
  side: 0 | 1;
  textureX: number;
};

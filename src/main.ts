import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture
} from "pixi.js";

import atlasUrl from "../assets/neon-breakout-vector.svg?url";
import bgClockworkUrl from "../assets/bg-clockwork.png?url";
import bgCrystalCaveUrl from "../assets/bg-crystal-cave.png?url";
import bgElectricUrl from "../assets/bg-electric-city.png?url";
import bgFrostUrl from "../assets/bg-frost.png?url";
import bgJungleUrl from "../assets/bg-jungle.png?url";
import bgMushroomUrl from "../assets/bg-mushroom.png?url";
import bgSpaceUrl from "../assets/bg-space.png?url";
import bgTimeRiftUrl from "../assets/bg-time-rift.png?url";
import bgUnderwaterUrl from "../assets/bg-underwater.png?url";
import bgVolcanoUrl from "../assets/bg-volcano.png?url";

const WORLD_W = 1600;
const WORLD_H = 900;
const WALL = 34;
const FIXED_DT = 1 / 120;
const MAX_BALLS = 78;
const MAX_PARTICLES = 200;
const MAX_SHOCK_RINGS = 40;
const MAX_FLOAT_TEXTS = 24;
const CHOMPER_MIN_DISTANCE = 520;

type BrickType = "cyan" | "magenta" | "amber" | "green" | "steel" | "bomb";
type BallKind = "green" | "yellow" | "red" | "bomb";
type LaserKind = "laser" | "auto" | "bazooka";
type PowerKind = "split" | "cluster" | "bombcluster" | "laser" | "autolaser" | "bazooka" | "widen" | "shrink" | "slow" | "timewarp" | "pierce" | "train" | "goldrush" | "burst" | "machine" | "overcharge" | "bombbait" | "redstorm" | "kamikaze" | "blackhole" | "mirror" | "cascade" | "orbitals" | "jackpot" | "nova" | "choice";
type BrickRole = "normal" | "shell" | "core" | "widen" | "shrink";
type MotionStyle = "still" | "current" | "breath" | "lanes" | "orbit" | "gates" | "storm";
type Pattern = "reef" | "crater" | "lanes" | "diamond" | "fortress" | "storm" | "vault" | "coil";
type SpriteName = "paddle" | "ball" | "split" | "laser" | "burst" | "shard";
type UpgradeId = "paddle" | "red" | "machine" | "bombs" | "perfect" | "mercy";
type ObjectiveId = "core" | "combo" | "perfect";

interface UpgradeOption {
  id: UpgradeId;
  title: string;
  body: string;
}

interface ObjectiveState {
  id: ObjectiveId;
  label: string;
  target: number;
  progress: number;
  complete: boolean;
  failed: boolean;
  deadline: number;
}

interface LevelConfig {
  name: string;
  background: keyof typeof backgroundUrls;
  pattern: Pattern;
  motion: MotionStyle;
  cols: number;
  rows: number;
  top: number;
  brickH: number;
  gap: number;
  startBalls: number;
  palette: BrickType[];
  tint: number;
  powerChance: number;
  splitWeight?: number;
  laserWeight?: number;
  bombWeight?: number;
  gravity?: number;
  wind?: number;
  current?: number;
  speedBoost?: number;
}

interface ArcadeLayout {
  id: number;
  name: string;
  hint: string;
  motion: MotionStyle;
  cols: number;
  rows: number;
  top: number;
  brickH: number;
  gap: number;
}

interface ArcadeCell {
  type: BrickType;
  role: BrickRole;
  hpBonus: number;
}

interface Brick {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  row: number;
  col: number;
  baseHp: number;
  damage: number;
  hp: number;
  maxHp: number;
  type: BrickType;
  role: BrickRole;
  phase: number;
  flash: number;
  body: Container;
  skin: Graphics;
  hpText: Text;
}

interface Ball {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  r: number;
  hot: number;
  kind: BallKind;
  hero: boolean;
  frenzy: number;
  blastCooldown: number;
  kamikaze: number;
  kamikazeTarget: Brick | null;
  aura: Graphics;
  sprite: Sprite;
}

interface Powerup {
  x: number;
  y: number;
  vy: number;
  kind: PowerKind;
  golden: boolean;
  sprite: Graphics;
  dead: boolean;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: LaserKind;
  gfx: Graphics;
}

interface ClusterEvent {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  bomb: boolean;
  targets: Ball[];
  spawned: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  sprite: Graphics;
}

interface ShockRing {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
  gfx: Graphics;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: Text;
}

interface Chomper {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;
  eaten: number;
  mode: "hunt" | "exit";
  target: Ball | null;
  dead: boolean;
  sprite: Graphics;
}

const backgroundUrls = {
  underwater: bgUnderwaterUrl,
  volcano: bgVolcanoUrl,
  jungle: bgJungleUrl,
  space: bgSpaceUrl,
  frost: bgFrostUrl,
  electric: bgElectricUrl,
  crystal: bgCrystalCaveUrl,
  clockwork: bgClockworkUrl,
  mushroom: bgMushroomUrl,
  rift: bgTimeRiftUrl
};

const ballProfiles: Record<BallKind, {
  color: number;
  damage: number;
  gravity: number;
  size: number;
  bounce: number;
  maxSpeed: number;
  aimArc: number;
}> = {
  green: { color: 0x7cff26, damage: 1, gravity: 0, size: 1, bounce: 1.1, maxSpeed: 1180, aimArc: 1.13 },
  yellow: { color: 0xffe14a, damage: 1.6, gravity: 165, size: 1.08, bounce: 0.99, maxSpeed: 1320, aimArc: 1.02 },
  red: { color: 0xff3f3f, damage: 2.35, gravity: 370, size: 1.18, bounce: 0.82, maxSpeed: 1480, aimArc: 0.86 },
  bomb: { color: 0xffa52b, damage: 2.65, gravity: 260, size: 1.22, bounce: 0.78, maxSpeed: 1380, aimArc: 0.92 }
};

const levels: LevelConfig[] = [
  {
    name: "Age of Tides",
    background: "underwater",
    pattern: "vault",
    motion: "current",
    cols: 15,
    rows: 7,
    top: 84,
    brickH: 42,
    gap: 10,
    startBalls: 2,
    palette: ["cyan", "steel", "green", "magenta", "amber"],
    tint: 0x1ce6ff,
    powerChance: 0.32,
    splitWeight: 0.6,
    current: 45
  },
  {
    name: "Age of Ash",
    background: "volcano",
    pattern: "coil",
    motion: "breath",
    cols: 16,
    rows: 7,
    top: 76,
    brickH: 40,
    gap: 9,
    startBalls: 3,
    palette: ["amber", "bomb", "magenta", "amber", "cyan"],
    tint: 0xff761b,
    powerChance: 0.33,
    bombWeight: 0.24,
    gravity: 38,
    speedBoost: 40
  },
  {
    name: "Age of Vines",
    background: "jungle",
    pattern: "lanes",
    motion: "lanes",
    cols: 17,
    rows: 8,
    top: 60,
    brickH: 38,
    gap: 8,
    startBalls: 4,
    palette: ["green", "cyan", "amber", "green", "magenta"],
    tint: 0x7cff2b,
    powerChance: 0.42,
    splitWeight: 0.72,
    current: 25
  },
  {
    name: "Age of Orbit",
    background: "space",
    pattern: "diamond",
    motion: "orbit",
    cols: 18,
    rows: 9,
    top: 54,
    brickH: 35,
    gap: 8,
    startBalls: 3,
    palette: ["cyan", "magenta", "steel", "amber"],
    tint: 0x9b6dff,
    powerChance: 0.34,
    gravity: -16,
    wind: 90
  },
  {
    name: "Age of Frost",
    background: "frost",
    pattern: "fortress",
    motion: "gates",
    cols: 19,
    rows: 7,
    top: 82,
    brickH: 40,
    gap: 7,
    startBalls: 3,
    palette: ["steel", "cyan", "steel", "magenta", "green"],
    tint: 0xbdf7ff,
    powerChance: 0.36,
    laserWeight: 0.62,
    speedBoost: 45
  },
  {
    name: "Age of Voltage",
    background: "electric",
    pattern: "storm",
    motion: "storm",
    cols: 20,
    rows: 9,
    top: 54,
    brickH: 33,
    gap: 7,
    startBalls: 5,
    palette: ["cyan", "magenta", "amber", "green"],
    tint: 0xff35d8,
    powerChance: 0.44,
    splitWeight: 0.48,
    bombWeight: 0.16,
    wind: 105,
    speedBoost: 80
  },
  {
    name: "Age of Crystal",
    background: "crystal",
    pattern: "vault",
    motion: "breath",
    cols: 18,
    rows: 8,
    top: 66,
    brickH: 39,
    gap: 8,
    startBalls: 4,
    palette: ["steel", "cyan", "magenta", "amber", "green"],
    tint: 0x50ffe4,
    powerChance: 0.35,
    laserWeight: 0.34,
    bombWeight: 0.18,
    current: 18,
    speedBoost: 55
  },
  {
    name: "Age of Gears",
    background: "clockwork",
    pattern: "coil",
    motion: "gates",
    cols: 19,
    rows: 8,
    top: 70,
    brickH: 38,
    gap: 8,
    startBalls: 4,
    palette: ["steel", "amber", "cyan", "steel", "magenta"],
    tint: 0xffd35a,
    powerChance: 0.32,
    laserWeight: 0.42,
    bombWeight: 0.12,
    speedBoost: 65
  },
  {
    name: "Age of Spores",
    background: "mushroom",
    pattern: "vault",
    motion: "current",
    cols: 18,
    rows: 9,
    top: 54,
    brickH: 36,
    gap: 8,
    startBalls: 4,
    palette: ["green", "steel", "cyan", "amber", "magenta"],
    tint: 0xa3ff4c,
    powerChance: 0.39,
    splitWeight: 0.48,
    bombWeight: 0.2,
    current: 36
  },
  {
    name: "Age of Rift",
    background: "rift",
    pattern: "coil",
    motion: "storm",
    cols: 20,
    rows: 9,
    top: 54,
    brickH: 34,
    gap: 7,
    startBalls: 5,
    palette: ["steel", "magenta", "cyan", "amber", "bomb"],
    tint: 0xff4fd8,
    powerChance: 0.34,
    splitWeight: 0.4,
    bombWeight: 0.18,
    wind: 120,
    speedBoost: 95
  }
];

const arcadeLayouts: ArcadeLayout[] = [
  { id: 0, name: "Gate Box", hint: "open a gate, then flood the inner blocks", motion: "still", cols: 19, rows: 8, top: 78, brickH: 36, gap: 8 },
  { id: 1, name: "Layer Cake", hint: "horizontal seams hide quick split lanes", motion: "still", cols: 20, rows: 8, top: 72, brickH: 35, gap: 8 },
  { id: 2, name: "Twin Towers", hint: "four stacks with narrow vertical tunnels", motion: "lanes", cols: 21, rows: 8, top: 70, brickH: 34, gap: 8 },
  { id: 3, name: "Diamond Core", hint: "crack the shell and ricochet inside", motion: "still", cols: 21, rows: 9, top: 56, brickH: 33, gap: 8 },
  { id: 4, name: "Nested Vault", hint: "break the outer wall before the prize core", motion: "still", cols: 21, rows: 8, top: 74, brickH: 36, gap: 7 },
  { id: 5, name: "Four Rooms", hint: "choose a room, then chain across the hallway", motion: "still", cols: 20, rows: 8, top: 72, brickH: 35, gap: 8 },
  { id: 6, name: "Wide Eye", hint: "the center pocket is built for trapped bounces", motion: "breath", cols: 22, rows: 9, top: 56, brickH: 32, gap: 7 },
  { id: 7, name: "Split Shelves", hint: "attack the gaps between colored shelves", motion: "still", cols: 20, rows: 8, top: 72, brickH: 35, gap: 8 },
  { id: 8, name: "Arrowhead", hint: "use diagonal edges to slip behind the mass", motion: "still", cols: 22, rows: 9, top: 54, brickH: 33, gap: 7 },
  { id: 9, name: "Pinball Dome", hint: "a soft dome makes balls ricochet inward", motion: "still", cols: 21, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 10, name: "Twin Bunkers", hint: "two forts share bomb cores in the middle", motion: "gates", cols: 22, rows: 8, top: 70, brickH: 35, gap: 7 },
  { id: 11, name: "Satellite Ring", hint: "outer bumpers feed chaos into the center", motion: "still", cols: 22, rows: 8, top: 70, brickH: 35, gap: 7 },
  { id: 12, name: "Spiral Hold", hint: "follow the path to the bomb pocket", motion: "still", cols: 21, rows: 9, top: 56, brickH: 33, gap: 8 },
  { id: 13, name: "Long Vault", hint: "long walls reward phase and train shots", motion: "still", cols: 22, rows: 8, top: 74, brickH: 35, gap: 7 },
  { id: 14, name: "Mothership", hint: "strip the wings, then break the engine", motion: "orbit", cols: 22, rows: 9, top: 52, brickH: 33, gap: 7 },
  { id: 15, name: "Square Maze", hint: "concentric lanes create long bounce traps", motion: "still", cols: 21, rows: 9, top: 56, brickH: 33, gap: 8 },
  { id: 16, name: "Crosshatch", hint: "dense but full of weak seams", motion: "still", cols: 22, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 17, name: "Crystal Twins", hint: "four diamonds with bomb cores between them", motion: "breath", cols: 22, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 18, name: "Dual Engine", hint: "two cores, two routes, one chain reaction", motion: "still", cols: 21, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 19, name: "Meteor Field", hint: "static targets above a clean rebound lane", motion: "storm", cols: 22, rows: 8, top: 72, brickH: 34, gap: 8 },
  { id: 20, name: "Striped Barrage", hint: "stacked bands with punch-through lanes", motion: "still", cols: 22, rows: 8, top: 72, brickH: 34, gap: 8 },
  { id: 21, name: "Totem Bridge", hint: "two towers joined by weak middle bars", motion: "still", cols: 21, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 22, name: "Ribbon Mesh", hint: "checker ribbons make fast chain pockets", motion: "lanes", cols: 22, rows: 9, top: 54, brickH: 32, gap: 7 },
  { id: 23, name: "Inset Circuit", hint: "nested rectangles with a live center", motion: "still", cols: 22, rows: 8, top: 70, brickH: 35, gap: 7 },
  { id: 24, name: "Pyramid", hint: "heavy base, soft peak, clean rebounds", motion: "still", cols: 23, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 25, name: "Butterfly", hint: "two wings fold balls into the center", motion: "breath", cols: 23, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 26, name: "Infinity Eye", hint: "figure-eight loops reward side entry", motion: "still", cols: 23, rows: 8, top: 68, brickH: 34, gap: 7 },
  { id: 27, name: "Color Wall", hint: "classic wall, modern weak seams", motion: "still", cols: 22, rows: 9, top: 54, brickH: 32, gap: 7 },
  { id: 28, name: "Stacked Lens", hint: "layered center mass with soft corners", motion: "still", cols: 22, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 29, name: "Neon Rails", hint: "parallel tracks are perfect for ball trains", motion: "still", cols: 22, rows: 8, top: 70, brickH: 34, gap: 8 },
  { id: 30, name: "Temple Keys", hint: "key columns guard bomb pockets", motion: "gates", cols: 22, rows: 9, top: 54, brickH: 32, gap: 7 },
  { id: 31, name: "Flower Core", hint: "petals crack open into a compact core", motion: "still", cols: 22, rows: 8, top: 68, brickH: 35, gap: 7 },
  { id: 32, name: "Pipe Organ", hint: "vertical channels make satisfying rebounds", motion: "still", cols: 21, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 33, name: "Circuit Blocks", hint: "four modules with cross-map lanes", motion: "still", cols: 22, rows: 9, top: 54, brickH: 32, gap: 7 },
  { id: 34, name: "Twin Warehouse", hint: "two boxed rooms under a sloped roof", motion: "still", cols: 22, rows: 8, top: 68, brickH: 35, gap: 7 },
  { id: 35, name: "Columns", hint: "three pillars with fragile crowns", motion: "gates", cols: 22, rows: 8, top: 70, brickH: 35, gap: 8 },
  { id: 36, name: "Sunrise Wall", hint: "big wall with a bright weak wedge", motion: "still", cols: 22, rows: 9, top: 54, brickH: 32, gap: 7 },
  { id: 37, name: "Hourglass", hint: "two bowls funnel balls through a center rail", motion: "breath", cols: 23, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 38, name: "Vortex Drop", hint: "inverted triangle sends balls deep inside", motion: "still", cols: 23, rows: 9, top: 52, brickH: 32, gap: 7 },
  { id: 39, name: "Sparse Fleet", hint: "lots of air, fast angles, high combo control", motion: "storm", cols: 22, rows: 8, top: 72, brickH: 34, gap: 8 }
];

const upgradeOptions: UpgradeOption[] = [
  { id: "paddle", title: "Wider Base", body: "Permanent paddle width for this run." },
  { id: "red", title: "Heavy Core", body: "More red balls, stronger heavy hits." },
  { id: "machine", title: "Stream Feed", body: "Machine-gun drops fire extra balls." },
  { id: "bombs", title: "Bigger Bombs", body: "Bomb cores hit wider and score more." },
  { id: "perfect", title: "Perfect Zone", body: "Center hits grant stronger frenzy." },
  { id: "mercy", title: "Breach Sense", body: "One-ball stalls breach faster." }
];

const UPGRADE_MAX_TIER = 8;
const upgradeTierColors = [0x13dbff, 0xfff26b, 0x6dff9a, 0xff4f38, 0xe7dcff, 0x00ffd1, 0xd38bff, 0xffffff] as const;
const upgradeTierNames = ["Blue", "Yellow", "Green", "Red", "Prism", "Nova", "Void", "Crown"] as const;
const upgradeTierTones = ["blue", "yellow", "green", "red", "prism", "nova", "void", "crown"] as const;
const paddleTierBonus = [0, 34, 76, 124, 180, 214, 244, 270, 292] as const;

const scoreEl = document.getElementById("score") as HTMLElement;
const comboEl = document.getElementById("combo") as HTMLElement;
const ballsEl = document.getElementById("balls") as HTMLElement;
const livesEl = document.getElementById("lives") as HTMLElement;
const levelEl = document.getElementById("level") as HTMLElement;
const objectiveEl = document.getElementById("objective") as HTMLElement;
const objectiveFillEl = document.getElementById("objectiveFill") as HTMLElement;
const comboFillEl = document.getElementById("comboFill") as HTMLElement;
const overlay = document.getElementById("overlay") as HTMLElement;
const choicePanel = document.getElementById("choicePanel") as HTMLDivElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const pauseBtn = document.getElementById("pauseBtn") as HTMLButtonElement;
const launchBtn = document.getElementById("launchBtn") as HTMLButtonElement;
const muteBtn = document.getElementById("muteBtn") as HTMLButtonElement;
const canvas = document.getElementById("game") as HTMLCanvasElement;

const state = {
  running: false,
  paused: false,
  launched: false,
  muted: false,
  score: 0,
  combo: 1,
  comboClock: 0,
  lastComboSting: 0,
  lastComboBonus: 0,
  bestComboRun: 1,
  maxBallsRun: 0,
  level: 1,
  levelClock: 0,
  levelToast: 0,
  shake: 0,
  flash: 0,
  lives: 3,
  brickDifficulty: 1,
  skillPressure: 1,
  levelAge: 0,
  levelStartBricks: 0,
  objective: null as ObjectiveState | null,
  perfectHits: 0,
  directorHelpClock: 0,
  directorClearRate: 0,
  directorBallTrend: 0,
  directorPanic: 0,
  directorDominance: 0,
  directorDropBias: 0,
  directorHpBias: 1,
  directorNoProgressClock: 0,
  directorLastClearRatio: 0,
  directorLastBallCount: 0,
  overcharge: 0,
  redStorm: 0,
  timeWarp: 0,
  pierce: 0,
  goldRush: 0,
  autoLaser: 0,
  autoLaserClock: 0,
  autoLaserSide: -1,
  waitingChoice: false,
  bankedPowerChoices: 0,
  pendingPowerChoices: 0,
  queuedPowerRewards: [] as PowerKind[],
  launchPowerQueue: [] as PowerKind[],
  powerDropPity: 0,
  goldenDropPity: 0,
  runUpgrades: {
    paddle: 0,
    red: 0,
    machine: 0,
    bombs: 0,
    perfect: 0,
    mercy: 0
  } as Record<UpgradeId, number>,
  chomperCooldown: 9,
  singleBallClock: 0,
  stallBreachClock: 0,
  feverPulse: 0,
  slowField: 0,
  mercyDropClock: 0,
  machineGunShots: 0,
  machineGunClock: 0,
  trainShots: 0,
  trainClock: 0,
  trainAngle: -Math.PI / 2,
  trainX: WORLD_W / 2,
  pointerX: WORLD_W / 2,
  keys: new Set<string>(),
  audio: null as AudioContext | null,
  hpPressure: 1,
  pacePressure: 1,
  paddleHits: 0,
  paddleDrains: 0,
  consecutiveFails: 0,
  consecutiveSuccesses: 0,
  mercyBudget: 0,
  maxMercyPerLife: 3,
  progressVelocity: 0,
  velocityBrickKills: 0,
  velocityClock: 0,
  chomperWarningTimer: 0,
  chomperWarningSide: 0,
  powerupPicks: {} as Record<string, number>
};

const paddle = {
  x: WORLD_W / 2,
  y: WORLD_H - 70,
  w: 250,
  h: 30,
  speed: 0,
  widen: 0,
  shrink: 0,
  widenStacks: 0,
  shrinkStacks: 0,
  cooldown: 0,
  sprite: null as Sprite | null
};

startBtn.hidden = true;
const loadingHint = document.createElement("p");
loadingHint.textContent = "Loading assets\u2026";
loadingHint.style.cssText = "margin:0;color:#aeb9cc;font-size:17px;";
(overlay.querySelector("p")?.parentElement || overlay).appendChild(loadingHint);

const app = new Application();
await app.init({
  canvas,
  width: WORLD_W,
  height: WORLD_H,
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  preference: "webgl"
});

const root = new Container();
const bgLayer = new Container();
const arenaLayer = new Container();
const brickLayer = new Container();
const powerLayer = new Container();
const actorLayer = new Container();
const effectLayer = new Container();
const uiLayer = new Container();
app.stage.addChild(root);
root.addChild(bgLayer, arenaLayer, brickLayer, powerLayer, actorLayer, effectLayer, uiLayer);

const bgSprite = new Sprite();
bgLayer.addChild(bgSprite);

const arenaGfx = new Graphics();
const slowFieldGfx = new Graphics();
const paddleZoneGfx = new Graphics();
const flashGfx = new Graphics();
const effectStripGfx = new Graphics();
const effectStripLayer = new Container();
const chomperWarningGfx = new Graphics();
const pauseUpgradeGfx = new Graphics();
const pauseUpgradeLayer = new Container();
arenaLayer.addChild(arenaGfx, slowFieldGfx);
actorLayer.addChild(paddleZoneGfx);
uiLayer.addChild(flashGfx, effectStripGfx, effectStripLayer, chomperWarningGfx, pauseUpgradeGfx, pauseUpgradeLayer);

const toastBox = new Graphics();
const toastTitle = new Text({
  text: "",
  style: {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 42,
    fontWeight: "900",
    fill: 0xffffff,
    align: "center"
  }
});
const toastHint = new Text({
  text: "",
  style: {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 18,
    fontWeight: "700",
    fill: 0xd6efff,
    align: "center"
  }
});
toastTitle.anchor.set(0.5);
toastHint.anchor.set(0.5);
toastTitle.position.set(WORLD_W / 2, 452);
toastHint.position.set(WORLD_W / 2, 480);

const pauseScrim = new Graphics();
const pauseTitle = new Text({
  text: "PAUSE",
  style: {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 104,
    fontWeight: "900",
    fill: 0xffffff,
    align: "center"
  }
});
const pauseSub = new Text({
  text: "Resume when ready",
  style: {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 24,
    fontWeight: "800",
    fill: 0xd6efff,
    align: "center"
  }
});
pauseTitle.anchor.set(0.5);
pauseSub.anchor.set(0.5);
pauseTitle.position.set(WORLD_W / 2, WORLD_H / 2 - 22);
pauseSub.position.set(WORLD_W / 2, WORLD_H / 2 + 58);
pauseScrim.alpha = 0;
pauseTitle.alpha = 0;
pauseSub.alpha = 0;
uiLayer.addChild(toastBox, toastTitle, toastHint, pauseScrim, pauseTitle, pauseSub);

const assetUrls = [
  atlasUrl,
  ...Object.values(backgroundUrls)
] as const;
await Assets.load([...assetUrls]);

const atlasTexture = Texture.from(atlasUrl);
const backgroundTextures = new Map<string, Texture>();
Object.entries(backgroundUrls).forEach(([key, url]) => {
  backgroundTextures.set(key, Texture.from(url));
});

const spriteTextures = createAtlasTextures(atlasTexture);
const bricks: Brick[] = [];
const balls: Ball[] = [];
const powerups: Powerup[] = [];
const lasers: Laser[] = [];
const clusterEvents: ClusterEvent[] = [];
const particles: Particle[] = [];
const chompers: Chomper[] = [];
const shockRings: ShockRing[] = [];
const floatTexts: FloatText[] = [];
let audioOutput: AudioNode | null = null;
let audioWindowStart = 0;
let audioWindowVoices = 0;

createPaddle();
drawArena();
resizeRenderer();
resetLevel(false);
updateHud();
requestAnimationFrame(() => resizeRenderer());

loadingHint.remove();
startBtn.hidden = false;

let accumulator = 0;
app.ticker.add((ticker) => {
  const rawDt = Math.min(0.05, ticker.deltaMS / 1000);
  accumulator = Math.min(0.08, accumulator + rawDt);

  while (accumulator >= FIXED_DT) {
    update(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  renderFrame(rawDt);
});

function createAtlasTextures(texture: Texture): Record<SpriteName, Texture> {
  const names: Record<SpriteName, [number, number]> = {
    paddle: [0, 0],
    ball: [1, 0],
    split: [0, 2],
    laser: [1, 2],
    burst: [2, 2],
    shard: [3, 2]
  };
  const cellW = texture.width / 4;
  const cellH = texture.height / 3;
  const result = {} as Record<SpriteName, Texture>;

  for (const [name, [cx, cy]] of Object.entries(names) as [SpriteName, [number, number]][]) {
    result[name] = new Texture({
      source: texture.source,
      frame: new Rectangle(cx * cellW, cy * cellH, cellW, cellH)
    });
  }

  return result;
}

function currentLevel(): LevelConfig {
  return levels[(state.level - 1) % levels.length];
}

function currentArcadeLayout(): ArcadeLayout {
  return arcadeLayouts[(state.level - 1) % arcadeLayouts.length];
}

function levelCycle(): number {
  return Math.floor((state.level - 1) / levels.length);
}

function levelLabel(): string {
  return `L${state.level} ${currentLevel().name}`;
}

function createPaddle(): void {
  const sprite = new Sprite(spriteTextures.paddle);
  sprite.anchor.set(0.5);
  sprite.width = paddle.w + 56;
  sprite.height = 96;
  paddle.sprite = sprite;
  actorLayer.addChild(sprite);
}

function resetLevel(autoLaunch: boolean, keepBalls = false): void {
  clearLevelObjects(keepBalls);
  state.launched = keepBalls && balls.length > 0;
  if (!keepBalls) {
    state.combo = 1;
    state.comboClock = 0;
    state.lastComboSting = 0;
    state.lastComboBonus = 0;
    state.chomperCooldown = 9;
    state.singleBallClock = 0;
    state.stallBreachClock = 0;
    state.mercyDropClock = 0;
    state.slowField = 0;
    state.machineGunShots = 0;
    state.machineGunClock = 0;
    state.trainShots = 0;
    state.trainClock = 0;
    state.overcharge = 0;
    state.redStorm = 0;
    state.timeWarp = 0;
    state.pierce = 0;
    state.goldRush = 0;
    state.autoLaser = 0;
    state.autoLaserClock = 0;
  }
  state.levelClock = 0;
  state.levelAge = 0;
  state.levelToast = 2.4;
  state.velocityBrickKills = 0;
  state.velocityClock = 0;
  state.progressVelocity = 0;
  state.hpPressure = state.hpPressure * 0.82 + 0.18;
  state.pacePressure = state.pacePressure * 0.82 + 0.18;
  state.skillPressure = state.hpPressure;
  state.flash = Math.max(state.flash, 0.18);
  if (!keepBalls) {
    paddle.x = WORLD_W / 2;
    paddle.speed = 0;
    paddle.widen = 0;
    paddle.shrink = 0;
    paddle.widenStacks = 0;
    paddle.shrinkStacks = 0;
    state.pointerX = paddle.x;
  }
  paddle.cooldown = 0;

  setBackground(currentLevel());
  drawArena();
  buildBricks();
  setupObjective();
  updateDynamicBrickDifficulty(true);

  if (autoLaunch) {
    launchLevelBalls();
  } else if (!keepBalls || balls.length === 0) {
    makeBall(paddle.x, paddle.y - 54, -Math.PI / 2, 0, 16);
  }

  updateHud();
}

function clearLevelObjects(keepBalls = false): void {
  for (const brick of bricks) brick.body.destroy({ children: true });
  if (!keepBalls) {
    for (const ball of balls) {
      ball.aura.destroy();
      ball.sprite.destroy();
    }
    balls.length = 0;
  }
  for (const powerup of powerups) powerup.sprite.destroy();
  for (const laser of lasers) laser.gfx.destroy();
  for (const particle of particles) particle.sprite.destroy();
  if (!keepBalls) {
    for (const chomper of chompers) chomper.sprite.destroy();
    chompers.length = 0;
  } else {
    for (const chomper of chompers) {
      chomper.mode = "hunt";
      chomper.target = null;
      chomper.age = Math.min(chomper.age, 1.2);
      chomper.x = clamp(chomper.x, 80, WORLD_W - 80);
      chomper.y = clamp(chomper.y, 90, WORLD_H * 0.45);
      chomper.vx *= 0.45;
      chomper.vy *= 0.45;
    }
  }
  for (const ring of shockRings) ring.gfx.destroy();
  for (const floatText of floatTexts) floatText.text.destroy();
  bricks.length = 0;
  powerups.length = 0;
  lasers.length = 0;
  clusterEvents.length = 0;
  particles.length = 0;
  shockRings.length = 0;
  floatTexts.length = 0;
}

function setBackground(level: LevelConfig): void {
  const texture = backgroundTextures.get(level.background);
  if (!texture) return;
  bgSprite.texture = texture;
  fitCover(bgSprite, WORLD_W, WORLD_H);
}

function fitCover(sprite: Sprite, width: number, height: number): void {
  const scale = Math.max(width / sprite.texture.width, height / sprite.texture.height);
  sprite.width = sprite.texture.width * scale;
  sprite.height = sprite.texture.height * scale;
  sprite.x = (width - sprite.width) / 2;
  sprite.y = (height - sprite.height) / 2;
}

function buildBricks(): void {
  const level = currentLevel();
  const layout = currentArcadeLayout();
  const side = 82;
  const bw = (WORLD_W - side * 2 - layout.gap * (layout.cols - 1)) / layout.cols;
  const bh = layout.brickH;
  const cycle = levelCycle();

  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const cell = arcadeCellFor(layout, level, col, row);
      if (!cell) continue;

      const { type, role } = cell;
      let hp = 1 + Math.floor(row / 4) + cycle;
      if (type === "steel") hp += 3 + cycle;
      if (role === "shell") hp += 4 + Math.min(3, cycle);
      hp += cell.hpBonus;
      if (type === "bomb") hp = 1 + Math.min(1, cycle);
      if (type === "green") hp = Math.max(1, hp - 1);
      if (role === "widen" || role === "shrink") hp = Math.max(1, hp - 1);

      const x = side + col * (bw + layout.gap);
      const y = layout.top + row * (bh + layout.gap);
      const body = new Container();
      const skin = new Graphics();
      const hpText = new Text({
        text: "",
        style: {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 18,
          fontWeight: "900",
          fill: 0xffffff
        }
      });
      hpText.anchor.set(0.5);
      body.addChild(skin, hpText);
      brickLayer.addChild(body);

      const brick: Brick = {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        w: bw,
        h: bh,
        row,
        col,
        baseHp: hp,
        damage: 0,
        hp,
        maxHp: hp,
        type,
        role,
        phase: ((col * 0.73 + row * 1.31 + state.level * 0.47) % 1) * Math.PI * 2,
        flash: 0,
        body,
        skin,
        hpText
      };

      syncBrickHealth(brick);
      drawBrick(brick);
      bricks.push(brick);
    }
  }

  state.levelStartBricks = bricks.length;
}

function arcadeCellFor(layout: ArcadeLayout, level: LevelConfig, col: number, row: number): ArcadeCell | null {
  const symbol = arcadeSymbol(layout, col, row);
  if (symbol === ".") return null;
  return cellFromSymbol(symbol, level, col, row);
}

function cellFromSymbol(symbol: string, level: LevelConfig, col: number, row: number): ArcadeCell {
  const paletteType = level.palette[(col * 2 + row + state.level) % level.palette.length];
  const normal = paletteType === "bomb" || paletteType === "steel" ? "cyan" : paletteType;
  const table: Record<string, ArcadeCell> = {
    C: { type: "cyan", role: "normal", hpBonus: 0 },
    M: { type: "magenta", role: "normal", hpBonus: 0 },
    A: { type: "amber", role: "normal", hpBonus: 0 },
    G: { type: "green", role: "normal", hpBonus: 0 },
    P: { type: normal, role: "normal", hpBonus: 0 },
    S: { type: "steel", role: "shell", hpBonus: 3 },
    X: { type: "steel", role: "normal", hpBonus: 1 },
    B: { type: "bomb", role: "core", hpBonus: 0 },
    O: { type: "amber", role: "core", hpBonus: 1 },
    W: { type: "green", role: "widen", hpBonus: 0 },
    T: { type: "magenta", role: "shrink", hpBonus: 0 }
  };
  return table[symbol] ?? { type: normal, role: "normal", hpBonus: 0 };
}

function arcadeSymbol(layout: ArcadeLayout, col: number, row: number): string {
  const id = layout.id;
  const cols = layout.cols;
  const rows = layout.rows;
  const midX = (cols - 1) / 2;
  const midY = (rows - 1) / 2;
  const dx = Math.abs(col - midX);
  const dy = Math.abs(row - midY);
  const edge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
  const inner = row > 0 && row < rows - 1 && col > 0 && col < cols - 1;
  const colorBand = ["C", "G", "A", "M"][(col + row + state.level) % 4];

  if (id === 0) {
    if (edge && !(row >= rows - 2 && dx <= 1)) return "S";
    if (inner && row % 2 === 0 && col % 5 >= 2) return colorBand;
    if (inner && row === Math.floor(midY) && col % 4 === 1) return "B";
    if (row === rows - 2 && (col === 3 || col === cols - 4)) return "W";
    return ".";
  }

  if (id === 1) {
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) return "S";
    if (row % 2 === 1) return col % 3 === 0 ? "M" : "C";
    if (col % 4 !== 1) return col % 5 === 0 ? "B" : "G";
    return ".";
  }

  if (id === 2) {
    const tower = col % 5 === 1 || col % 5 === 2;
    if (tower && row < rows - 1) return row === 0 ? "S" : row % 3 === 0 ? "A" : colorBand;
    if (row === rows - 2 && (col === 5 || col === cols - 6)) return "B";
    return ".";
  }

  if (id === 3) {
    const d = dx / 1.45 + dy;
    if (d < 1.4) return "B";
    if (d < 3.2) return colorBand;
    if (d < 4.9) return "S";
    return ".";
  }

  if (id === 4) {
    const frame = edge || ((row === 2 || row === rows - 3) && col > 2 && col < cols - 3) || ((col === 3 || col === cols - 4) && row > 1 && row < rows - 2);
    if (frame && !(row === rows - 1 && dx <= 1)) return "S";
    if (dx <= 2 && dy <= 1) return dx + dy < 2 ? "B" : "A";
    if (inner && row % 2 === 1 && col % 3 !== 0) return colorBand;
    return ".";
  }

  if (id === 5) {
    const divider = col === Math.floor(midX) || row === Math.floor(midY);
    const room = ((col < midX - 1 || col > midX + 1) && (row < midY - 1 || row > midY + 1));
    if (divider && !(dx <= 1 && dy <= 1)) return "S";
    if (room && col % 2 === 0) return colorBand;
    if (dx <= 1 && dy <= 1) return "B";
    return ".";
  }

  if (id === 6) {
    const d = dx / 1.7 + dy * 1.12;
    if (d < 1.2) return "B";
    if (d < 2.4) return "M";
    if (d < 4.3) return (col + row) % 3 === 0 ? "G" : "A";
    if (d < 5.5 && row % 2 === 0) return "S";
    if (row === 1 && (col < 3 || col > cols - 4)) return "A";
    return ".";
  }

  if (id === 7) {
    if (row === 0 || row === rows - 1) return "S";
    if (col < 2 || col > cols - 3) return row % 2 === 0 ? "S" : ".";
    if (row === 2 || row === 5) return col < midX ? "G" : "M";
    if (row === 3 || row === 4) return col % 3 === 1 ? "." : "C";
    if (row === 1 && col % 5 === 0) return "B";
    return ".";
  }

  if (id === 8) {
    const d = Math.abs(dx - dy * 1.35);
    if (dy <= 1 && dx < 2) return "B";
    if (d < 0.85 && row > 0) return "S";
    if (dx + dy < 6.5 && row % 2 === 0) return colorBand;
    if (row === Math.floor(midY) && col % 3 !== 0) return "A";
    return ".";
  }

  if (id === 9) {
    const dome = row >= Math.floor(Math.sin((col / (cols - 1)) * Math.PI) * 2.8) && row <= rows - 2;
    if (!dome) return ".";
    if (edge || row === rows - 1) return "S";
    if (dy < 1.2 && col % 4 === 2) return "B";
    return (col + row) % 4 === 0 ? "G" : colorBand;
  }

  if (id === 10) {
    const left = col >= 1 && col <= 8;
    const right = col >= cols - 9 && col <= cols - 2;
    if ((left || right) && (row === 0 || row === rows - 1 || col === 1 || col === 8 || col === cols - 9 || col === cols - 2)) return "S";
    if ((left || right) && row > 1 && row < rows - 2) return row % 2 === 0 ? "C" : "A";
    if (dx <= 1 && row % 2 === 1) return "B";
    return ".";
  }

  if (id === 11) {
    const d = dx / 1.5 + dy * 1.18;
    if (d > 2.2 && d < 4.6) return (col + row) % 5 === 0 ? "S" : colorBand;
    if ((row === 1 || row === rows - 2) && (col === 3 || col === cols - 4)) return "B";
    if (dx < 1.2 && dy < 1.2) return "W";
    return ".";
  }

  if (id === 12) {
    const outer = edge && !(row === rows - 1 && dx <= 1);
    const innerWall = (row === 2 && col > 2 && col < cols - 3) || (col === cols - 4 && row > 2 && row < rows - 2) || (row === rows - 3 && col > 4 && col < cols - 4) || (col === 4 && row > 3 && row < rows - 3);
    if (outer || innerWall) return "S";
    if (col >= 5 && col <= 7 && row === rows - 4) return "B";
    if (inner && (col + row) % 4 === 0) return colorBand;
    return ".";
  }

  if (id === 13) {
    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) return dx <= 1 && row === rows - 1 ? "." : "S";
    if (row === 2 || row === rows - 3) return col % 2 === 0 ? "A" : "C";
    if (dx <= 2 && dy <= 1) return "B";
    if (col > 4 && col < cols - 5 && row % 2 === 1) return "G";
    return ".";
  }

  if (id === 14) {
    const body = dx / 2.25 + dy < 4.2;
    const wings = row >= 2 && row <= rows - 3 && (col < 5 || col > cols - 6);
    if (body && dy < 1.4 && dx < 2.2) return "B";
    if (body) return dy > 2.6 ? "S" : colorBand;
    if (wings && row % 2 === 0) return "A";
    return ".";
  }

  if (id === 15) {
    const ring = edge || row === 2 || row === rows - 3 || col === 3 || col === cols - 4;
    const gate = (row === rows - 1 && dx <= 1) || (row === 2 && dx <= 1) || (col === 3 && dy <= 1);
    if (ring && !gate) return "S";
    if (dx <= 2 && dy <= 1) return "B";
    if (inner && (col + row) % 3 === 0) return colorBand;
    return ".";
  }

  if (id === 16) {
    if ((col + row) % 2 === 0 && !(row > rows - 3 && col % 5 === 0)) return colorBand;
    if (dx <= 1 || dy <= 1) return (col + row) % 3 === 0 ? "B" : "S";
    return ".";
  }

  if (id === 17) {
    const centers = [
      { x: 5, y: 2 },
      { x: cols - 6, y: 2 },
      { x: 5, y: rows - 3 },
      { x: cols - 6, y: rows - 3 }
    ];
    for (const center of centers) {
      const d = Math.abs(col - center.x) + Math.abs(row - center.y);
      if (d === 0) return "B";
      if (d <= 2) return d === 2 ? "S" : colorBand;
    }
    if (dx <= 1 && dy <= 1) return "W";
    return ".";
  }

  if (id === 18) {
    if (edge && !(row === rows - 1 && dx <= 2)) return "S";
    if ((col === 5 || col === cols - 6) && row > 1 && row < rows - 2) return "S";
    if ((Math.abs(col - 7) <= 1 || Math.abs(col - (cols - 8)) <= 1) && dy <= 1) return "B";
    if (inner && row % 2 === 1 && col % 3 !== 0) return colorBand;
    return ".";
  }

  if (id === 19) {
    if (row <= 1 && col % 5 === 2) return "S";
    if (row <= 2 && col % 5 === 3) return "B";
    if (row >= 3 && row <= rows - 2 && col > 1 && col < cols - 2 && col % 2 === 0) return row % 2 === 0 ? "C" : "G";
    if (row === rows - 1 && col % 4 === 0) return "A";
    return ".";
  }

  if (id === 20) {
    if (row === 0 || row === rows - 1) return "S";
    if (row === 2 || row === 5) return col % 4 === 1 ? "." : "A";
    if (row === 1 || row === 6) return col % 5 === 0 ? "." : "C";
    if (row === 3 || row === 4) return col % 3 === 0 ? "B" : ".";
    return ".";
  }

  if (id === 21) {
    const bridge = row === 0 || row === rows - 1 || (row === Math.floor(midY) && dx <= 1);
    const tower = (col >= 2 && col <= 7) || (col >= cols - 8 && col <= cols - 3);
    if (bridge && col > 1 && col < cols - 2) return "G";
    if (tower && row > 1 && row < rows - 1) {
      if (row === 2 || row === rows - 3 || col === 2 || col === 7 || col === cols - 8 || col === cols - 3) return "M";
      if (row === Math.floor(midY) && (col === 4 || col === cols - 5)) return "B";
      return "C";
    }
    return ".";
  }

  if (id === 22) {
    const ribbon = Math.abs(row - midY + Math.sin(col * 0.7) * 1.6) < 1.2 || Math.abs(row - midY - Math.sin(col * 0.7) * 1.6) < 1.2;
    if (ribbon) return (col + row) % 6 === 0 ? "B" : colorBand;
    if ((col === 0 || col === cols - 1) && row > 1 && row < rows - 2) return "S";
    return ".";
  }

  if (id === 23) {
    const outer = edge && !(row === rows - 1 && dx <= 2);
    const innerRing = row === 2 || row === rows - 3 || col === 4 || col === cols - 5;
    if (outer || (innerRing && row > 1 && row < rows - 2 && col > 3 && col < cols - 4)) return "S";
    if (dx <= 2 && dy <= 1) return dx < 1 && dy < 1 ? "B" : "M";
    if (inner && (row + col) % 3 === 0) return colorBand;
    return ".";
  }

  if (id === 24) {
    const width = rows - row + 2;
    if (dx <= width) {
      if (row >= rows - 2) return "S";
      if (row === 1 && dx <= 1) return "M";
      if (row === rows - 4 && dx <= 2) return "B";
      return row % 3 === 0 ? "G" : "A";
    }
    if (row === rows - 1 && dx <= width + 2) return "S";
    return ".";
  }

  if (id === 25) {
    const wingLeft = Math.abs(col - 6) + Math.abs(row - midY) < 5;
    const wingRight = Math.abs(col - (cols - 7)) + Math.abs(row - midY) < 5;
    const spine = dx <= 1 && row > 0 && row < rows - 1;
    if (spine) return row % 3 === 0 ? "B" : "S";
    if (wingLeft || wingRight) return (row + col) % 4 === 0 ? "G" : colorBand;
    if ((row === 1 || row === rows - 2) && dx < 6) return "S";
    return ".";
  }

  if (id === 26) {
    const leftD = Math.abs(col - 6) / 1.3 + dy;
    const rightD = Math.abs(col - (cols - 7)) / 1.3 + dy;
    if (leftD < 3.5 || rightD < 3.5) return Math.min(leftD, rightD) < 1.2 ? "B" : colorBand;
    if ((row === 0 || row === rows - 1) && col > 2 && col < cols - 3) return "A";
    return ".";
  }

  if (id === 27) {
    if (edge) return "S";
    if (row === 1 || row === rows - 2) return "C";
    if (row === 2 || row === rows - 3) return "G";
    if (row === 3) return "A";
    if (row === 4) return "X";
    if (dx <= 1 && dy <= 1) return "B";
    return "M";
  }

  if (id === 28) {
    const lens = dx / 1.9 + dy * 1.2;
    if (lens < 1.2) return "B";
    if (lens < 2.4) return "M";
    if (lens < 4.6) return row % 2 === 0 ? "A" : "C";
    if ((row === 0 || row === rows - 1) && dx < 7) return "S";
    return ".";
  }

  if (id === 29) {
    if (row % 2 === 0 && row < rows - 1) return col % 4 === 1 ? "." : "C";
    if (row % 2 === 1 && col > 1 && col < cols - 2) return col % 5 === 0 ? "B" : colorBand;
    return ".";
  }

  if (id === 30) {
    const pillar = col === 4 || col === 5 || Math.abs(col - midX) <= 1 || col === cols - 6 || col === cols - 5;
    if (pillar && row > 1 && row < rows - 1) return row === Math.floor(midY) ? "B" : row % 2 === 0 ? "G" : "S";
    if ((row === 1 || row === rows - 1) && (pillar || col % 7 === 3)) return "A";
    if (row === 0 && (col === 4 || Math.abs(col - midX) <= 1 || col === cols - 5)) return "S";
    return ".";
  }

  if (id === 31) {
    const petal = (dx <= 2 && dy <= 4) || (dx <= 6 && dy <= 1.5);
    if (dx <= 1 && dy <= 1) return "B";
    if (petal) return (Math.floor(dx + dy) % 3 === 0) ? "S" : colorBand;
    if (dy <= 2 && (col < 4 || col > cols - 5)) return "A";
    return ".";
  }

  if (id === 32) {
    if (col === 0 || col === cols - 1) return "S";
    if (col % 4 === 1 || col % 4 === 2) return row === rows - 2 ? "B" : "C";
    if (col % 4 === 0 && row % 2 === 1) return "A";
    return ".";
  }

  if (id === 33) {
    const moduleCol = col < midX - 1 || col > midX + 1;
    const moduleRow = row < midY - 1 || row > midY + 1;
    const frame = moduleCol && moduleRow && ((col % 7 === 1 || col % 7 === 5) || (row % 4 === 0));
    if (frame) return "S";
    if (moduleCol && moduleRow) return (col + row) % 5 === 0 ? "B" : colorBand;
    if (dx <= 1 || dy <= 1) return "A";
    return ".";
  }

  if (id === 34) {
    const roof = row <= 2 && dx < 8 - row * 1.5;
    const rooms = row >= 3 && row <= rows - 2 && ((col >= 3 && col <= 8) || (col >= cols - 9 && col <= cols - 4));
    if (roof) return row === 0 ? "S" : "M";
    if (rooms) {
      const roomEdge = col === 3 || col === 8 || col === cols - 9 || col === cols - 4 || row === 3 || row === rows - 2;
      if (roomEdge) return "S";
      return (col + row) % 2 === 0 ? "G" : "A";
    }
    if (dx <= 1 && row === rows - 3) return "B";
    return ".";
  }

  if (id === 35) {
    const centers = [4, Math.floor(midX), cols - 5];
    for (const center of centers) {
      if (Math.abs(col - center) <= 1 && row > 1 && row < rows - 1) return row === rows - 2 ? "S" : "X";
      if (Math.abs(col - center) <= 2 && row === 1) return "A";
      if (col === center && row === Math.floor(midY)) return "B";
    }
    if (row === rows - 1 && centers.some((center) => Math.abs(col - center) <= 2)) return "S";
    return ".";
  }

  if (id === 36) {
    if (edge) return "S";
    if (row >= rows - 4 && dx < (rows - row) * 2.2 + 1) return row === rows - 3 ? "B" : "A";
    if (row >= 1 && row < rows - 3) return col % 2 === 0 ? "C" : "X";
    return ".";
  }

  if (id === 37) {
    const topBowl = row <= 3 && dx < row * 2.1 + 2;
    const bottomBowl = row >= rows - 4 && dx < (rows - 1 - row) * 2.1 + 2;
    if (topBowl || bottomBowl) return dx < 1 && (row === 3 || row === rows - 4) ? "B" : colorBand;
    if (row === Math.floor(midY) && col > 2 && col < cols - 3) return "S";
    return ".";
  }

  if (id === 38) {
    const inverted = row <= rows - 2 && dx < (rows - row) * 1.35;
    if (inverted) {
      if (row <= 1) return "S";
      if (dx <= 1 && row >= 3) return "B";
      return row % 2 === 0 ? "G" : colorBand;
    }
    if (row >= rows - 2 && (col < 6 || col > cols - 7) && dx > 5) return "A";
    return ".";
  }

  if (id === 39) {
    if (row < rows - 2 && col > 1 && col < cols - 2 && col % 2 === 0) return row % 3 === 0 ? "C" : ".";
    if (row === 3 && dx < 3) return "S";
    if (row === 4 && dx < 2) return "B";
    if (row === 5 && dx < 3) return "A";
    return ".";
  }

  return ".";
}

function setupObjective(): void {
  const objectiveIndex = (state.level - 1) % 3;
  const deadline = challengeDeadline();
  if (objectiveIndex === 0) {
    const coreCount = bricks.filter((brick) => brick.role === "core" || brick.type === "bomb").length;
    state.objective = {
      id: "core",
      label: "Break cores",
      target: Math.max(2, Math.min(6, coreCount)),
      progress: 0,
      complete: false,
      failed: false,
      deadline
    };
  } else if (objectiveIndex === 1) {
    state.objective = {
      id: "combo",
      label: "Reach combo",
      target: Math.min(42, 18 + state.level * 2),
      progress: 1,
      complete: false,
      failed: false,
      deadline
    };
  } else {
    state.objective = {
      id: "perfect",
      label: "Perfect hits",
      target: 3 + Math.min(4, levelCycle() + state.runUpgrades.perfect),
      progress: 0,
      complete: false,
      failed: false,
      deadline
    };
  }
}

function updateObjective(): void {
  const objective = state.objective;
  if (!objective || objective.complete) return;

  if (!objective.failed && state.levelAge > objective.deadline) {
    objective.failed = true;
    popText(WORLD_W / 2, 132, "CHALLENGE MISSED", 0xff4f78);
    shockwave(WORLD_W / 2, 132, 0xff4f78, 64);
  }

  if (objective.failed) return;

  if (objective.id === "core") {
    const remaining = bricks.filter((brick) => brick.role === "core" || brick.type === "bomb").length;
    objective.progress = clamp(objective.target - remaining, 0, objective.target);
  } else if (objective.id === "combo") {
    objective.progress = Math.max(objective.progress, state.combo);
  }

  if (objective.progress >= objective.target) completeObjective();
}

function challengeDeadline(): number {
  const layout = currentArcadeLayout();
  const base = layout.rows >= 9 || layout.cols >= 22 ? 78 : 70;
  const cyclePenalty = Math.min(10, levelCycle() * 3);
  const objectiveBonus = ((state.level - 1) % 3) === 2 ? 10 : 0;
  return base + objectiveBonus - cyclePenalty;
}

function objectiveTimeRemaining(): number {
  const objective = state.objective;
  if (!objective) return 0;
  return Math.max(0, objective.deadline - state.levelAge);
}

function completeObjective(): void {
  const objective = state.objective;
  if (!objective || objective.complete || objective.failed) return;

  objective.complete = true;
  const bonus = 1800 + state.level * 280;
  state.score += bonus;
  state.feverPulse = Math.min(1, state.feverPulse + 0.35);
  state.flash = Math.max(state.flash, 0.08);
  bankPowerChoice("BONUS PICK");
  popText(WORLD_W / 2, 132, "OBJECTIVE", 0xfff26b);
  shockwave(WORLD_W / 2, 132, 0xfff26b, 82);
}

function bankPowerChoice(label = "PICK BANKED"): void {
  state.bankedPowerChoices = Math.min(4, state.bankedPowerChoices + 1);
  state.score += 700 + state.level * 110;
  popText(WORLD_W / 2, 174, label, 0xffffff);
}

function shouldPlaceBrick(level: LevelConfig, col: number, row: number, rng: () => number): boolean {
  const midX = (level.cols - 1) / 2;
  const midY = (level.rows - 1) / 2;
  if (isBombClusterCell(level, col, row)) return true;

  if (level.pattern === "vault") {
    const inner = row > 1 && row < level.rows - 2 && col > 1 && col < level.cols - 2;
    const bait = inner && (col + row + state.level) % 4 !== 1;
    return isVaultShellCell(level, col, row) || isVaultCoreBombCell(level, col, row) || isVaultStrutCell(level, col, row) || bait;
  }

  if (level.pattern === "coil") {
    const innerFill = row > 1 && row < level.rows - 2 && col > 1 && col < level.cols - 2 && (col + row) % 5 === 0;
    return isVaultShellCell(level, col, row) || isCoilWallCell(level, col, row) || isCoilBombCell(level, col, row) || innerFill;
  }

  if (level.pattern === "reef") {
    return !(row === 2 && col % 5 === 2) && !(row > 3 && col % 6 === 3);
  }

  if (level.pattern === "crater") {
    const dx = (col - midX) / level.cols;
    const dy = (row - midY) / level.rows * 1.45;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d > 0.09 && d < 0.5 || (col + row) % 6 === 0;
  }

  if (level.pattern === "lanes") {
    return col % 4 !== 1 || row % 2 === 0;
  }

  if (level.pattern === "diamond") {
    const d = Math.abs(col - midX) / 1.15 + Math.abs(row - midY) * 1.38;
    return d < level.rows * 0.92 && !(d < 1.1 && row !== 0);
  }

  if (level.pattern === "fortress") {
    const outer = row < 2 || row > level.rows - 3 || col < 2 || col > level.cols - 3;
    const gate = Math.abs(col - midX) < 1.2;
    const cross = row % 2 === 0 && col % 4 === 0;
    return outer || gate || cross;
  }

  if (level.pattern === "storm") {
    return (col + row * 2) % 5 !== 0 && !(row > level.rows - 3 && col % 6 === 2) && rng() > 0.035;
  }

  return true;
}

function chooseBrickType(level: LevelConfig, col: number, row: number, rng: () => number): BrickType {
  let type = level.palette[(col * 2 + row + state.level) % level.palette.length];

  if (isBombClusterCell(level, col, row) && !isStrategicShellCell(level, col, row)) return "bomb";
  if (level.pattern === "vault") {
    if (isVaultCoreBombCell(level, col, row)) return "bomb";
    if (isVaultShellCell(level, col, row) || isVaultStrutCell(level, col, row)) return "steel";
    if ((col + row) % 4 === 0) return "green";
  }
  if (level.pattern === "coil") {
    if (isCoilBombCell(level, col, row)) return "bomb";
    if (isVaultShellCell(level, col, row) || isCoilWallCell(level, col, row)) return "steel";
    if ((col + row) % 3 === 0) return "amber";
  }
  if (level.pattern === "crater" && ((col + row) % 5 === 0 || rng() < (level.bombWeight ?? 0))) type = "bomb";
  if (level.pattern === "lanes" && (col + row) % 5 === 0) type = "green";
  if (level.pattern === "diamond") {
    const midX = (level.cols - 1) / 2;
    if (Math.abs(col - midX) < 1.1 || row === 0) type = "steel";
  }
  if (level.pattern === "fortress") {
    const midX = (level.cols - 1) / 2;
    if (col < 2 || col > level.cols - 3 || Math.abs(col - midX) < 1.1) type = "steel";
  }
  if (level.pattern === "storm") {
    if (rng() < (level.bombWeight ?? 0.12)) type = "bomb";
    else if (rng() < 0.25) type = "green";
  }

  return type;
}

function chooseBrickRole(level: LevelConfig, col: number, row: number, type: BrickType): BrickRole {
  if (type === "bomb") return "core";
  if (isStrategicShellCell(level, col, row)) return "shell";

  const midX = (level.cols - 1) / 2;
  const lowerLane = row === Math.max(2, level.rows - 3);
  const upperLane = row === Math.max(2, Math.floor(level.rows * 0.38));
  if (type !== "steel" && lowerLane && Math.abs(col - (midX - 3)) <= 0.7) return "widen";
  if (type !== "steel" && lowerLane && Math.abs(col - (midX + 3)) <= 0.7) return "shrink";

  if ((level.pattern === "vault" || level.pattern === "coil") && type !== "steel") {
    if (upperLane && (col + state.level) % 7 === 0) return "widen";
    if (upperLane && (col + state.level) % 9 === 0) return "shrink";
  }

  return "normal";
}

function isVaultGateCell(level: LevelConfig, col: number, row: number): boolean {
  const midX = (level.cols - 1) / 2;
  const midY = (level.rows - 1) / 2;
  const bottomEntry = row >= level.rows - 2 && Math.abs(col - midX) <= 1;
  const sideSlip = Math.abs(row - midY) <= 1 && (col <= 1 || col >= level.cols - 2);
  const topVent = row === 0 && Math.abs(col - midX) <= 1 && state.level % 2 === 0;
  return bottomEntry || sideSlip || topVent;
}

function isVaultShellCell(level: LevelConfig, col: number, row: number): boolean {
  const shell = row <= 1 || row >= level.rows - 2 || col <= 1 || col >= level.cols - 2;
  return shell && !isVaultGateCell(level, col, row);
}

function isVaultCoreBombCell(level: LevelConfig, col: number, row: number): boolean {
  const midX = (level.cols - 1) / 2;
  const midY = (level.rows - 1) / 2;
  const dx = Math.abs(col - midX);
  const dy = Math.abs(row - midY);
  return dx <= 2 && dy <= 1 && dx + dy <= 2.6;
}

function isVaultStrutCell(level: LevelConfig, col: number, row: number): boolean {
  if (isVaultCoreBombCell(level, col, row)) return false;
  const midX = (level.cols - 1) / 2;
  const midY = (level.rows - 1) / 2;
  const inner = row > 1 && row < level.rows - 2 && col > 1 && col < level.cols - 2;
  if (!inner) return false;
  const verticalGuard = Math.abs(col - midX) <= 4 && Math.abs(col - midX) >= 3 && Math.abs(row - midY) <= 2;
  const angledGuard = (col + row + state.level) % 6 === 0 && Math.abs(row - midY) <= 2;
  return verticalGuard || angledGuard;
}

function isCoilWallCell(level: LevelConfig, col: number, row: number): boolean {
  const inner = row > 1 && row < level.rows - 2 && col > 1 && col < level.cols - 2;
  if (!inner) return false;
  const leftGap = row % 4 === 1;
  const passageCol = leftGap ? 2 : level.cols - 3;
  if (Math.abs(col - passageCol) <= 1) return false;
  return row % 2 === 0 || col === (leftGap ? level.cols - 4 : 3);
}

function isCoilBombCell(level: LevelConfig, col: number, row: number): boolean {
  const inner = row > 1 && row < level.rows - 2 && col > 1 && col < level.cols - 2;
  if (!inner) return false;
  const leftPocket = row % 4 === 1 && col >= 3 && col <= 4;
  const rightPocket = row % 4 !== 1 && col >= level.cols - 5 && col <= level.cols - 4;
  return row % 2 === 1 && (leftPocket || rightPocket);
}

function isStrategicShellCell(level: LevelConfig, col: number, row: number): boolean {
  return (level.pattern === "vault" || level.pattern === "coil") &&
    (isVaultShellCell(level, col, row) || isVaultStrutCell(level, col, row) || isCoilWallCell(level, col, row));
}

function isBombClusterCell(level: LevelConfig, col: number, row: number): boolean {
  if (level.rows < 5 || level.cols < 10) return false;

  const cycleOffset = levelCycle() % 2;
  const centers = [
    {
      col: clamp(Math.floor(level.cols * 0.27) + (state.level % 3) - 1, 2, level.cols - 3),
      row: clamp(Math.floor(level.rows * 0.42) + cycleOffset, 1, level.rows - 2)
    },
    {
      col: clamp(Math.floor(level.cols * 0.72) - cycleOffset, 2, level.cols - 3),
      row: clamp(Math.floor(level.rows * 0.58) - (state.level % 2), 1, level.rows - 2)
    }
  ];

  return centers.some((center) => {
    const dx = Math.abs(col - center.col);
    const dy = Math.abs(row - center.row);
    return dx <= 1 && dy <= 1 && dx + dy <= 2;
  });
}

function ballPressureMultiplier(count = balls.length): number {
  if (count <= 1) return 0.82;
  if (count <= 3) return 0.94;
  if (count <= 6) return 1;
  if (count > 50) return 3;
  if (count > 30) return 2.5;
  if (count > 20) return 2;
  if (count > 10) return 1.5;
  return 1;
}

function levelDifficultyMultiplier(): number {
  const upgradeTotal = totalUpgradeTier();
  return 1.06 + Math.max(0, state.level - 1) * 0.07 + Math.max(0, upgradeTotal - 8) * 0.018;
}

function currentBrickDifficulty(): number {
  return levelDifficultyMultiplier() * ballPressureMultiplier() * state.hpPressure;
}

function currentPaceDifficulty(): number {
  return state.pacePressure;
}

function updateDifficultyDirector(dt: number): void {
  const start = Math.max(1, state.levelStartBricks);
  const clearRatio = 1 - bricks.length / start;
  const upgradeTotal = totalUpgradeTier();
  const timeLimit = state.objective?.deadline ?? 78;
  const expectedClear = clamp(state.levelAge / Math.max(54, timeLimit + 14), 0, 0.96);
  const paceDelta = clearRatio - expectedClear;
  const clearDelta = clearRatio - state.directorLastClearRatio;
  const ballDelta = balls.length - state.directorLastBallCount;
  const progressActive = clearDelta > 0.002 || state.combo > 5;
  const objectiveRisk = objectivePressure();
  const mountainRatio = brickMountainRatio();
  const ballSafety = balls.length <= 1 ? 1 : balls.length <= 2 ? 0.78 : balls.length <= 4 ? 0.42 : 0;
  const effectsActive = state.overcharge > 0 || state.redStorm > 0 || state.pierce > 0 || state.timeWarp > 0 || state.goldRush > 0;
  const hitAccuracy = state.paddleHits + state.paddleDrains > 0 ? state.paddleHits / (state.paddleHits + state.paddleDrains) : 0.5;

  state.directorClearRate += ((clearDelta / Math.max(dt, 0.001)) - state.directorClearRate) * Math.min(1, dt * 1.65);
  state.directorBallTrend += (ballDelta - state.directorBallTrend) * Math.min(1, dt * 2.2);
  state.directorNoProgressClock = progressActive ? Math.max(0, state.directorNoProgressClock - dt * 2.5) : state.directorNoProgressClock + dt;
  state.directorLastClearRatio = clearRatio;
  state.directorLastBallCount = balls.length;

  state.velocityClock += dt;
  if (state.velocityClock >= 2) {
    state.progressVelocity = state.velocityBrickKills / state.velocityClock;
    state.velocityBrickKills = 0;
    state.velocityClock = 0;
  }

  const rawPanic = clamp(
    ballSafety * 0.52 +
    objectiveRisk * 0.36 +
    mountainRatio * 0.34 +
    (state.directorNoProgressClock > 9 ? 0.22 : 0) +
    (state.lives <= 1 ? 0.16 : 0) +
    (state.directorBallTrend < -2 ? 0.12 : 0) +
    (hitAccuracy < 0.4 ? 0.14 : 0) +
    (state.consecutiveFails >= 3 ? 0.18 : state.consecutiveFails >= 2 ? 0.09 : 0) -
    clearRatio * 0.14,
    0,
    1
  );

  const panicSuppressedDominance = rawPanic > 0.5 ? 0 : 1;
  const rawDominance = clamp(
    ((balls.length >= 50 ? 0.36 : balls.length >= 34 ? 0.26 : balls.length >= 18 ? 0.14 : 0) +
    (state.combo >= 60 ? 0.28 : state.combo >= 36 ? 0.18 : state.combo >= 18 ? 0.08 : 0) +
    clamp(state.directorClearRate * 18, 0, 0.3) +
    (paceDelta > 0.28 ? 0.18 : paceDelta > 0.14 ? 0.09 : 0) +
    (effectsActive ? 0.08 : 0) +
    Math.max(0, upgradeTotal - 18) * 0.008) * panicSuppressedDominance,
    0,
    1
  );

  state.directorPanic += (rawPanic - state.directorPanic) * Math.min(1, dt * 1.15);
  state.directorDominance += (rawDominance - state.directorDominance) * Math.min(1, dt * 0.9);
  state.directorDropBias = clamp(state.directorPanic * 0.15 - state.directorDominance * 0.12 + objectiveRisk * 0.06, -0.2, 0.15);

  let hpTarget = 1;
  hpTarget += Math.max(0, upgradeTotal - 8) * 0.018;
  hpTarget += state.directorDominance * 0.38;
  hpTarget -= state.directorPanic * 0.2;
  hpTarget += clamp(paceDelta * 0.5, -0.1, 0.35);
  if (state.combo >= 18) hpTarget += 0.07;
  if (state.combo >= 36) hpTarget += 0.12;
  if (state.combo >= 60) hpTarget += 0.1;
  if (balls.length >= 18) hpTarget += 0.1;
  if (balls.length >= 36) hpTarget += 0.14;
  if (balls.length >= 56) hpTarget += 0.1;
  if (effectsActive) hpTarget += 0.08;
  if (state.objective?.complete) hpTarget += 0.04;
  if (clearRatio > 0.45 && state.levelAge < 35) hpTarget += 0.14;
  if (clearRatio > 0.75 && state.levelAge < 55) hpTarget += 0.12;
  if (balls.length <= 2) hpTarget -= 0.16;
  if (balls.length === 1) hpTarget -= 0.14;
  if (state.lives <= 1) hpTarget -= 0.1;
  if (state.objective && !state.objective.complete && state.levelAge > state.objective.deadline * 0.78) hpTarget -= 0.08;
  if (state.levelAge > 70 && clearRatio < 0.35) hpTarget -= 0.2;
  if (state.singleBallClock > 5) hpTarget -= 0.16;
  if (state.consecutiveFails >= 2) hpTarget -= 0.12;
  hpTarget = clamp(hpTarget, balls.length <= 2 ? 0.76 : 0.92, 2.18);

  let paceTarget = 1;
  paceTarget += state.directorDominance * 0.3;
  paceTarget -= state.directorPanic * 0.35;
  paceTarget -= (1 - hitAccuracy) * 0.15;
  if (state.consecutiveFails >= 2) paceTarget -= 0.18;
  if (state.consecutiveSuccesses >= 3) paceTarget += 0.12;
  if (state.progressVelocity < 0.5 && state.levelAge > 15) paceTarget -= 0.1;
  paceTarget = clamp(paceTarget, 0.7, 1.6);

  state.hpPressure += (hpTarget - state.hpPressure) * Math.min(1, dt * (state.directorPanic > 0.65 ? 0.82 : 0.45));
  state.pacePressure += (paceTarget - state.pacePressure) * Math.min(1, dt * 0.55);
  state.skillPressure = state.hpPressure;
  state.directorHpBias = state.hpPressure;
  maybeDirectorAssist(dt, clearRatio, objectiveRisk, mountainRatio);
}

function totalUpgradeTier(): number {
  return Object.values(state.runUpgrades).reduce((sum, tier) => sum + clampUpgradeTier(tier), 0);
}

function objectivePressure(): number {
  const objective = state.objective;
  if (!objective || objective.complete || objective.failed) return 0;
  const remaining = objectiveTimeRemaining();
  const progress = clamp(objective.progress / Math.max(1, objective.target), 0, 1);
  const timeUsed = clamp(state.levelAge / Math.max(1, objective.deadline), 0, 1);
  return clamp(timeUsed - progress * 0.82, 0, 1);
}

function brickMountainRatio(): number {
  if (bricks.length === 0) return 0;
  const hard = bricks.filter((brick) => brick.hp >= 5 || brick.type === "steel" || brick.role === "shell").length;
  return clamp(hard / bricks.length, 0, 1);
}

function getPreferredPowerupKind(): PowerKind | null {
  const entries = Object.entries(state.powerupPicks);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0] as PowerKind;
}

function chooseDirectorAssist(objectiveRisk: number, mountainRatio: number): PowerKind {
  const objective = state.objective;
  const preferred = getPreferredPowerupKind();
  if (balls.length <= 1) return preferred || (Math.random() < 0.62 ? "split" : "mirror");
  if (objectiveRisk > 0.55 && objective && !objective.complete && !objective.failed) {
    if (objective.id === "core") return mountainRatio > 0.45 ? "bazooka" : "cascade";
    if (objective.id === "combo") return balls.length < 8 ? "train" : "goldrush";
    return Math.random() < 0.5 ? "widen" : "slow";
  }
  if (mountainRatio > 0.45) return Math.random() < 0.18 ? "pierce" : "cascade";
  if (state.directorNoProgressClock > 12) return Math.random() < 0.5 ? "blackhole" : "timewarp";
  return balls.length <= 3 ? (preferred || "split") : "slow";
}

function maybeDirectorAssist(dt: number, clearRatio: number, objectiveRisk: number, mountainRatio: number): void {
  state.directorHelpClock = Math.max(0, state.directorHelpClock - dt);
  if (state.directorHelpClock > 0 || !state.launched || state.waitingChoice) return;

  const stuck = state.levelAge > 45 && clearRatio < 0.3 && state.directorNoProgressClock > 7;
  const lowBalls = balls.length <= 2 && bricks.length > 14;
  const mountain = balls.length <= 5 && mountainRatio > 0.34;
  const challengeTrouble = objectiveRisk > 0.62 && bricks.length > 10;
  const panicAssist = state.directorPanic > 0.74 && bricks.length > 8;
  if (!stuck && !lowBalls && !mountain && !challengeTrouble && !panicAssist) return;

  state.directorHelpClock = challengeTrouble ? 10 : stuck ? 12 : lowBalls ? 8 : 9;
  const forced = chooseDirectorAssist(objectiveRisk, mountainRatio);
  spawnPowerup(paddle.x + rand(-220, 220), paddle.y - 330, forced);
  popText(paddle.x, paddle.y - 96, challengeTrouble ? "CLUTCH DROP" : "MOMENTUM", 0x83f7ff);
}

function syncBrickHealth(brick: Brick): void {
  const maxHp = Math.max(1, Math.ceil(brick.baseHp * state.brickDifficulty));
  brick.maxHp = maxHp;
  brick.hp = Math.max(0, Math.ceil(maxHp - brick.damage));
}

function updateDynamicBrickDifficulty(force: boolean): void {
  const next = currentBrickDifficulty();
  if (!force && Math.abs(next - state.brickDifficulty) < 0.001) return;

  state.brickDifficulty = next;
  for (let i = bricks.length - 1; i >= 0; i -= 1) {
    const brick = bricks[i];
    syncBrickHealth(brick);
    if (brick.hp <= 0) {
      destroyBrick(brick, brick.x + brick.w / 2, brick.y + brick.h / 2, false);
    } else {
      drawBrick(brick);
    }
  }
}

function update(dt: number): void {
  if (!state.running || state.paused) return;

  const level = currentLevel();
  state.levelClock += dt;
  state.levelAge += dt;
  state.bestComboRun = Math.max(state.bestComboRun, state.combo);
  state.maxBallsRun = Math.max(state.maxBallsRun, balls.length);
  state.shake = Math.max(0, state.shake - 52 * dt);
  state.flash = Math.max(0, state.flash - dt);
  state.levelToast = Math.max(0, state.levelToast - dt);
  state.slowField = Math.max(0, state.slowField - dt);
  state.mercyDropClock = Math.max(0, state.mercyDropClock - dt);
  state.overcharge = Math.max(0, state.overcharge - dt);
  state.redStorm = Math.max(0, state.redStorm - dt);
  state.timeWarp = Math.max(0, state.timeWarp - dt);
  state.pierce = Math.max(0, state.pierce - dt);
  state.goldRush = Math.max(0, state.goldRush - dt);
  state.autoLaser = Math.max(0, state.autoLaser - dt);
  paddle.cooldown = Math.max(0, paddle.cooldown - dt);
  state.comboClock -= dt;
  if (state.comboClock <= 0 && state.combo > 1) {
    state.combo = Math.max(1, state.combo - Math.ceil(dt * 16));
  }

  movePaddle(dt);
  updateMachineGun(dt);
  updateTrainStream(dt);
  updateAutoLaser(dt);
  updateBricks(dt, level);

  if (!state.launched) {
    const ball = balls[0];
    if (ball) {
      ball.x = paddle.x;
      ball.y = paddle.y - 54;
      ball.vx = 0;
      ball.vy = 0;
    }
  }

  updateBallDrama(dt);
  updateClusterEvents(dt);
  updateBalls(dt, level);
  updatePowerups(dt);
  updateLasers(dt);
  updateChompers(dt);
  updateParticles(dt);
  updateJuice(dt);
  updateObjective();
  updateDifficultyDirector(dt);
  updateChomperWarning(dt);

  removeDeadObjects();
  updateDynamicBrickDifficulty(false);

  if (bricks.length === 0) {
    state.score += 3000 * state.level;
    offerEndLevelRewards();
    updateHud();
    return;
  }

  if (balls.length === 0) {
    handleBallDrain();
    if (!state.running) return;
  }

  updateHud();
}

function movePaddle(dt: number): void {
  if (state.keys.has("ArrowLeft") || state.keys.has("a")) paddle.speed -= 3900 * dt;
  if (state.keys.has("ArrowRight") || state.keys.has("d")) paddle.speed += 3900 * dt;

  paddle.x += (state.pointerX - paddle.x) * Math.min(1, dt * 13);
  paddle.x += paddle.speed * dt;
  paddle.speed *= Math.pow(0.025, dt);
  paddle.widen = Math.max(0, paddle.widen - dt);
  paddle.shrink = Math.max(0, paddle.shrink - dt);
  if (paddle.widen <= 0) paddle.widenStacks = 0;
  if (paddle.shrink <= 0) paddle.shrinkStacks = 0;
  const assistWidth = lowBallAssistActive() ? 1.03 : 1;
  const targetWidth = targetPaddleWidth() * assistWidth;
  paddle.w += (targetWidth - paddle.w) * Math.min(1, dt * 12);
  paddle.x = clamp(paddle.x, WALL + paddle.w / 2 + 12, WORLD_W - WALL - paddle.w / 2 - 12);
}

function lowBallAssistActive(): boolean {
  return state.launched && balls.length > 0 && balls.length <= 2 && bricks.length > 8;
}

function basePaddleWidth(): number {
  return 250 + paddleTierBonus[clampUpgradeTier(state.runUpgrades.paddle)];
}

function targetPaddleWidth(): number {
  const base = basePaddleWidth();
  const widenStacks = paddle.widen > 0 ? paddle.widenStacks : 0;
  const shrinkStacks = paddle.shrink > 0 ? paddle.shrinkStacks : 0;
  const minWidth = Math.max(126, base * 0.55);
  const maxWidth = Math.min(570, base + 138);
  return clamp(base + widenStacks * 46 - shrinkStacks * 42, minWidth, maxWidth);
}

function updateMachineGun(dt: number): void {
  if (state.machineGunShots <= 0) return;
  if (balls.length >= MAX_BALLS) {
    state.machineGunShots = 0;
    return;
  }
  state.machineGunClock -= dt;

  while (state.machineGunShots > 0 && state.machineGunClock <= 0 && balls.length < MAX_BALLS) {
    state.machineGunShots -= 1;
    state.machineGunClock += 0.065;

    const offset = rand(-paddle.w * 0.34, paddle.w * 0.34);
    const angle = -Math.PI / 2 + rand(-0.2, 0.2);
    const before = balls.length;
    makeBall(paddle.x + offset, paddle.y - 58, angle, launchSpeed() * rand(1.02, 1.14), 13, chooseBallKind());
    const ball = balls[balls.length - 1];
    if (balls.length > before && ball) {
      ball.hot = 0.36;
      ball.frenzy = Math.max(ball.frenzy, 0.28);
    }

    if (state.machineGunShots % 4 === 0) shockwave(paddle.x + offset, paddle.y - 62, 0xfff26b, 36);
    beep(740 + state.machineGunShots * 18, 0.018, "square", 0.018);
  }
}

function updateTrainStream(dt: number): void {
  if (state.trainShots <= 0) return;
  if (balls.length >= MAX_BALLS) {
    state.trainShots = 0;
    return;
  }

  state.trainClock -= dt;
  while (state.trainShots > 0 && state.trainClock <= 0 && balls.length < MAX_BALLS) {
    const shotIndex = state.trainShots;
    state.trainShots -= 1;
    state.trainClock += 0.048;

    const kind: BallKind = shotIndex % 6 === 0 ? "red" : shotIndex % 3 === 0 ? "yellow" : "green";
    const before = balls.length;
    makeBall(state.trainX, paddle.y - 58, state.trainAngle, launchSpeed() * 1.06, 13, kind);
    const ball = balls[balls.length - 1];
    if (balls.length > before && ball) {
      ball.hot = 0.44;
      ball.frenzy = Math.max(ball.frenzy, 0.36);
    }

    if (shotIndex % 4 === 0) shockwave(state.trainX, paddle.y - 62, powerupColor("train"), 42);
    beep(620 + (shotIndex % 8) * 26, 0.018, "triangle", 0.016);
  }
}

function updateAutoLaser(dt: number): void {
  if (state.autoLaser <= 0) return;
  state.autoLaserClock -= dt;

  while (state.autoLaser > 0 && state.autoLaserClock <= 0) {
    state.autoLaserClock += 0.12;
    state.autoLaserSide *= -1;
    const x = paddle.x + state.autoLaserSide * Math.min(82, paddle.w * 0.32);
    createLaser(x, "auto");
    beep(980 + state.autoLaserSide * 40, 0.018, "square", 0.012);
  }
}

function updateBricks(dt: number, level: LevelConfig): void {
  const layout = currentArcadeLayout();
  for (const brick of bricks) {
    const target = brickTarget(brick, layout, level.motion);
    const stiffness = layout.motion === "still" ? 44 : layout.motion === "storm" ? 30 : 24;
    brick.vx += (target.x - brick.x) * stiffness * dt;
    brick.vy += (target.y - brick.y) * stiffness * dt;
    const damping = Math.pow(0.002, dt);
    brick.vx *= damping;
    brick.vy *= damping;
    brick.x += brick.vx * dt;
    brick.y += brick.vy * dt;
    brick.flash = Math.max(0, brick.flash - dt * 3.5);
  }
}

function brickTarget(brick: Brick, layout: ArcadeLayout, motion: MotionStyle): { x: number; y: number } {
  const t = state.levelClock;
  let x = brick.baseX;
  let y = brick.baseY;

  if (motion === "current") {
    x += Math.sin(t * 0.7) * 18;
    y += Math.sin(t * 0.52) * 5;
  } else if (motion === "breath") {
    const mid = (layout.cols - 1) / 2;
    const wave = Math.sin(t * 0.72);
    x += Math.sign(brick.col - mid || 1) * wave * 10;
    y += Math.cos(t * 0.72) * 4;
  } else if (motion === "lanes") {
    const wave = Math.sin(t * 0.92);
    x += wave * (brick.row % 2 === 0 ? 18 : -18);
  } else if (motion === "orbit") {
    const waveX = Math.cos(t * 0.64);
    const waveY = Math.sin(t * 0.64);
    x += waveX * 14;
    y += waveY * 7;
  } else if (motion === "gates") {
    const mid = (layout.cols - 1) / 2;
    const side = brick.col < mid ? -1 : 1;
    x += side * (Math.sin(t * 0.78) + 1) * 10;
  } else if (motion === "storm") {
    const band = brick.row % 3;
    x += Math.sin(t * 1.06 + band * 0.55) * (band === 1 ? -16 : 16);
    y += Math.cos(t * 0.8) * 4;
  }

  return {
    x: clamp(x, WALL + 18, WORLD_W - WALL - 18 - brick.w),
    y
  };
}

function updateBalls(dt: number, level: LevelConfig): void {
  for (const ball of balls) {
    if (state.launched) {
      if (level.gravity) ball.vy += level.gravity * dt;
      ball.vy += ballProfiles[ball.kind].gravity * dt;
      if (level.wind) ball.vx += Math.sin(state.levelClock * 1.75 + ball.y * 0.01) * level.wind * dt;
      if (level.current) ball.vx += Math.sin(state.levelClock * 1.05 + ball.x * 0.008) * level.current * dt;
      steerKamikazeBall(ball, dt);
      const slowedNearPaddle = applySlowField(ball, dt);
      const timeWarped = applyTimeWarp(ball, dt);
      limitBall(ball, timeWarped ? 270 : slowedNearPaddle ? 420 : 500, ballMaxSpeed(ball));
    }
    ball.frenzy = Math.max(0, ball.frenzy - dt);
    ball.blastCooldown = Math.max(0, ball.blastCooldown - dt);
    ball.kamikaze = Math.max(0, ball.kamikaze - dt);

    const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(ball.vx * dt, ball.vy * dt) / 9)));
    const stepDt = dt / steps;

    for (let i = 0; i < steps; i += 1) {
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;
      if (i === 0 && state.launched) maybeBallTrail(ball);
      collideWalls(ball);
      collidePaddle(ball);
      collideBricks(ball);
    }

    ball.hot = Math.max(0, ball.hot - dt);
  }
}

function steerKamikazeBall(ball: Ball, dt: number): void {
  if (ball.kamikaze <= 0 || ball.kind !== "red") return;
  if (!ball.kamikazeTarget || !bricks.includes(ball.kamikazeTarget)) {
    ball.kamikazeTarget = chooseKamikazeTarget(ball);
  }
  const target = ball.kamikazeTarget;
  if (!target) return;

  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  const dx = tx - ball.x;
  const dy = ty - ball.y;
  const d = Math.hypot(dx, dy) || 1;
  const rage = 1 + (8.5 - ball.kamikaze) * 0.08;
  ball.vx += dx / d * 820 * rage * dt;
  ball.vy += dy / d * 820 * rage * dt;
  ball.hot = Math.max(ball.hot, 0.8);
  ball.frenzy = Math.max(ball.frenzy, 0.65);
}

function applySlowField(ball: Ball, dt: number): boolean {
  const assist = lowBallAssistActive() && ball.y >= paddle.y - 250;
  if ((state.slowField <= 0 && !assist) || ball.y < paddle.y - 270) return false;

  const speed = Math.hypot(ball.vx, ball.vy) || 1;
  const target = assist && state.slowField <= 0 ? Math.max(390, launchSpeed() * 0.9) : Math.max(420, launchSpeed() * 0.75);
  if (speed > target) {
    const eased = Math.max(target, speed * Math.pow(assist && state.slowField <= 0 ? 0.42 : 0.18, dt));
    ball.vx = ball.vx / speed * eased;
    ball.vy = ball.vy / speed * eased;
  }

  return true;
}

function applyTimeWarp(ball: Ball, dt: number): boolean {
  if (state.timeWarp <= 0) return false;

  const speed = Math.hypot(ball.vx, ball.vy) || 1;
  const target = Math.max(270, launchSpeed() * 0.3);
  if (speed > target) {
    const eased = Math.max(target, speed * Math.pow(0.035, dt));
    ball.vx = ball.vx / speed * eased;
    ball.vy = ball.vy / speed * eased;
  }

  return true;
}

function updateBallDrama(dt: number): void {
  const loneHero = state.launched && balls.length === 1 && bricks.length > 0;
  for (const ball of balls) {
    ball.hero = loneHero;
  }

  if (!loneHero) {
    state.singleBallClock = 0;
    state.stallBreachClock = 0;
    return;
  }

  state.singleBallClock += dt;
  state.stallBreachClock += dt;
  const hero = balls[0];
  const mercyTier = clampUpgradeTier(state.runUpgrades.mercy);
  if (state.singleBallClock > Math.max(3.8, 7 - mercyTier * 0.7) && bricks.length > 10 && state.mercyBudget < state.maxMercyPerLife) {
    state.singleBallClock = 0;
    state.mercyBudget += 1;
    splitSpecificBalls(hero.x, hero.y, 2 + Math.floor(mercyTier / 2), 0.72, "green");
    const newBalls = balls.slice(-2 - Math.floor(mercyTier / 2));
    for (const nb of newBalls) {
      nb.frenzy = 0;
      nb.hot = 0.1;
    }
    popText(hero.x, hero.y - 28, `COMEBACK ${state.mercyBudget}/${state.maxMercyPerLife}`, 0xffffff);
    state.flash = Math.max(state.flash, 0.08);
  }

  if (state.stallBreachClock > Math.max(6.4, 12 - mercyTier * 1.25) && bricks.length > 8) {
    state.stallBreachClock = 0;
    breachStall(hero);
  }

  const mercyDropInterval = Math.max(6, 14 - state.consecutiveFails * 2);
  state.mercyDropClock += dt;
  if (state.mercyDropClock > mercyDropInterval && bricks.length > 14 && powerups.length < 2) {
    state.mercyDropClock = 0;
    spawnPowerup(paddle.x + rand(-180, 180), paddle.y - 320, balls.length === 1 ? "split" : "slow");
    popText(paddle.x, paddle.y - 96, "HELP", 0x7cff26);
  }
}

function breachStall(hero: Ball): void {
  const candidates = bricks
    .filter((brick) => brick.role === "shell" || brick.type === "steel")
    .map((brick) => ({
      brick,
      d: Math.hypot(hero.x - (brick.x + brick.w / 2), hero.y - (brick.y + brick.h / 2))
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);

  if (candidates.length === 0) {
    splitBalls(hero.x, hero.y, 2, 0.94);
    return;
  }

  for (const { brick } of candidates) {
    if (!bricks.includes(brick)) continue;
    const x = brick.x + brick.w / 2;
    const y = brick.y + brick.h / 2;
    damageBrick(brick, x, y, Math.max(2, brick.maxHp * 0.55), hero);
  }

  hero.frenzy = Math.max(hero.frenzy, 1.2);
  hero.hot = Math.max(hero.hot, 0.45);
  spawnPowerup(clamp(hero.x, WALL + 120, WORLD_W - WALL - 120), paddle.y - 330, "widen");
  popText(hero.x, hero.y - 36, "BREACH", 0x13dbff);
  shockwave(hero.x, hero.y, 0x13dbff, 78);
}

function collideWalls(ball: Ball): void {
  if (ball.x < WALL + ball.r) {
    ball.x = WALL + ball.r;
    ball.vx = Math.abs(ball.vx);
    beep(340, 0.018, "sine", 0.018);
  }
  if (ball.x > WORLD_W - WALL - ball.r) {
    ball.x = WORLD_W - WALL - ball.r;
    ball.vx = -Math.abs(ball.vx);
    beep(340, 0.018, "sine", 0.018);
  }
  if (ball.y < WALL + ball.r) {
    ball.y = WALL + ball.r;
    ball.vy = Math.abs(ball.vy);
    beep(390, 0.018, "sine", 0.018);
  }
}

function collidePaddle(ball: Ball): void {
  if (ball.vy <= 0) return;

  const rect = {
    x: paddle.x - paddle.w / 2,
    y: paddle.y - paddle.h / 2,
    w: paddle.w,
    h: paddle.h
  };

  const hit = circleRectCollision(ball, rect);
  if (!hit) return;

  ball.x += hit.nx * hit.depth;
  ball.y = rect.y - ball.r - 0.5;
  const rel = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
  const profile = ballProfiles[ball.kind];
  const heavyKick = ball.kind === "red" ? 95 : ball.kind === "yellow" ? 42 : 0;
  const perfect = Math.abs(rel) < 0.13;
  const perfectKick = perfect ? 120 + state.runUpgrades.perfect * 42 : 0;
  const maxSpeed = profile.maxSpeed + (state.overcharge > 0 ? 190 : 0) + (ball.kind === "red" ? state.runUpgrades.red * 24 : 0) + perfectKick;
  const speed = Math.min(maxSpeed, Math.max(620, Math.hypot(ball.vx, ball.vy) + 26 + profile.gravity * 0.03 + heavyKick + perfectKick));
  const angle = -Math.PI / 2 + rel * profile.aimArc;
  ball.vx = Math.cos(angle) * speed + paddle.speed * 0.055;
  ball.vy = Math.sin(angle) * speed * profile.bounce;
  ball.hot = perfect ? 0.55 : 0.18;
  if (perfect) registerPerfectHit(ball);
  state.paddleHits += 1;
  addShake(2);
  if (ball.kind === "red") addShake(4.5);
  beep(ball.kind === "red" ? 360 : 520, 0.03, "triangle", ball.kind === "red" ? 0.04 : 0.03);
}

function registerPerfectHit(ball: Ball): void {
  state.perfectHits += 1;
  const objective = state.objective;
  if (objective?.id === "perfect" && !objective.complete) {
    objective.progress = Math.min(objective.target, objective.progress + 1);
  }
  ball.frenzy = Math.max(ball.frenzy, 0.42 + state.runUpgrades.perfect * 0.12);
  state.combo = Math.min(99, state.combo + 2);
  state.comboClock = Math.max(state.comboClock, 1.5);
  state.score += 320 * state.combo * (1 + state.runUpgrades.perfect * 0.2);
  const perfectTier = clampUpgradeTier(state.runUpgrades.perfect);
  if (clampUpgradeTier(state.runUpgrades.machine) > 0 && perfectTier > 0 && Math.random() < 0.11 + perfectTier * 0.015) {
    state.pierce = Math.max(state.pierce, 0.55 + perfectTier * 0.1);
    if (Math.random() < 0.22) popText(ball.x, paddle.y - 72, "SYNC", 0xb891ff);
  }
  shockwave(ball.x, paddle.y, 0xffffff, 54);
  popText(ball.x, paddle.y - 46, "PERFECT", 0xffffff);
}

function collideBricks(ball: Ball): void {
  for (const brick of bricks) {
    const hit = circleRectCollision(ball, brick);
    if (!hit) continue;

    if (ball.kamikaze > 0 && ball.kind === "red") {
      kamikazeImpact(ball, brick);
      return;
    }

    if (ball.kind === "bomb" && ball.blastCooldown <= 0) {
      ball.blastCooldown = 0.72;
      bombBallImpact(ball, brick, ball.x, ball.y);
      reflectBall(ball, hit.nx, hit.ny);
      limitBall(ball, 500, ballMaxSpeed(ball));
      return;
    }

    if (ball.frenzy > 0 || state.pierce > 0) {
      const passDamage = state.pierce > 0 ? 0.98 : 0.78;
      damageBrick(brick, ball.x, ball.y, ballDamage(ball) * passDamage, ball);
      rotateVelocity(ball, rand(-0.24, 0.24));
      ball.x += ball.vx * 0.012;
      ball.y += ball.vy * 0.012;
      limitBall(ball, 620, ballMaxSpeed(ball));
      return;
    }

    ball.x += hit.nx * (hit.depth + 0.35);
    ball.y += hit.ny * (hit.depth + 0.35);
    reflectBall(ball, hit.nx, hit.ny);
    limitBall(ball, 560, ballMaxSpeed(ball));
    damageBrick(brick, ball.x, ball.y, ballDamage(ball), ball);
    return;
  }
}

function kamikazeImpact(ball: Ball, brick: Brick): void {
  const x = ball.x;
  const y = ball.y;
  const radius = 170 + clampUpgradeTier(state.runUpgrades.bombs) * 12;
  ball.kamikaze = 0;
  ball.kamikazeTarget = null;
  ball.blastCooldown = 0.9;
  state.flash = Math.max(state.flash, 0.2);
  addShake(9);
  burst(x, y, powerupColor("kamikaze"), 48, 1.15);
  shockwave(x, y, powerupColor("kamikaze"), 124);
  damageBrick(brick, x, y, ballDamage(ball) * 1.65, ball);

  const hits = bricks
    .filter((candidate) => candidate !== brick)
    .map((candidate) => {
      const cx = candidate.x + candidate.w / 2;
      const cy = candidate.y + candidate.h / 2;
      return { brick: candidate, cx, cy, d: Math.hypot(cx - x, cy - y) };
    })
    .filter(({ d }) => d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, 7 + clampUpgradeTier(state.runUpgrades.bombs));

  for (const hit of hits) {
    if (!bricks.includes(hit.brick)) continue;
    damageBrick(hit.brick, hit.cx, hit.cy, 1.35 + (1 - hit.d / radius) * 1.8, ball);
  }

  if (balls.includes(ball)) {
    reflectBall(ball, rand(-1, 1), -1);
    const angle = -Math.PI / 2 + rand(-0.8, 0.8);
    const speed = launchSpeed() * rand(0.82, 1.02);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
  }
  popText(x, y - 38, "KAMIKAZE", powerupColor("kamikaze"));
  beep(86, 0.12, "sawtooth", 0.05);
}

function circleRectCollision(
  ball: { x: number; y: number; r: number },
  rect: { x: number; y: number; w: number; h: number }
): { nx: number; ny: number; depth: number } | null {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
  let dx = ball.x - closestX;
  let dy = ball.y - closestY;
  let distSq = dx * dx + dy * dy;

  if (distSq > ball.r * ball.r) return null;

  if (distSq === 0) {
    const left = Math.abs(ball.x - rect.x);
    const right = Math.abs(rect.x + rect.w - ball.x);
    const top = Math.abs(ball.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - ball.y);
    const min = Math.min(left, right, top, bottom);

    if (min === left) return { nx: -1, ny: 0, depth: ball.r + left };
    if (min === right) return { nx: 1, ny: 0, depth: ball.r + right };
    if (min === top) return { nx: 0, ny: -1, depth: ball.r + top };
    return { nx: 0, ny: 1, depth: ball.r + bottom };
  }

  const dist = Math.sqrt(distSq);
  dx /= dist;
  dy /= dist;
  return { nx: dx, ny: dy, depth: ball.r - dist };
}

function reflectBall(ball: Ball, nx: number, ny: number): void {
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot >= 0) return;
  ball.vx -= 2 * dot * nx;
  ball.vy -= 2 * dot * ny;
}

function rotateVelocity(ball: Ball, radians: number): void {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const vx = ball.vx * cos - ball.vy * sin;
  ball.vy = ball.vx * sin + ball.vy * cos;
  ball.vx = vx;
}

function ballDamage(ball: Ball): number {
  const pressureBoost = balls.length <= 1 ? 2.15 : balls.length <= 3 ? 1.35 : 1;
  const heatBoost = ball.hot > 0 ? 1.25 : 1;
  const frenzyBoost = ball.frenzy > 0 ? 1.15 : 1;
  const overchargeBoost = state.overcharge > 0 ? 1.75 : 1;
  const redUpgradeBoost = ball.kind === "red" ? 1 + clampUpgradeTier(state.runUpgrades.red) * 0.18 : 1;
  return ballProfiles[ball.kind].damage * pressureBoost * heatBoost * frenzyBoost * overchargeBoost * redUpgradeBoost;
}

function ballMaxSpeed(ball: Ball): number {
  return ballProfiles[ball.kind].maxSpeed +
    (ball.hot > 0 ? 100 : 0) +
    (ball.frenzy > 0 ? 120 : 0) +
    (ball.kamikaze > 0 ? 420 : 0) +
    (state.overcharge > 0 ? 190 : 0) +
    (ball.kind === "red" ? clampUpgradeTier(state.runUpgrades.red) * 34 : 0);
}

function damageBrick(brick: Brick, x: number, y: number, damage: number, sourceBall?: Ball): void {
  if (!bricks.includes(brick)) return;
  const hpBefore = brick.hp;
  syncBrickHealth(brick);
  brick.damage += damage;
  syncBrickHealth(brick);
  brick.flash = 1;
  state.comboClock = 1.85;
  state.combo = Math.min(99, state.combo + 1);
  const scoreBoost = state.goldRush > 0 ? 2.2 : 1;
  const scoreGain = Math.floor(32 * state.combo * (brick.type === "steel" ? 2 : 1) * scoreBoost);
  state.score += scoreGain;
  addShake(brick.type === "bomb" ? 8 : state.combo >= 25 ? 3.4 : state.combo >= 10 ? 2.7 : 2.1);
  const burstCount = brick.type === "bomb" ? (particles.length > 140 ? 10 : 20) : (particles.length > 140 ? 3 : 7);
  burst(x, y, brickColor(brick.type), burstCount, brick.type === "bomb" ? 1.1 : 0.55);
  if (brick.type === "bomb" || state.combo >= 10) shockwave(x, y, brickColor(brick.type), brick.type === "bomb" ? 54 : 28);
  if (hpBefore > 0 && (damage >= 1.5 || state.combo >= 10 || state.combo % 7 === 0 || brick.hp <= 0)) {
    popText(x, y - 14, brick.hp <= 0 ? `+${scoreGain}` : damageLabel(damage), brickColor(brick.type));
  }
  if (state.combo >= 18) state.feverPulse = Math.min(1, state.feverPulse + 0.08);
  playHitSound(sourceBall, brick);
  checkComboMilestone(x, y);
  if (sourceBall) maybeApplyHiddenSynergy(sourceBall, x, y);

  if (state.combo >= state.lastComboBonus + 12 && balls.length < MAX_BALLS) {
    state.lastComboBonus = state.combo;
    splitBalls(x, y, 2, 0.8);
  }
  if (sourceBall) maybeStartFrenzy(sourceBall, x, y);

  if (brick.hp > 0) {
    drawBrick(brick);
    return;
  }

  destroyBrick(brick, x, y, true);
}

function playHitSound(sourceBall: Ball | undefined, brick: Brick): void {
  const count = balls.length;
  const chance = count > 50 ? 0.035 : count > 35 ? 0.07 : count > 22 ? 0.14 : count > 10 ? 0.28 : 0.75;
  const importantHit = brick.hp <= 0 || brick.type === "bomb" || brick.type === "steel" || brick.role === "shell";
  if (!importantHit && Math.random() > chance) return;
  if (importantHit && count > 22 && Math.random() > Math.max(chance * 1.6, 0.18)) return;

  const strength = brick.maxHp >= 8 || brick.type === "steel" ? 2 : brick.maxHp >= 4 ? 1 : 0;
  const chip = brick.hp <= 0 ? 1.22 : brick.hp <= Math.ceil(brick.maxHp * 0.35) ? 1.08 : 0.94;
  const crowdGain = count > 50 ? 0.24 : count > 35 ? 0.34 : count > 22 ? 0.5 : count > 10 ? 0.72 : 0.9;

  if (sourceBall?.kind === "bomb" || brick.type === "bomb") {
    beep((88 + strength * 24 + Math.min(90, state.combo * 2)) * chip, 0.045, "sawtooth", 0.034 * crowdGain);
  } else if (sourceBall?.kind === "red") {
    beep((138 + strength * 42 + Math.min(160, state.combo * 3)) * chip, 0.03, strength > 0 ? "sawtooth" : "triangle", 0.028 * crowdGain);
  } else if (sourceBall?.kind === "yellow") {
    beep((285 + strength * 80 + Math.min(520, state.combo * 12)) * chip, 0.02, "square", 0.019 * crowdGain);
  } else {
    beep((430 + strength * 120 + Math.min(980, state.combo * 15)) * chip, 0.018, strength > 1 ? "triangle" : "square", 0.014 * crowdGain);
  }
}

function checkComboMilestone(x: number, y: number): void {
  const milestone = state.combo >= 50 ? 50 : state.combo >= 25 ? 25 : state.combo >= 10 ? 10 : 0;
  if (milestone === 0 || state.lastComboSting >= milestone) return;

  state.lastComboSting = milestone;
  const color = milestone >= 50 ? 0xff4f38 : milestone >= 25 ? 0xfff26b : 0x13dbff;
  popText(x, y - 42, `x${milestone} CHAIN`, color);
  shockwave(x, y, color, 80 + milestone);
  addShake(milestone >= 50 ? 8 : milestone >= 25 ? 5 : 3);
  beep(milestone >= 50 ? 880 : milestone >= 25 ? 720 : 560, 0.08, "triangle", 0.045);
  beep(milestone >= 50 ? 1320 : milestone >= 25 ? 940 : 760, 0.065, "square", 0.026);
}

function maybeApplyHiddenSynergy(ball: Ball, x: number, y: number): void {
  const redTier = clampUpgradeTier(state.runUpgrades.red);
  const bombTier = clampUpgradeTier(state.runUpgrades.bombs);
  if (ball.kind === "red" && redTier > 0 && bombTier > 0 && Math.random() < 0.035 + (redTier + bombTier) * 0.012) {
    miniExplosion(x, y, 72 + bombTier * 12, 0.72 + redTier * 0.16);
    popText(x, y - 34, "FUSION", ballProfiles.red.color);
  }
}

function miniExplosion(x: number, y: number, radius: number, damage: number): void {
  burst(x, y, 0xff8f2b, 20, 0.75);
  shockwave(x, y, 0xff8f2b, radius * 0.7);
  addShake(3.5);

  const hits = bricks
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - x, cy - y) };
    })
    .filter(({ d }) => d < radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);

  for (const hit of hits) {
    if (!bricks.includes(hit.brick)) continue;
    damageBrick(hit.brick, hit.cx, hit.cy, damage * (1 - hit.d / radius * 0.45));
  }
}

function bombBallImpact(ball: Ball, primary: Brick, x: number, y: number): void {
  state.flash = Math.max(state.flash, 0.12);
  addShake(6);
  beep(122, 0.055, "sawtooth", 0.035);
  burst(x, y, ballProfiles.bomb.color, 26, 0.9);
  shockwave(x, y, ballProfiles.bomb.color, 70);
  damageBrick(primary, x, y, ballDamage(ball) * 1.05, ball);

  const radius = 126 + Math.min(42, state.runUpgrades.bombs * 10);
  const splash = bricks
    .filter((brick) => brick !== primary)
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - x, cy - y) };
    })
    .filter(({ d }) => d < radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4 + state.runUpgrades.bombs);

  for (const hit of splash) {
    if (!bricks.includes(hit.brick)) continue;
    const falloff = 1 - hit.d / radius;
    damageBrick(hit.brick, hit.cx, hit.cy, 0.85 + falloff * 1.2, ball);
  }
}

function maybeStartFrenzy(ball: Ball, x: number, y: number): void {
  if (ball.frenzy > 0.2 || balls.length > 58) return;

  const comboGate = state.combo >= 8 && state.combo % 13 === 0;
  const redGate = ball.kind === "red" && Math.random() < 0.12;
  const heroGate = ball.hero && Math.random() < 0.34;
  if (!comboGate && !redGate && !heroGate) return;

  ball.frenzy = ball.hero ? 1.65 : 1.15;
  ball.hot = Math.max(ball.hot, 0.35);
  rotateVelocity(ball, rand(-0.52, 0.52));
  state.feverPulse = Math.min(1, state.feverPulse + 0.22);
  shockwave(x, y, ballProfiles[ball.kind].color, 72);
  popText(x, y - 28, "PINBALL", ballProfiles[ball.kind].color);
}

function damageLabel(damage: number): string {
  if (damage >= 5) return "HERO";
  if (damage >= 2.3) return "x2";
  if (damage >= 1.45) return "x1.5";
  return `x${state.combo}`;
}

function destroyBrick(brick: Brick, x: number, y: number, triggerEffects: boolean, chainDepth = 0): void {
  const index = bricks.indexOf(brick);
  if (index < 0) return;
  bricks.splice(index, 1);
  state.velocityBrickKills += 1;
  brick.body.destroy({ children: true });
  state.score += 105 * state.combo * (state.goldRush > 0 ? 2.2 : 1);

  const cx = brick.x + brick.w / 2;
  const cy = brick.y + brick.h / 2;
  if (!triggerEffects) {
    burst(x, y, brickColor(brick.type), particles.length > 100 ? 4 : 10, 0.7);
    return;
  }
  if (brick.role === "widen") spawnPowerup(cx, cy, "widen");
  else if (brick.role === "shrink") spawnPowerup(cx, cy, "shrink");
  else if (brick.type === "bomb") explode(cx, cy, chainDepth);
  else if (brick.type === "green") spawnPowerup(cx, cy, "split");
  else if (brick.type === "steel") spawnPowerup(cx, cy, Math.random() < 0.48 ? "laser" : Math.random() < 0.78 ? "autolaser" : "bazooka");
  else if (brick.type === "amber" && Math.random() < 0.18) spawnPowerup(cx, cy, "train");
  else if (brick.type === "amber" && Math.random() < 0.22) spawnPowerup(cx, cy, "machine");
  else spawnPowerup(cx, cy);
}

function explode(x: number, y: number, chainDepth = 0): void {
  state.flash = Math.max(state.flash, chainDepth > 0 ? 0.16 : 0.22);
  addShake(chainDepth > 0 ? 6 : 10);
  beep(86, 0.13, "sawtooth", 0.048);
  const radius = 176 + state.runUpgrades.bombs * 22;
  const innerRadius = 90 + state.runUpgrades.bombs * 9;

  const affected = bricks
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - x, cy - y) };
    })
    .filter(({ d }) => d <= radius)
    .sort((a, b) => b.d - a.d);

  for (const hit of affected) {
    const brick = hit.brick;
    if (!bricks.includes(brick)) continue;
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const d = hit.d;

    brick.damage += d < innerRadius ? 4 + state.runUpgrades.bombs : 2 + state.runUpgrades.bombs * 0.5;
    syncBrickHealth(brick);
    brick.flash = 1;
    burst(cx, cy, brickColor(brick.type), 10, 0.9);
    state.score += 46 * state.combo * (state.goldRush > 0 ? 2.2 : 1);

    if (brick.hp <= 0) {
      const canChain = brick.type === "bomb" && chainDepth < 1 && d > 34;
      destroyBrick(brick, cx, cy, canChain, chainDepth + 1);
    } else {
      drawBrick(brick);
    }
  }

  splitBalls(x, y, 3, 1);
}

function weightedPowerChoice(entries: Array<[PowerKind, number]>): PowerKind {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return entries[entries.length - 1][0];
}

function spawnPowerup(x: number, y: number, forced?: PowerKind): void {
  const level = currentLevel();
  const mercyChance = balls.length <= 2 ? 0.075 : 0;
  const pressurePenalty = state.skillPressure > 1.18 ? 0.08 : 0;
  const dominancePenalty = state.directorDominance * 0.1;
  const pityBonus = Math.min(0.16, state.powerDropPity * 0.008);
  const dropChance = clamp(level.powerChance * 0.62 * currentPaceDifficulty() + state.directorDropBias + mercyChance + pityBonus - pressurePenalty - dominancePenalty, 0.06, 0.46);
  if (!forced && Math.random() > dropChance) {
    state.powerDropPity += 1;
    state.goldenDropPity += 1;
    return;
  }

  let kind = forced;
  if (!kind) {
    const splitWeight = (level.splitWeight ?? 0.45) * 0.72;
    const laserWeight = (level.laserWeight ?? 0.24) * 0.74;
    const roll = Math.random();
    if (state.directorDominance > 0.58 && Math.random() < 0.16) kind = "shrink";
    else if (balls.length <= 2 && roll < 0.32) kind = "split";
    else if (roll < splitWeight) kind = "split";
    else if (roll < splitWeight + laserWeight) {
      const weaponRoll = Math.random();
      kind = weaponRoll < 0.46 ? "laser" : weaponRoll < 0.78 ? "autolaser" : "bazooka";
    }
    else {
      kind = weightedPowerChoice([
        ["widen", 0.04],
        ["shrink", 0.034],
        ["slow", 0.058],
        ["timewarp", 0.052],
        ["cluster", 0.064],
        ["bombcluster", 0.058],
        ["pierce", 0.018],
        ["train", 0.058],
        ["machine", 0.052],
        ["overcharge", 0.056],
        ["redstorm", 0.046],
        ["bombbait", 0.046],
        ["goldrush", 0.04],
        ["blackhole", 0.04],
        ["mirror", balls.length <= 4 ? 0.062 : 0.036],
        ["cascade", 0.042],
        ["orbitals", 0.034],
        ["kamikaze", 0.006],
        ["nova", 0.005],
        ["choice", 0.026],
        ["burst", 0.026],
        ["jackpot", 0.01]
      ]);
    }
  }

  const golden = !forced && (Math.random() < 0.025 + Math.min(0.055, state.goldenDropPity * 0.0015));
  state.powerDropPity = 0;
  if (golden) state.goldenDropPity = 0;

  const sprite = createPowerupToken(kind, golden);
  powerLayer.addChild(sprite);
  powerups.push({ x, y, vy: golden ? 150 + state.level * 3 : 185 + state.level * 4, kind, golden, sprite, dead: false });
}

function createPowerupToken(kind: PowerKind, golden = false): Graphics {
  const color = powerupColor(kind);
  const token = new Graphics()
    .circle(0, 0, golden ? 32 : 28)
    .fill({ color: golden ? 0xfff26b : color, alpha: 0.92 })
    .circle(0, 0, golden ? 26 : 22)
    .stroke({ width: golden ? 5 : 3, color: 0xffffff, alpha: golden ? 0.75 : 0.45 });

  if (kind === "laser") {
    token
      .poly([-4, -15, 8, -15, 2, -2, 12, -2, -6, 15, -1, 3, -12, 3])
      .fill({ color: 0x171000, alpha: 0.82 })
      .poly([-6, -17, 6, -17, 0, -4, 10, -4, -8, 13, -3, 1, -14, 1])
      .fill({ color: 0xffffff, alpha: 0.92 });
  } else if (kind === "autolaser") {
    token
      .roundRect(-16, 8, 32, 8, 4)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(-13, -12)
      .lineTo(-13, 3)
      .moveTo(0, -17)
      .lineTo(0, 3)
      .moveTo(13, -12)
      .lineTo(13, 3)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.86 });
  } else if (kind === "bazooka") {
    token
      .roundRect(-18, -6, 30, 12, 6)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .poly([10, -12, 22, 0, 10, 12])
      .fill({ color: 0x160005, alpha: 0.68 })
      .circle(-13, 0, 5)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.82 });
  } else if (kind === "split") {
    token
      .circle(-10, 3, 6)
      .circle(0, -9, 6)
      .circle(10, 3, 6)
      .fill({ color: 0xffffff, alpha: 0.88 });
  } else if (kind === "cluster" || kind === "bombcluster") {
    token
      .circle(-10, 4, 6)
      .circle(0, -8, 7)
      .circle(11, 5, 6)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .circle(0, 6, kind === "bombcluster" ? 9 : 5)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.8 });
  } else if (kind === "widen") {
    token
      .roundRect(-16, -5, 32, 10, 5)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(-20, 0)
      .lineTo(-12, -8)
      .moveTo(-20, 0)
      .lineTo(-12, 8)
      .moveTo(20, 0)
      .lineTo(12, -8)
      .moveTo(20, 0)
      .lineTo(12, 8)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.85 });
  } else if (kind === "shrink") {
    token
      .roundRect(-13, -5, 26, 10, 5)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(-21, 0)
      .lineTo(-12, 0)
      .lineTo(-17, -6)
      .moveTo(-12, 0)
      .lineTo(-17, 6)
      .moveTo(21, 0)
      .lineTo(12, 0)
      .lineTo(17, -6)
      .moveTo(12, 0)
      .lineTo(17, 6)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.85 });
  } else if (kind === "slow") {
    token
      .circle(0, 0, 13)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 })
      .moveTo(0, -13)
      .lineTo(0, 0)
      .lineTo(9, 6)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 })
      .moveTo(-17, 15)
      .lineTo(17, 15)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.74 });
  } else if (kind === "timewarp") {
    token
      .circle(0, 0, 14)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.92 })
      .moveTo(0, -14)
      .lineTo(0, 1)
      .lineTo(-8, 7)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 })
      .moveTo(-17, -17)
      .bezierCurveTo(-25, -5, -18, 13, -2, 19)
      .moveTo(17, 17)
      .bezierCurveTo(25, 5, 18, -13, 2, -19)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.75 });
  } else if (kind === "pierce") {
    token
      .poly([-4, -18, 12, 0, 2, 0, 2, 18, -7, 18, -7, 0, -17, 0])
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(12, -12)
      .lineTo(20, -4)
      .lineTo(12, 4)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.82 });
  } else if (kind === "train") {
    token
      .circle(-13, 4, 5)
      .circle(0, 0, 5)
      .circle(13, -4, 5)
      .fill({ color: 0xffffff, alpha: 0.92 })
      .moveTo(-16, 14)
      .lineTo(16, 4)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.75 });
  } else if (kind === "goldrush") {
    token
      .poly([0, -18, 5, -6, 18, -5, 8, 3, 12, 17, 0, 9, -12, 17, -8, 3, -18, -5, -5, -6])
      .fill({ color: 0xffffff, alpha: 0.92 })
      .circle(0, 0, 5)
      .fill({ color: 0x231400, alpha: 0.62 });
  } else if (kind === "machine") {
    token
      .roundRect(-17, 4, 34, 8, 4)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .circle(-12, -8, 4)
      .circle(0, -12, 4)
      .circle(12, -8, 4)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(-16, -1)
      .lineTo(-5, -1)
      .moveTo(-2, -4)
      .lineTo(9, -4)
      .moveTo(12, -1)
      .lineTo(22, -1)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.72 });
  } else if (kind === "overcharge") {
    token
      .poly([-13, -15, 5, -15, -2, -2, 13, -2, -8, 18, -2, 4, -16, 4])
      .fill({ color: 0xffffff, alpha: 0.9 })
      .circle(9, 11, 5)
      .fill({ color: 0x12040b, alpha: 0.72 });
  } else if (kind === "bombbait") {
    token
      .circle(0, 2, 12)
      .fill({ color: 0x160005, alpha: 0.7 })
      .moveTo(5, -12)
      .lineTo(12, -18)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.85 })
      .circle(0, 2, 5)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
  } else if (kind === "redstorm") {
    token
      .circle(-7, -3, 7)
      .circle(8, 2, 8)
      .circle(0, 11, 5)
      .fill({ color: 0xffffff, alpha: 0.86 });
  } else if (kind === "kamikaze") {
    token
      .circle(0, 0, 12)
      .fill({ color: 0x180005, alpha: 0.7 })
      .poly([0, -20, 7, -3, 20, 0, 7, 3, 0, 20, -7, 3, -20, 0, -7, -3])
      .fill({ color: 0xffffff, alpha: 0.9 })
      .circle(0, 0, 5)
      .fill({ color: 0xff3838, alpha: 0.85 });
  } else if (kind === "blackhole") {
    token
      .circle(0, 0, 11)
      .fill({ color: 0x02030a, alpha: 0.88 })
      .circle(0, 0, 18)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.86 })
      .moveTo(-20, -4)
      .lineTo(-9, -10)
      .moveTo(20, 4)
      .lineTo(9, 10)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.72 });
  } else if (kind === "mirror") {
    token
      .poly([-17, -12, -3, 0, -17, 12])
      .poly([17, -12, 3, 0, 17, 12])
      .fill({ color: 0xffffff, alpha: 0.88 })
      .moveTo(0, -16)
      .lineTo(0, 16)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
  } else if (kind === "cascade") {
    token
      .circle(-12, -9, 5)
      .circle(-3, -1, 5)
      .circle(7, 7, 5)
      .circle(16, 14, 4)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .moveTo(-17, -14)
      .lineTo(20, 18)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.72 });
  } else if (kind === "orbitals") {
    token
      .circle(0, 0, 5)
      .fill({ color: 0xffffff, alpha: 0.95 })
      .ellipse(0, 0, 19, 10)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.82 })
      .circle(-15, 0, 4)
      .circle(15, 0, 4)
      .fill({ color: 0xffffff, alpha: 0.88 });
  } else if (kind === "jackpot") {
    token
      .poly([0, -19, 17, -5, 10, 17, -10, 17, -17, -5])
      .fill({ color: 0xffffff, alpha: 0.92 })
      .poly([0, -11, 8, -2, 4, 10, -4, 10, -8, -2])
      .fill({ color: 0x3b1e00, alpha: 0.5 });
  } else if (kind === "choice") {
    token
      .circle(-8, -3, 5)
      .circle(9, -3, 5)
      .fill({ color: 0x07101a, alpha: 0.75 })
      .moveTo(-8, 10)
      .lineTo(8, 10)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.85 });
  } else if (kind === "nova") {
    token
      .circle(0, 0, 14)
      .fill({ color: 0xff6a00, alpha: 0.9 })
      .circle(0, 0, 8)
      .fill({ color: 0xff2200, alpha: 0.8 })
      .circle(0, 0, 3)
      .fill({ color: 0xffffff, alpha: 0.95 })
      .moveTo(0, -16).lineTo(4, -8).moveTo(0, -16).lineTo(-4, -8)
      .moveTo(0, 16).lineTo(4, 8).moveTo(0, 16).lineTo(-4, 8)
      .moveTo(-16, 0).lineTo(-8, 4).moveTo(-16, 0).lineTo(-8, -4)
      .moveTo(16, 0).lineTo(8, 4).moveTo(16, 0).lineTo(8, -4)
      .moveTo(11, -11).lineTo(7, -5).moveTo(11, -11).lineTo(5, -7)
      .moveTo(-11, -11).lineTo(-7, -5).moveTo(-11, -11).lineTo(-5, -7)
      .moveTo(11, 11).lineTo(7, 5).moveTo(11, 11).lineTo(5, 7)
      .moveTo(-11, 11).lineTo(-7, 5).moveTo(-11, 11).lineTo(-5, 7)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.85 });
  } else {
    token
      .circle(0, 0, 8)
      .stroke({ width: 5, color: 0xffffff, alpha: 0.9 })
      .circle(0, 0, 3)
      .fill({ color: 0xffffff, alpha: 0.95 });
  }

  return token;
}

function powerupColor(kind: PowerKind): number {
  return {
    split: 0x7cff26,
    cluster: 0x6dff9a,
    bombcluster: 0xff8f2b,
    laser: 0xffdf33,
    autolaser: 0xfff26b,
    bazooka: 0xff4f38,
    widen: 0x13dbff,
    shrink: 0xff4f78,
    slow: 0x58e7ff,
    timewarp: 0x83f7ff,
    pierce: 0xb891ff,
    train: 0x6dff9a,
    goldrush: 0xffc83d,
    burst: 0xff35d8,
    machine: 0xfff26b,
    overcharge: 0xff4f78,
    bombbait: 0xff3838,
    redstorm: 0xff3f3f,
    kamikaze: 0xff1f1f,
    blackhole: 0xb891ff,
    mirror: 0xe7dcff,
    cascade: 0x00ffd1,
    orbitals: 0x83f7ff,
    jackpot: 0xffffff,
    nova: 0xff6a00,
    choice: 0xffffff
  }[kind] ?? 0xffffff;
}

function powerupLabel(kind: PowerKind): string {
  return {
    split: "+BALLS",
    cluster: "CLUSTER",
    bombcluster: "BOMBS",
    laser: "LASER",
    autolaser: "AUTO",
    bazooka: "BOOM",
    widen: "WIDE",
    shrink: "TIGHT",
    slow: "SLOW",
    timewarp: "TIME",
    pierce: "PHASE",
    train: "TRAIN",
    goldrush: "GOLD",
    burst: "BURST",
    machine: "SPRAY",
    overcharge: "OVER",
    bombbait: "BAIT",
    redstorm: "RED",
    kamikaze: "MAD",
    blackhole: "WELL",
    mirror: "MIRROR",
    cascade: "CASCADE",
    orbitals: "ORBIT",
    jackpot: "JACKPOT",
    nova: "NOVA",
    choice: "BANK"
  }[kind] ?? kind.toUpperCase();
}

function updatePowerups(dt: number): void {
  for (const powerup of powerups) {
    powerup.y += powerup.vy * dt;

    if (
      Math.abs(powerup.x - paddle.x) < paddle.w / 2 + 28 &&
      Math.abs(powerup.y - paddle.y) < 42
    ) {
      powerup.dead = true;
      applyPowerup(powerup.kind);
      if (powerup.golden) applyGoldenReward(powerup.kind, powerup.x, powerup.y);
      state.score += (powerup.golden ? 1600 : 580) * state.combo;
      burst(powerup.x, powerup.y, powerupColor(powerup.kind), 28, 0.9);
      shockwave(powerup.x, powerup.y, powerup.golden ? 0xfff26b : powerupColor(powerup.kind), powerup.golden ? 92 : 58);
    }

    if (powerup.y > WORLD_H + 80) powerup.dead = true;
  }
}

function applyGoldenReward(kind: PowerKind, x: number, y: number): void {
  state.goldRush = Math.max(state.goldRush, 12);
  state.combo = Math.min(99, state.combo + 8);
  state.comboClock = Math.max(state.comboClock, 3);
  bankPowerChoice("GOLD PICK");
  burst(x, y, 0xfff26b, 42, 1.05);
  popText(x, y - 46, "GOLDEN", 0xfff26b);
  beep(1180, 0.09, "triangle", 0.045);

  if (kind === "split" || kind === "cluster") splitBalls(x, y, 4, 1.05);
  else if (kind === "laser" || kind === "autolaser" || kind === "bazooka") fireBazooka(true);
  else if (kind === "bombcluster" || kind === "bombbait") miniExplosion(x, y, 150, 1.6);
  else if (kind === "blackhole" || kind === "cascade") miniExplosion(x, y, 130, 1.25);
  else if (kind === "mirror" || kind === "orbitals") splitSpecificBalls(x, y, 4, 1.08, "yellow");
  else if (kind === "kamikaze") splitSpecificBalls(x, y, 3, 1.1, "red");
  else if (kind === "jackpot") state.bankedPowerChoices = Math.min(4, state.bankedPowerChoices + 1);
  else if (kind === "nova") startNova();
}

function applyPaddleSizeEffect(kind: "widen" | "shrink"): void {
  if (kind === "widen") {
    paddle.widen = Math.min(20, Math.max(paddle.widen, 6) + 4);
    paddle.widenStacks = Math.min(3, (paddle.widen > 0 ? paddle.widenStacks : 0) + 1);
    if (paddle.shrink > 0) paddle.shrinkStacks = Math.max(0, paddle.shrinkStacks - 1);
    if (paddle.shrinkStacks === 0) paddle.shrink = 0;
    popText(paddle.x, paddle.y - 78, `WIDE x${paddle.widenStacks}`, powerupColor("widen"));
  } else {
    paddle.shrink = Math.min(20, Math.max(paddle.shrink, 8) + 5);
    paddle.shrinkStacks = Math.min(3, (paddle.shrink > 0 ? paddle.shrinkStacks : 0) + 1);
    if (paddle.widen > 0) paddle.widenStacks = Math.max(0, paddle.widenStacks - 1);
    if (paddle.widenStacks === 0) paddle.widen = 0;
    popText(paddle.x, paddle.y - 78, `TIGHT x${paddle.shrinkStacks}`, powerupColor("shrink"));
  }
}

function applyPowerup(kind: PowerKind): void {
  if (kind === "split") splitBalls(paddle.x, paddle.y - 56, 6, 1);
  if (kind === "cluster") startBallCluster(false);
  if (kind === "bombcluster") startBallCluster(true);
  if (kind === "laser") fireLasers(true);
  if (kind === "autolaser") startAutoLaser();
  if (kind === "bazooka") fireBazooka(true);
  if (kind === "widen") applyPaddleSizeEffect("widen");
  if (kind === "shrink") applyPaddleSizeEffect("shrink");
  if (kind === "slow") state.slowField = 7;
  if (kind === "timewarp") {
    state.timeWarp = Math.max(state.timeWarp, 15);
    state.flash = Math.max(state.flash, 0.1);
  }
  if (kind === "pierce") {
    state.pierce = Math.max(state.pierce, 9);
    for (const ball of balls) ball.frenzy = Math.max(ball.frenzy, 0.5);
  }
  if (kind === "train") startTrainStream();
  if (kind === "goldrush") {
    state.goldRush = Math.max(state.goldRush, 10);
    state.combo = Math.min(99, state.combo + 4);
    state.comboClock = Math.max(state.comboClock, 2.4);
  }
  if (kind === "machine") startMachineGun();
  if (kind === "overcharge") startOvercharge();
  if (kind === "bombbait") armBombBait();
  if (kind === "redstorm") startRedStorm();
  if (kind === "kamikaze") startKamikaze();
  if (kind === "choice") {
    bankPowerChoice();
    return;
  }
  if (kind === "burst") {
    state.flash = Math.max(state.flash, 0.14);
    splitBalls(paddle.x, paddle.y - 60, 3, 1.1);
    fireLasers(true);
  }
  if (kind === "blackhole") startGravityWell();
  if (kind === "mirror") mirrorBalls();
  if (kind === "cascade") startCascade();
  if (kind === "orbitals") launchOrbitals();
  if (kind === "jackpot") triggerJackpot();
  if (kind === "nova") startNova();
  const selfLabels: PowerKind[] = ["laser", "autolaser", "bazooka", "cluster", "bombcluster", "widen", "shrink", "train", "overcharge", "bombbait", "redstorm", "kamikaze", "blackhole", "mirror", "cascade", "orbitals", "jackpot", "nova"];
  if (!selfLabels.includes(kind)) popText(paddle.x, paddle.y - 78, powerupLabel(kind), powerupColor(kind));
}

function startKamikaze(): void {
  let redBalls = balls.filter((ball) => ball.kind === "red");
  if (redBalls.length === 0) {
    splitSpecificBalls(paddle.x, paddle.y - 58, 4 + clampUpgradeTier(state.runUpgrades.red), 1.08, "red");
    redBalls = balls.filter((ball) => ball.kind === "red");
  }

  for (const ball of redBalls.slice(0, 18)) {
    ball.kamikaze = Math.max(ball.kamikaze, 8.5);
    ball.kamikazeTarget = chooseKamikazeTarget(ball);
    ball.hot = Math.max(ball.hot, 1);
    ball.frenzy = Math.max(ball.frenzy, 1.15);
  }

  state.flash = Math.max(state.flash, 0.18);
  state.pierce = Math.max(state.pierce, 1.2);
  addShake(7);
  popText(WORLD_W / 2, 146, "RED KAMIKAZE", powerupColor("kamikaze"));
  shockwave(WORLD_W / 2, 150, powerupColor("kamikaze"), 128);
  beep(104, 0.12, "sawtooth", 0.05);
}

function chooseKamikazeTarget(ball: Ball): Brick | null {
  if (bricks.length === 0) return null;
  return bricks
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      const priority = (brick.type === "bomb" ? -260 : 0) + (brick.role === "core" ? -160 : 0) + brick.hp * -14;
      return { brick, d: Math.hypot(cx - ball.x, cy - ball.y) + priority };
    })
    .sort((a, b) => a.d - b.d)[0]?.brick ?? null;
}

function densestBrickPoint(): { x: number; y: number } {
  if (bricks.length === 0) return { x: WORLD_W / 2, y: WORLD_H * 0.34 };
  const samples = bricks
    .filter((brick) => brick.y < WORLD_H * 0.72)
    .sort(() => Math.random() - 0.5)
    .slice(0, 24);
  let best = samples[0] ?? bricks[0];
  let bestScore = -1;
  for (const brick of samples) {
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    const score = bricks.reduce((sum, other) => {
      const ox = other.x + other.w / 2;
      const oy = other.y + other.h / 2;
      const d = Math.hypot(cx - ox, cy - oy);
      return sum + (d < 260 ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = brick;
    }
  }
  return { x: best.x + best.w / 2, y: best.y + best.h / 2 };
}

function startGravityWell(): void {
  const center = densestBrickPoint();
  const radius = 245;
  for (const ball of balls) {
    const dx = center.x - ball.x;
    const dy = center.y - ball.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 520) continue;
    const pull = clamp(1 - d / 540, 0.12, 1);
    ball.vx += dx / d * 520 * pull;
    ball.vy += dy / d * 520 * pull;
    ball.hot = Math.max(ball.hot, 0.75);
    ball.frenzy = Math.max(ball.frenzy, 0.4);
  }

  const targets = bricks
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - center.x, cy - center.y) };
    })
    .filter(({ d }) => d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, 9);

  for (const hit of targets) {
    if (!bricks.includes(hit.brick)) continue;
    damageBrick(hit.brick, hit.cx, hit.cy, 1.2 + (1 - hit.d / radius) * 1.7);
  }

  state.pierce = Math.max(state.pierce, 1.35);
  state.flash = Math.max(state.flash, 0.16);
  addShake(5);
  burst(center.x, center.y, powerupColor("blackhole"), 34, 0.88);
  shockwave(center.x, center.y, powerupColor("blackhole"), 130);
  popText(center.x, center.y - 46, "GRAVITY WELL", powerupColor("blackhole"));
}

function mirrorBalls(): void {
  const source = [...balls]
    .sort((a, b) => ballDamage(b) - ballDamage(a))
    .slice(0, Math.min(8, Math.max(2, balls.length)));

  if (source.length === 0) {
    splitSpecificBalls(paddle.x, paddle.y - 58, 6, 1.05, "yellow");
    return;
  }

  for (const ball of source) {
    if (balls.length >= MAX_BALLS) break;
    const speed = Math.hypot(ball.vx, ball.vy) || launchSpeed();
    const angle = Math.atan2(ball.vy, -ball.vx) + rand(-0.16, 0.16);
    makeBall(clamp(WORLD_W - ball.x, WALL + 80, WORLD_W - WALL - 80), ball.y, angle, speed * 1.02, Math.max(12, ball.r / ballProfiles[ball.kind].size), ball.kind);
    const clone = balls[balls.length - 1];
    clone.hot = Math.max(clone.hot, 0.55);
    clone.frenzy = Math.max(clone.frenzy, 0.42);
  }

  state.flash = Math.max(state.flash, 0.12);
  shockwave(WORLD_W / 2, paddle.y - 160, powerupColor("mirror"), 98);
  popText(WORLD_W / 2, paddle.y - 170, "MIRROR", powerupColor("mirror"));
}

function startCascade(): void {
  const center = densestBrickPoint();
  const queue = bricks
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - center.x, cy - center.y) };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 12);

  queue.forEach((hit, index) => {
    if (!bricks.includes(hit.brick)) return;
    hit.brick.flash = 1;
    damageBrick(hit.brick, hit.cx, hit.cy, 0.95 + Math.max(0, 5 - index) * 0.18);
    if (index % 3 === 0) shockwave(hit.cx, hit.cy, powerupColor("cascade"), 38 + index * 2);
  });

  state.combo = Math.min(99, state.combo + 4);
  state.comboClock = Math.max(state.comboClock, 2.4);
  state.flash = Math.max(state.flash, 0.1);
  popText(center.x, center.y - 42, "CASCADE", powerupColor("cascade"));
}

function launchOrbitals(): void {
  const count = Math.min(14, 8 + Math.floor(totalUpgradeTier() / 8));
  for (let i = 0; i < count && balls.length < MAX_BALLS; i += 1) {
    const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.18;
    const kind: BallKind = i % 5 === 0 ? "red" : i % 3 === 0 ? "yellow" : "green";
    const x = paddle.x + Math.cos(i / count * Math.PI * 2) * 52;
    const y = paddle.y - 70 + Math.sin(i / count * Math.PI * 2) * 16;
    makeBall(x, y, angle, launchSpeed() * rand(0.98, 1.18), 12, kind);
    const ball = balls[balls.length - 1];
    ball.hot = Math.max(ball.hot, 0.5);
    ball.frenzy = Math.max(ball.frenzy, 0.35);
  }
  state.launched = true;
  state.flash = Math.max(state.flash, 0.12);
  shockwave(paddle.x, paddle.y - 70, powerupColor("orbitals"), 92);
  popText(paddle.x, paddle.y - 112, "ORBITAL BURST", powerupColor("orbitals"));
}

function triggerJackpot(): void {
  const rewards: PowerKind[] = ["mirror", "cascade", "train", "goldrush", "orbitals", "blackhole", "bazooka"];
  const first = rewards[Math.floor(Math.random() * rewards.length)];
  let second = rewards[Math.floor(Math.random() * rewards.length)];
  if (second === first) second = "split";
  state.goldRush = Math.max(state.goldRush, 14);
  state.combo = Math.min(99, state.combo + 12);
  state.comboClock = Math.max(state.comboClock, 3.5);
  bankPowerChoice("JACKPOT PICK");
  popText(WORLD_W / 2, 146, "JACKPOT", powerupColor("jackpot"));
  shockwave(WORLD_W / 2, 150, powerupColor("jackpot"), 140);
  applyPowerup(first);
  applyPowerup(second);
}

function startNova(): void {
  const source = balls.length > 0
    ? [...balls].sort((a, b) => a.y - b.y)[0]
    : null;
  const cx = source ? source.x : paddle.x;
  const cy = source ? source.y : paddle.y - 100;
  if (source && balls.includes(source)) removeBall(source);
  const total = Math.min(100, MAX_BALLS - balls.length);
  const speed = launchSpeed();

  const arms = 8;
  const perArm = Math.ceil(total / arms);

  for (let arm = 0; arm < arms; arm++) {
    const armAngle = (arm / arms) * Math.PI * 2;
    for (let j = 0; j < perArm && balls.length < MAX_BALLS; j++) {
      const spread = rand(-0.12, 0.12);
      const angle = armAngle + spread;
      const sMul = 0.7 + (j / perArm) * 0.5;
      const bSpeed = speed * sMul * rand(0.95, 1.05);
      makeBall(cx, cy, angle, bSpeed, 13, "red");
      const ball = balls[balls.length - 1];
      if (ball) {
        ball.hot = 1;
        ball.frenzy = Math.max(ball.frenzy, 0.8);
      }
    }
  }

  state.launched = true;
  state.flash = Math.max(state.flash, 0.35);
  state.shake = 0;
  addShake(14);
  state.combo = Math.min(99, state.combo + 25);
  state.comboClock = Math.max(state.comboClock, 4);
  shockwave(cx, cy, 0xff6a00, 200);
  burst(cx, cy, 0xff6a00, 30, 1.2);
  burst(cx, cy, 0xff2200, 20, 1.0);
  popText(cx, cy - 50, "NOVA", 0xff6a00);
  popText(cx, cy - 86, `${total} BALLS`, 0xff2200);
  beep(66, 0.18, "sawtooth", 0.055);
  beep(132, 0.14, "square", 0.04);
}

function startOvercharge(): void {
  state.overcharge = 9;
  paddle.shrink = Math.min(20, Math.max(paddle.shrink, 6));
  paddle.shrinkStacks = Math.max(paddle.shrinkStacks, 1);
  for (const ball of balls) {
    ball.hot = Math.max(ball.hot, 0.7);
    ball.frenzy = Math.max(ball.frenzy, 0.45 + state.runUpgrades.perfect * 0.08);
  }
  popText(paddle.x, paddle.y - 112, "RISK x2", 0xff4f78);
}

function armBombBait(): void {
  const candidates = bricks
    .filter((brick) => brick.type !== "bomb" && brick.type !== "steel" && brick.role !== "shell")
    .map((brick) => ({ brick, d: Math.abs((brick.y + brick.h / 2) - WORLD_H * 0.34) + Math.random() * 60 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 4 + state.runUpgrades.bombs);

  for (const { brick } of candidates) {
    brick.type = "bomb";
    brick.role = "core";
    brick.baseHp = 1;
    brick.damage = 0;
    syncBrickHealth(brick);
    brick.flash = 1;
    drawBrick(brick);
  }

  state.score += 1200 * Math.max(1, candidates.length);
  state.skillPressure = Math.min(1.7, state.skillPressure + 0.08);
  popText(WORLD_W / 2, 148, "BOMB BAIT", 0xff3838);
}

function startRedStorm(): void {
  state.redStorm = 8;
  splitSpecificBalls(paddle.x, paddle.y - 58, 5 + clampUpgradeTier(state.runUpgrades.red) * 2, 1.08, "red");
  state.skillPressure = Math.min(1.72, state.skillPressure + 0.06);
  popText(paddle.x, paddle.y - 112, "RED STORM", 0xff3f3f);
}

function clearRoundCarryover(): void {
  for (const ball of balls) {
    ball.aura.destroy();
    ball.sprite.destroy();
  }
  for (const chomper of chompers) chomper.sprite.destroy();
  for (const powerup of powerups) powerup.sprite.destroy();
  for (const laser of lasers) laser.gfx.destroy();

  balls.length = 0;
  chompers.length = 0;
  powerups.length = 0;
  lasers.length = 0;
  clusterEvents.length = 0;
  state.launched = false;
  state.autoLaser = 0;
  state.autoLaserClock = 0;
  state.machineGunShots = 0;
  state.machineGunClock = 0;
  state.trainShots = 0;
  state.trainClock = 0;
}

function offerEndLevelRewards(): void {
  if (state.waitingChoice) return;
  clearRoundCarryover();
  state.pendingPowerChoices = Math.min(4, state.bankedPowerChoices);
  state.queuedPowerRewards.length = 0;
  if (state.objective?.complete) {
    state.consecutiveSuccesses += 1;
    state.consecutiveFails = 0;
    offerUpgradeChoice();
    return;
  }

  state.consecutiveFails += 1;
  state.consecutiveSuccesses = 0;

  if (state.pendingPowerChoices > 0) {
    offerPowerChoice("Challenge Missed", "No upgrade earned. Pick any banked powers before the next age.");
    return;
  }

  popText(WORLD_W / 2, 156, "NO UPGRADE", 0xff4f78);
  finishEndLevelRewards();
}

function offerUpgradeChoice(): void {
  const choices = pickUpgradeChoices();
  const profile = runProfileSummary();
  const powerText = state.pendingPowerChoices > 0
    ? `${profile} ${state.pendingPowerChoices} banked power ${state.pendingPowerChoices === 1 ? "pick" : "picks"} after this.`
    : `${profile} Choose a run upgrade before the next age.`;
  showChoiceOverlay("Age Cleared", powerText, choices.map((upgrade) => {
    const nextTier = nextUpgradeTier(upgrade.id);
    return {
      title: upgrade.title,
      body: upgradeStackBody(upgrade.id, nextTier),
      value: upgrade.id,
      badge: upgradeTierBadge(nextTier),
      tone: upgradeTierTone(nextTier)
    };
  }), (id) => {
    applyUpgrade(id);
    if (state.pendingPowerChoices > 0) offerPowerChoice();
    else finishEndLevelRewards();
  });
}

function offerPowerChoice(title = "Banked Power", intro?: string): void {
  const total = Math.min(4, state.bankedPowerChoices);
  const current = total - state.pendingPowerChoices + 1;
  const choices = pickPowerChoices(3);
  const copy = intro ? `${intro} Pick ${current} of ${total}.` : `Pick ${current} of ${total} for the next age.`;
  showChoiceOverlay(title, copy, choices.map((kind) => ({
    title: powerupLabel(kind),
    body: powerChoiceBody(kind),
    value: kind
  })), (kind) => {
    state.queuedPowerRewards.push(kind);
    state.pendingPowerChoices = Math.max(0, state.pendingPowerChoices - 1);
    if (state.pendingPowerChoices > 0) offerPowerChoice();
    else finishEndLevelRewards();
  });
}

function pickPowerChoices(count: number): PowerKind[] {
  const pool: PowerKind[] = [
    "split",
    "cluster",
    "bombcluster",
    "blackhole",
    "mirror",
    "cascade",
    "orbitals",
    "kamikaze",
    "train",
    "timewarp",
    "goldrush",
    "machine",
    "slow",
    "widen",
    "burst",
    "laser",
    "autolaser",
    "bazooka",
    "overcharge",
    "redstorm",
    "bombbait",
    "jackpot",
    "nova"
  ];
  if (Math.random() < 0.22) pool.push("pierce");
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

function powerChoiceBody(kind: PowerKind): string {
  return {
    split: "Add a fast burst of extra balls.",
    cluster: "Pull nearby balls together, then multiply them outward.",
    bombcluster: "Pull balls together, convert them into blast balls.",
    laser: "Fire one precise lane cutter.",
    autolaser: "Fire fully automatic paddle lasers for 4 seconds.",
    bazooka: "Launch one heavy shot that explodes on impact.",
    widen: "Make the paddle easier for a while.",
    shrink: "Smaller paddle, higher tension.",
    slow: "Near-paddle balls move 25% slower.",
    timewarp: "All balls move 70% slower for 15 seconds.",
    pierce: "Balls phase through bricks for a short chain window.",
    train: "Launch a straight line of balls one after another.",
    goldrush: "Double score juice and extend the combo window.",
    burst: "Balls and lasers together.",
    machine: "Spray-feed balls upward.",
    overcharge: "Balls hit much harder, paddle shrinks.",
    bombbait: "Seed bomb cores into the next structure.",
    redstorm: "Launch heavy red balls and raise pressure.",
    kamikaze: "Very rare: red balls hunt bricks and explode on impact.",
    blackhole: "Pull balls into the densest brick cluster and crush it.",
    mirror: "Clone your strongest active balls across the arena.",
    cascade: "Start a fast chain reaction through nearby bricks.",
    orbitals: "Launch a ring of hot balls from the paddle.",
    jackpot: "Trigger two rare powers and bank another pick.",
    nova: "Ultra rare: erupt 100 balls in a 360-degree stream from a live ball.",
    choice: "Bank another end-of-age power pick."
  }[kind];
}

function finishEndLevelRewards(): void {
  const queued = [...state.queuedPowerRewards];
  state.bankedPowerChoices = 0;
  state.pendingPowerChoices = 0;
  state.queuedPowerRewards.length = 0;
  hideChoiceOverlay();
  state.level += 1;
  resetLevel(false, false);
  state.launchPowerQueue = queued;
  updateHud();
}

function runProfileSummary(): string {
  return `Run: x${state.bestComboRun} best combo, ${state.maxBallsRun} max balls.`;
}

function clampUpgradeTier(tier: number): number {
  return Math.max(0, Math.min(UPGRADE_MAX_TIER, Math.floor(tier)));
}

function nextUpgradeTier(id: UpgradeId): number {
  return Math.max(1, Math.min(UPGRADE_MAX_TIER, state.runUpgrades[id] + 1));
}

function upgradeTierColor(tier: number): number {
  const index = clampUpgradeTier(tier) - 1;
  return upgradeTierColors[Math.max(0, Math.min(upgradeTierColors.length - 1, index))];
}

function upgradeTierTone(tier: number): string {
  const index = clampUpgradeTier(tier) - 1;
  return upgradeTierTones[Math.max(0, Math.min(upgradeTierTones.length - 1, index))];
}

function upgradeTierBadge(tier: number): string {
  const safeTier = clampUpgradeTier(tier);
  return `${upgradeTierName(safeTier)} ${safeTier}/${UPGRADE_MAX_TIER}`;
}

function upgradeTierName(tier: number): string {
  const index = clampUpgradeTier(tier) - 1;
  return upgradeTierNames[Math.max(0, Math.min(upgradeTierNames.length - 1, index))];
}

function upgradeStackBody(id: UpgradeId, tier: number): string {
  const safeTier = clampUpgradeTier(tier);
  const name = upgradeTierName(safeTier);
  const overdrive = safeTier > 4 ? " Overdrive also raises the pace a little." : "";
  return {
    paddle: `${name} stack. Paddle base width becomes ${250 + paddleTierBonus[safeTier]}.${overdrive}`,
    red: `${name} stack. More red-ball chance, damage, speed, and storm count.${overdrive}`,
    machine: `${name} stack. Spray and train powers fire more balls with higher caps.${overdrive}`,
    bombs: `${name} stack. Bomb balls, bazookas, and bomb cores splash wider.${overdrive}`,
    perfect: `${name} stack. Perfect hits kick harder, score more, and frenzy longer.${overdrive}`,
    mercy: `${name} stack. One-ball comebacks trigger faster and spawn more help.${overdrive}`
  }[id];
}

function pickUpgradeChoices(): UpgradeOption[] {
  const available = upgradeOptions.filter((upgrade) => state.runUpgrades[upgrade.id] < UPGRADE_MAX_TIER);
  const pool = [...(available.length >= 3 ? available : upgradeOptions)].sort(() => Math.random() - 0.5);
  return pool.slice(0, 3);
}

function applyUpgrade(id: UpgradeId): void {
  const oldTier = clampUpgradeTier(state.runUpgrades[id]);
  const newTier = Math.min(UPGRADE_MAX_TIER, oldTier + 1);
  state.runUpgrades[id] = newTier;
  state.score += 1200 * state.level;
  const tierColor = upgradeTierColor(newTier);
  const upgrade = upgradeOptions.find((option) => option.id === id);

  if (id === "paddle") {
    paddle.w = basePaddleWidth();
    paddle.widen = Math.max(paddle.widen, 4 + newTier * 0.7);
  } else if (id === "red") {
    splitSpecificBalls(paddle.x, paddle.y - 58, 1 + newTier, 1.04, "red");
  } else if (id === "machine") {
    state.machineGunShots = Math.min(46, state.machineGunShots + 5 + newTier * 3);
  } else if (id === "bombs") {
    state.flash = Math.max(state.flash, 0.12);
  } else if (id === "perfect") {
    state.feverPulse = Math.min(1, state.feverPulse + 0.18 + newTier * 0.06);
  } else if (id === "mercy") {
    state.singleBallClock = Math.max(state.singleBallClock, 2 + newTier * 0.6);
    state.stallBreachClock = Math.max(state.stallBreachClock, 4 + newTier * 0.8);
  }

  if (newTier > 4) {
    state.skillPressure = Math.min(1.92, state.skillPressure + 0.035 + (newTier - 4) * 0.012);
    state.bankedPowerChoices = Math.min(4, state.bankedPowerChoices + (newTier === 5 ? 1 : 0));
  }

  popText(WORLD_W / 2, 166, `${upgradeTierName(newTier).toUpperCase()} ${upgrade?.title ?? "UPGRADE"}`, tierColor);
  shockwave(WORLD_W / 2, 166, tierColor, 76 + newTier * 12);
}

function showChoiceOverlay<T extends string>(
  title: string,
  copy: string,
  choices: Array<{ title: string; body: string; value: T; badge?: string; tone?: string }>,
  onPick: (value: T) => void
): void {
  const titleEl = overlay.querySelector("h1");
  const copyEl = overlay.querySelector("p");
  if (titleEl) titleEl.textContent = title;
  if (copyEl) copyEl.textContent = copy;

  choicePanel.replaceChildren();
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    if (choice.tone) button.classList.add(`choice-${choice.tone}`);
    if (choice.badge) {
      const badge = document.createElement("span");
      badge.className = "choice-badge";
      badge.textContent = choice.badge;
      button.appendChild(badge);
    }
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = choice.title;
    span.textContent = choice.body;
    button.append(strong, span);
    button.addEventListener("click", () => {
      const val = choice.value;
      if (typeof val === "string") {
        const kind = val as PowerKind;
        state.powerupPicks[kind] = (state.powerupPicks[kind] ?? 0) + 1;
      }
      onPick(choice.value);
    }, { once: true });
    choicePanel.appendChild(button);
  }

  startBtn.hidden = true;
  choicePanel.hidden = false;
  state.waitingChoice = true;
  state.paused = true;
  pauseBtn.textContent = "Choose";
  overlay.classList.remove("hidden");
}

function hideChoiceOverlay(): void {
  choicePanel.replaceChildren();
  choicePanel.hidden = true;
  startBtn.hidden = false;
  state.waitingChoice = false;
  state.paused = false;
  pauseBtn.textContent = "Pause";
  overlay.classList.add("hidden");
}

function startMachineGun(): void {
  state.launched = true;
  const machineTier = clampUpgradeTier(state.runUpgrades.machine);
  state.machineGunShots = Math.min(46, state.machineGunShots + 12 + machineTier * 5);
  state.machineGunClock = Math.min(state.machineGunClock, 0.01);
  state.flash = Math.max(state.flash, 0.08);
}

function startTrainStream(): void {
  state.launched = true;
  const machineTier = clampUpgradeTier(state.runUpgrades.machine);
  state.trainShots = Math.min(52, state.trainShots + 14 + machineTier * 4);
  state.trainClock = Math.min(state.trainClock, 0.01);
  state.trainX = paddle.x;
  state.trainAngle = -Math.PI / 2 + rand(-0.035, 0.035);
  state.flash = Math.max(state.flash, 0.08);
  popText(paddle.x, paddle.y - 112, "BALL TRAIN", powerupColor("train"));
}

function splitBalls(x: number, y: number, count: number, speedScale: number): void {
  splitSpecificBalls(x, y, count, speedScale);
}

function startBallCluster(bomb: boolean): void {
  const liveBalls = balls
    .filter((ball) => ball.y > WALL && ball.y < WORLD_H - WALL)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(bomb ? 9 : 12, balls.length));

  if (liveBalls.length === 0) {
    splitSpecificBalls(paddle.x, paddle.y - 58, bomb ? 5 : 8, 1.02, bomb ? "bomb" : undefined);
    return;
  }

  const centerX = liveBalls.reduce((sum, ball) => sum + ball.x, 0) / liveBalls.length;
  const centerY = liveBalls.reduce((sum, ball) => sum + ball.y, 0) / liveBalls.length;
  clusterEvents.push({
    x: clamp(centerX, WALL + 160, WORLD_W - WALL - 160),
    y: clamp(centerY, WALL + 120, WORLD_H - 230),
    life: 0.82,
    maxLife: 0.82,
    bomb,
    targets: liveBalls,
    spawned: false
  });

  state.flash = Math.max(state.flash, 0.12);
  shockwave(centerX, centerY, bomb ? ballProfiles.bomb.color : powerupColor("cluster"), 76);
  popText(centerX, centerY - 40, bomb ? "BOMB CLUSTER" : "CLUSTER", bomb ? ballProfiles.bomb.color : powerupColor("cluster"));
}

function updateClusterEvents(dt: number): void {
  for (const event of clusterEvents) {
    event.life -= dt;
    const t = 1 - Math.max(0, event.life / event.maxLife);
    const pull = event.bomb ? 14 : 11;

    for (const ball of event.targets) {
      if (!balls.includes(ball)) continue;
      const dx = event.x - ball.x;
      const dy = event.y - ball.y;
      ball.vx += dx * pull * dt;
      ball.vy += dy * pull * dt;
      ball.vx *= Math.pow(0.12, dt);
      ball.vy *= Math.pow(0.12, dt);
      ball.hot = Math.max(ball.hot, 0.4 + t * 0.45);
      ball.frenzy = Math.max(ball.frenzy, 0.28 + t * 0.35);
    }

    if (!event.spawned && event.life <= 0) {
      event.spawned = true;
      finishBallCluster(event);
    }
  }

  for (let i = clusterEvents.length - 1; i >= 0; i -= 1) {
    if (clusterEvents[i].life <= -0.12) clusterEvents.splice(i, 1);
  }
}

function finishBallCluster(event: ClusterEvent): void {
  const targets = event.targets.filter((ball) => balls.includes(ball));
  const color = event.bomb ? ballProfiles.bomb.color : powerupColor("cluster");
  const spawnCount = event.bomb
    ? Math.min(10, 4 + targets.length)
    : Math.min(18, 7 + targets.length);

  for (const ball of targets) {
    if (event.bomb) {
      ball.kind = "bomb";
      ball.r = Math.max(ball.r, 15 * ballProfiles.bomb.size);
      ball.blastCooldown = 0.32;
    }
    const angle = Math.atan2(ball.y - event.y, ball.x - event.x) + rand(-0.65, 0.65);
    const speed = launchSpeed() * (event.bomb ? rand(0.82, 0.98) : rand(0.92, 1.16));
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.hot = Math.max(ball.hot, event.bomb ? 0.9 : 0.65);
  }

  for (let i = 0; i < spawnCount; i += 1) {
    const angle = -Math.PI / 2 + (i - (spawnCount - 1) / 2) * 0.12 + rand(-0.32, 0.32);
    makeBall(event.x + rand(-20, 20), event.y + rand(-14, 14), angle, launchSpeed() * rand(0.86, 1.08), event.bomb ? 13 : 12, event.bomb ? "bomb" : chooseBallKind());
  }

  state.flash = Math.max(state.flash, event.bomb ? 0.18 : 0.12);
  addShake(event.bomb ? 9 : 5);
  burst(event.x, event.y, color, event.bomb ? 46 : 34, event.bomb ? 1.15 : 0.86);
  shockwave(event.x, event.y, color, event.bomb ? 112 : 86);
  beep(event.bomb ? 118 : 520, event.bomb ? 0.12 : 0.055, event.bomb ? "sawtooth" : "triangle", event.bomb ? 0.048 : 0.034);
}

function splitSpecificBalls(x: number, y: number, count: number, speedScale: number, forcedKind?: BallKind): void {
  const available = Math.max(0, MAX_BALLS - balls.length);
  const amount = Math.min(count, available);
  for (let i = 0; i < amount; i += 1) {
    makeBall(x, y, -Math.PI / 2 + rand(-0.95, 0.95), launchSpeed() * speedScale, 14, forcedKind ?? chooseBallKind());
  }
  state.flash = Math.max(state.flash, 0.1);
  shockwave(x, y, 0xffffff, 48);
}

function fireLasers(force = false): void {
  if (!force && paddle.cooldown > 0) return;
  paddle.cooldown = 0.34;
  createLaser(paddle.x, "laser");
  beep(930, 0.07, "sawtooth", 0.032);
}

function startAutoLaser(): void {
  state.autoLaser = Math.max(state.autoLaser, 4);
  state.autoLaserClock = Math.min(state.autoLaserClock, 0.01);
  state.autoLaserSide = -1;
  state.flash = Math.max(state.flash, 0.08);
  popText(paddle.x, paddle.y - 112, "AUTO LASER", powerupColor("autolaser"));
}

function fireBazooka(force = false): void {
  if (!force && paddle.cooldown > 0) return;
  paddle.cooldown = 0.62;
  createLaser(paddle.x, "bazooka");
  addShake(5);
  state.flash = Math.max(state.flash, 0.12);
  popText(paddle.x, paddle.y - 112, "BAZOOKA", powerupColor("bazooka"));
  beep(122, 0.11, "sawtooth", 0.052);
}

function createLaser(x: number, kind: LaserKind = "laser"): void {
  const gfx = new Graphics();
  effectLayer.addChild(gfx);
  const speed = kind === "bazooka" ? -760 : kind === "auto" ? -1180 : -1080;
  lasers.push({ x, y: paddle.y - 36, vx: 0, vy: speed, life: kind === "bazooka" ? 1.35 : 1.1, kind, gfx });
}

function updateLasers(dt: number): void {
  for (const laser of lasers) {
    laser.x += laser.vx * dt;
    laser.y += laser.vy * dt;
    laser.life -= dt;

    for (const brick of bricks) {
      if (laser.x < brick.x || laser.x > brick.x + brick.w || laser.y < brick.y || laser.y > brick.y + brick.h) continue;
      laser.life = 0;
      if (laser.kind === "bazooka") bazookaImpact(laser.x, laser.y, brick);
      else damageBrick(brick, laser.x, laser.y, laser.kind === "auto" ? 0.9 : 2.4);
      break;
    }
  }
}

function bazookaImpact(x: number, y: number, primary: Brick): void {
  const radius = 210 + state.runUpgrades.bombs * 18;
  const inner = 72 + state.runUpgrades.bombs * 8;
  state.flash = Math.max(state.flash, 0.2);
  addShake(10);
  burst(x, y, powerupColor("bazooka"), 58, 1.2);
  shockwave(x, y, powerupColor("bazooka"), 128);
  damageBrick(primary, x, y, 4.2 + state.runUpgrades.bombs * 0.55);

  const hits = bricks
    .filter((brick) => brick !== primary)
    .map((brick) => {
      const cx = brick.x + brick.w / 2;
      const cy = brick.y + brick.h / 2;
      return { brick, cx, cy, d: Math.hypot(cx - x, cy - y) };
    })
    .filter(({ d }) => d < radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, 9 + state.runUpgrades.bombs);

  for (const hit of hits) {
    if (!bricks.includes(hit.brick)) continue;
    const damage = hit.d < inner ? 3.2 : 1.55 + (1 - hit.d / radius) * 1.35;
    damageBrick(hit.brick, hit.cx, hit.cy, damage);
  }
}

function updateChompers(dt: number): void {
  maybeSpawnChomper(dt);

  for (const chomper of chompers) {
    chomper.age += dt;

    if (chomper.mode === "hunt") {
      if (!chomper.target || !balls.includes(chomper.target)) {
        chomper.target = chooseChomperTarget(chomper.x, chomper.y);
      }

      if (!chomper.target) {
        sendChomperAway(chomper);
      } else {
        const dx = chomper.target.x - chomper.x;
        const dy = chomper.target.y - chomper.y;
        const d = Math.hypot(dx, dy) || 1;
        const speedCap = clamp(125 + chomper.age * 110 + chomper.eaten * 45, 125, 900);
        const steer = 410 + chomper.age * 92 + chomper.eaten * 55;
        chomper.vx += dx / d * steer * dt;
        chomper.vy += dy / d * steer * dt;
        const speed = Math.hypot(chomper.vx, chomper.vy) || 1;
        if (speed > speedCap) {
          chomper.vx = chomper.vx / speed * speedCap;
          chomper.vy = chomper.vy / speed * speedCap;
        }

        if (d < chomper.r + chomper.target.r) {
          const eaten = chomper.target;
          removeBall(eaten);
          chomper.target = null;
          chomper.eaten += 1;
          if (balls.length <= 4 || chomper.eaten >= 6) sendChomperAway(chomper);
          else chomper.target = chooseChomperTarget(chomper.x, chomper.y);
          addShake(5);
          burst(eaten.x, eaten.y, 0xfff26b, 24, 0.8);
          shockwave(eaten.x, eaten.y, 0xffd84a, 54);
          popText(eaten.x, eaten.y - 24, "CHOMP", 0xfff26b);
          beep(160, 0.08, "sawtooth", 0.04);
        }
      }
    } else {
      chomper.vy -= 180 * dt;
    }

    chomper.x += chomper.vx * dt;
    chomper.y += chomper.vy * dt;
    if (chomper.y < -160 || chomper.y > WORLD_H + 160 || chomper.x < -180 || chomper.x > WORLD_W + 180) {
      chomper.dead = true;
    }
  }
}

function sendChomperAway(chomper: Chomper): void {
  if (chomper.mode === "exit") return;
  chomper.mode = "exit";
  const side = chomper.x < WORLD_W / 2 ? -1 : 1;
  chomper.vx = side * rand(360, 520);
  chomper.vy = rand(-220, -90);
}

function maybeSpawnChomper(dt: number): void {
  if (!state.launched || balls.length < 12 || chompers.length >= 3) return;

  state.chomperCooldown -= dt;
  if (state.chomperCooldown > 0) return;

  const pressure = ballPressureMultiplier();
  const chance = pressure >= 3 ? 0.65 : pressure >= 2.5 ? 0.45 : pressure >= 2 ? 0.3 : 0.18;
  const nextDelay = pressure >= 3 ? rand(4, 6) : pressure >= 2.5 ? rand(5.5, 8) : rand(7, 11);
  state.chomperCooldown = nextDelay;
  if (Math.random() > chance) return;

  state.chomperWarningTimer = 0.5;
  state.chomperWarningSide = Math.random() < 0.5 ? -1 : 1;
  spawnChomper();
}

function spawnChomper(): void {
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side < 0 ? -56 : WORLD_W + 56;
  const y = rand(90, WORLD_H * 0.42);
  const target = chooseChomperTarget(x, y);
  if (!target) return;

  const sprite = new Graphics();
  effectLayer.addChild(sprite);

  chompers.push({
    x,
    y,
    vx: side < 0 ? rand(70, 120) : rand(-120, -70),
    vy: rand(-25, 35),
    r: 24,
    age: 0,
    eaten: 0,
    mode: "hunt",
    target,
    dead: false,
    sprite
  });
}

function drawChomper(chomper: Chomper): void {
  const open = chomper.mode === "hunt" ? 0.2 + Math.abs(Math.sin(chomper.age * 12)) * 0.62 : 0.18;
  const upper = -open * chomper.r;
  const lower = open * chomper.r;
  const bite = chomper.r * 0.88;
  chomper.sprite.clear()
    .circle(0, 0, chomper.r)
    .fill({ color: 0xffd84a, alpha: 0.96 })
    .circle(0, 0, chomper.r - 4)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.32 })
    .poly([2, 0, bite, upper, bite, lower])
    .fill({ color: 0x07090f, alpha: 0.96 })
    .circle(4, -10, 4)
    .fill({ color: 0x111111, alpha: 0.95 });
}

function chooseChomperTarget(x: number, y: number): Ball | null {
  const candidates = balls
    .map((ball) => ({ ball, d: Math.hypot(ball.x - x, ball.y - y) }))
    .filter(({ d }) => d > CHOMPER_MIN_DISTANCE)
    .sort((a, b) => b.d - a.d);

  if (candidates.length === 0) return null;
  const pick = Math.floor(rand(0, Math.min(4, candidates.length)));
  return candidates[pick].ball;
}

function makeBall(x: number, y: number, angle: number, speed: number, radius: number, kind: BallKind = chooseBallKind()): void {
  if (balls.length >= MAX_BALLS) return;
  const profile = ballProfiles[kind];
  const aura = new Graphics();
  const sprite = new Sprite(spriteTextures.ball);
  sprite.anchor.set(0.5);
  sprite.tint = profile.color;
  sprite.width = radius * 4 * profile.size;
  sprite.height = radius * 4 * profile.size;
  actorLayer.addChild(aura);
  actorLayer.addChild(sprite);

  balls.push({
    x,
    y,
    prevX: x,
    prevY: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: radius * profile.size,
    hot: 0.2,
    kind,
    hero: false,
    frenzy: 0,
    blastCooldown: 0,
    kamikaze: 0,
    kamikazeTarget: null,
    aura,
    sprite
  });
}

function chooseBallKind(): BallKind {
  const roll = Math.random();
  const redChance = clamp(0.12 + clampUpgradeTier(state.runUpgrades.red) * 0.07 + (state.redStorm > 0 ? 0.28 : 0), 0.12, 0.58);
  const yellowChance = redChance + 0.26;
  if (roll < redChance) return "red";
  if (roll < yellowChance) return "yellow";
  return "green";
}

function launch(): void {
  if (!state.running || state.paused) return;
  if (state.launched && balls.length > 0) return;
  ensureAudio();
  if (state.audio?.state === "suspended") void state.audio.resume();
  launchLevelBalls();
}

function launchLevelBalls(): void {
  const level = currentLevel();
  const count = Math.min(8, level.startBalls + Math.min(2, levelCycle()));
  const parkedOnly = !state.launched && balls.every((ball) => Math.hypot(ball.vx, ball.vy) < 1);
  if (parkedOnly) {
    for (const ball of balls) {
      ball.aura.destroy();
      ball.sprite.destroy();
    }
    balls.length = 0;
  }

  for (let i = 0; i < count; i += 1) {
    const spread = count === 1 ? 0 : (i - (count - 1) / 2) * 0.16;
    makeBall(paddle.x, paddle.y - 56, -Math.PI / 2 + spread + rand(-0.06, 0.06), launchSpeed(), 15);
  }

  state.launched = true;
  const queued = [...state.launchPowerQueue];
  state.launchPowerQueue.length = 0;
  for (const kind of queued) applyPowerup(kind);
  beep(680, 0.055, "triangle", 0.045);
}

function launchSpeed(): number {
  return Math.min(1140, 640 + state.level * 16 + clampUpgradeTier(state.runUpgrades.red) * 16 + (currentLevel().speedBoost ?? 0));
}

function startGame(): void {
  ensureAudio();
  if (state.audio?.state === "suspended") void state.audio.resume();
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.bestComboRun = 1;
  state.maxBallsRun = 0;
  state.lastComboSting = 0;
  state.level = 1;
  state.lives = 3;
  state.skillPressure = 1;
  state.perfectHits = 0;
  state.feverPulse = 0;
  state.directorHelpClock = 0;
  state.hpPressure = 1;
  state.pacePressure = 1;
  state.paddleHits = 0;
  state.paddleDrains = 0;
  state.consecutiveFails = 0;
  state.consecutiveSuccesses = 0;
  state.mercyBudget = 0;
  state.progressVelocity = 0;
  state.velocityBrickKills = 0;
  state.velocityClock = 0;
  state.chomperWarningTimer = 0;
  state.powerupPicks = {};
  state.overcharge = 0;
  state.redStorm = 0;
  state.timeWarp = 0;
  state.pierce = 0;
  state.goldRush = 0;
  state.autoLaser = 0;
  state.autoLaserClock = 0;
  state.bankedPowerChoices = 0;
  state.pendingPowerChoices = 0;
  state.queuedPowerRewards.length = 0;
  state.launchPowerQueue.length = 0;
  state.powerDropPity = 0;
  state.goldenDropPity = 0;
  state.waitingChoice = false;
  for (const key of Object.keys(state.runUpgrades) as UpgradeId[]) state.runUpgrades[key] = 0;
  state.chomperCooldown = 9;
  pauseBtn.textContent = "Pause";
  startBtn.textContent = "Start";
  const title = overlay.querySelector("h1");
  const copy = overlay.querySelector("p");
  if (title) title.textContent = "Breakout";
  if (copy) copy.textContent = "Break bricks, chain multipliers, split balls, and survive shifting themed ages.";
  choicePanel.hidden = true;
  choicePanel.replaceChildren();
  startBtn.hidden = false;
  overlay.classList.add("hidden");
  resetLevel(false);
}

function clearLifeTransientObjects(): void {
  for (const powerup of powerups) powerup.sprite.destroy();
  for (const laser of lasers) laser.gfx.destroy();
  for (const chomper of chompers) chomper.sprite.destroy();

  powerups.length = 0;
  lasers.length = 0;
  chompers.length = 0;
  clusterEvents.length = 0;
  state.autoLaser = 0;
  state.autoLaserClock = 0;
  state.machineGunShots = 0;
  state.machineGunClock = 0;
  state.trainShots = 0;
  state.trainClock = 0;
  state.chomperCooldown = 9;
}

function handleBallDrain(): void {
  const wasLaunched = state.launched;
  state.launched = false;
  state.combo = 1;
  state.comboClock = 0;
  state.lastComboBonus = 0;
  state.pierce = 0;
  state.overcharge = 0;
  clearLifeTransientObjects();

  if (!wasLaunched) {
    makeBall(paddle.x, paddle.y - 54, -Math.PI / 2, 0, 16);
    return;
  }

  state.paddleDrains += 1;
  const stillAlive = loseLife();
  if (!stillAlive) return;

  makeBall(paddle.x, paddle.y - 54, -Math.PI / 2, 0, 16);
  popText(paddle.x, paddle.y - 92, "LIFE LOST", 0xff4f78);
}

function loseLife(): boolean {
  state.lives = Math.max(0, state.lives - 1);
  state.mercyBudget = 0;
  addShake(10);
  state.flash = Math.max(state.flash, 0.18);
  updateHud();
  if (state.lives > 0) return true;
  endGame();
  return false;
}

function endGame(): void {
  state.running = false;
  state.paused = false;
  state.shake = 0;
  state.waitingChoice = false;
  state.bankedPowerChoices = 0;
  state.pendingPowerChoices = 0;
  state.queuedPowerRewards.length = 0;
  state.launchPowerQueue.length = 0;
  state.autoLaser = 0;
  state.autoLaserClock = 0;
  clearLevelObjects(false);
  pauseBtn.textContent = "Pause";
  const title = overlay.querySelector("h1");
  const copy = overlay.querySelector("p");
  if (title) title.textContent = "Game Over";
  if (copy) copy.textContent = `Final score: ${Math.floor(state.score).toLocaleString()}.`;
  choicePanel.hidden = true;
  startBtn.textContent = "Restart";
  startBtn.hidden = false;
  overlay.classList.remove("hidden");
}

function togglePause(): void {
  if (!state.running) return;
  if (state.waitingChoice) return;
  state.paused = !state.paused;
  if (state.paused) {
    state.shake = 0;
    root.position.set(0, 0);
  }
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function updateParticles(dt: number): void {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.05, dt);
    particle.vy *= Math.pow(0.05, dt);
    particle.life -= dt;
  }
}

function updateJuice(dt: number): void {
  state.feverPulse = Math.max(0, state.feverPulse - dt * 0.9);

  for (const ring of shockRings) {
    ring.life -= dt;
    const t = 1 - Math.max(0, ring.life / ring.maxLife);
    ring.gfx.clear()
      .circle(ring.x, ring.y, ring.radius * (0.35 + t * 1.35))
      .stroke({ width: 5 * (1 - t), color: ring.color, alpha: 0.55 * (1 - t) });
  }

  for (const floater of floatTexts) {
    floater.life -= dt;
    floater.y += floater.vy * dt;
    floater.vy -= 34 * dt;
    const a = Math.max(0, floater.life / floater.maxLife);
    floater.text.position.set(floater.x, floater.y);
    floater.text.alpha = a;
    floater.text.scale.set(0.82 + (1 - a) * 0.22);
  }
}

function removeDeadObjects(): void {
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    if (balls[i].y < WORLD_H + 90) continue;
    removeBall(balls[i]);
  }

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    if (!powerups[i].dead) continue;
    powerups[i].sprite.destroy();
    powerups.splice(i, 1);
  }

  for (let i = lasers.length - 1; i >= 0; i -= 1) {
    if (lasers[i].life > 0 && lasers[i].y > -80) continue;
    lasers[i].gfx.destroy();
    lasers.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life > 0) continue;
    particles[i].sprite.destroy();
    particles.splice(i, 1);
  }

  for (let i = chompers.length - 1; i >= 0; i -= 1) {
    if (!chompers[i].dead) continue;
    chompers[i].sprite.destroy();
    chompers.splice(i, 1);
  }

  for (let i = shockRings.length - 1; i >= 0; i -= 1) {
    if (shockRings[i].life > 0) continue;
    shockRings[i].gfx.destroy();
    shockRings.splice(i, 1);
  }

  for (let i = floatTexts.length - 1; i >= 0; i -= 1) {
    if (floatTexts[i].life > 0) continue;
    floatTexts[i].text.destroy();
    floatTexts.splice(i, 1);
  }
}

function removeBall(ball: Ball): void {
  const index = balls.indexOf(ball);
  if (index === -1) return;
  ball.aura.destroy();
  ball.sprite.destroy();
  balls.splice(index, 1);
}

function renderFrame(dt: number): void {
  const shake = !state.running || state.paused ? 0 : Math.min(state.shake, balls.length > 20 ? 7 : 10);
  const sx = shake ? rand(-shake, shake) : 0;
  const sy = shake ? rand(-shake, shake) : 0;
  root.position.set(sx, sy);

  if (paddle.sprite) {
    paddle.sprite.position.set(paddle.x, paddle.y);
    paddle.sprite.tint = paddle.shrink > 0 ? 0xff7092 : paddle.widen > 0 ? 0x74efff : 0xffffff;
    paddle.sprite.width += ((paddle.w + 70) - paddle.sprite.width) * Math.min(1, dt * 22);
    paddle.sprite.height = 96;
  }
  renderPaddleZone();

  for (const brick of bricks) {
    brick.body.position.set(brick.x, brick.y);
    if (brick.flash > 0) brick.body.scale.set(1 + brick.flash * 0.045);
    else brick.body.scale.set(1);
  }

  for (const ball of balls) {
    ball.sprite.position.set(ball.x, ball.y);
    ball.sprite.rotation += dt * 5.5;
    const profile = ballProfiles[ball.kind];
    const heroScale = ball.hero ? 1.28 + Math.sin(state.levelClock * 10) * 0.06 : 1;
    const frenzyScale = ball.frenzy > 0 ? 1.14 + Math.sin(state.levelClock * 22) * 0.04 : 1;
    const auraAlpha = ball.kamikaze > 0 ? 0.56 : ball.kind === "bomb" ? 0.38 : ball.kind === "red" ? 0.34 : ball.kind === "yellow" ? 0.22 : 0.1;
    const auraScale = ball.kamikaze > 0 ? 2.65 : ball.kind === "bomb" ? 2.35 : ball.kind === "red" ? 2.2 : ball.kind === "yellow" ? 1.78 : 1.45;
    ball.aura.clear()
      .circle(0, 0, ball.r * auraScale * (ball.frenzy > 0 ? 1.25 : 1))
      .fill({ color: profile.color, alpha: (ball.hero ? 0.42 : auraAlpha) + (ball.frenzy > 0 ? 0.16 : 0) });
    ball.aura.position.set(ball.x, ball.y);
    ball.aura.scale.set(1 + Math.sin(state.levelClock * (ball.kind === "red" ? 14 : 9)) * 0.04);
    ball.sprite.tint = ball.kamikaze > 0 ? 0xffffff : ball.hero ? 0xffffff : profile.color;
    ball.sprite.width += (ball.r * 4 * heroScale * frenzyScale - ball.sprite.width) * Math.min(1, dt * 16);
    ball.sprite.height = ball.sprite.width;
  }

  for (const powerup of powerups) {
    powerup.sprite.position.set(powerup.x, powerup.y);
    powerup.sprite.rotation += dt * (powerup.golden ? 5.4 : 3.2);
    powerup.sprite.scale.set(powerup.golden ? 1 + Math.sin(state.levelClock * 10) * 0.08 : 1);
  }

  for (const laser of lasers) {
    laser.gfx.clear();
    if (laser.kind === "bazooka") {
      laser.gfx
        .circle(laser.x, laser.y, 18)
        .fill({ color: powerupColor("bazooka"), alpha: 0.94 })
        .circle(laser.x, laser.y, 8)
        .fill({ color: 0xffffff, alpha: 0.9 })
        .moveTo(laser.x, laser.y + 30)
        .lineTo(laser.x, laser.y + 58)
        .stroke({ width: 9, color: 0xffc83d, alpha: 0.45 });
    } else {
      const width = laser.kind === "auto" ? 5 : 9;
      const color = laser.kind === "auto" ? powerupColor("autolaser") : powerupColor("laser");
      laser.gfx
        .moveTo(laser.x, laser.y + 30)
        .lineTo(laser.x, laser.y - 54)
        .stroke({ width, color, alpha: 0.95 })
        .moveTo(laser.x, laser.y + 22)
        .lineTo(laser.x, laser.y - 45)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.95 });
    }
  }

  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    particle.sprite.position.set(particle.x, particle.y);
    particle.sprite.alpha = alpha;
    particle.sprite.rotation += dt * 4;
    particle.sprite.scale.set(alpha * 0.8 + 0.2);
  }

  for (const chomper of chompers) {
    drawChomper(chomper);
    chomper.sprite.position.set(chomper.x, chomper.y);
    chomper.sprite.rotation = Math.atan2(chomper.vy, chomper.vx);
    chomper.sprite.alpha = chomper.mode === "exit" ? 0.72 : 1;
    const throb = chomper.mode === "hunt" ? 1 + Math.sin(chomper.age * 9) * 0.05 : 1;
    chomper.sprite.scale.set(throb);
  }

  renderSlowField();
  renderFlash();
  renderToast();
  renderPauseOverlay();
  renderEffectStrip();
  renderChomperWarning();
  renderPauseUpgrades();
}

function drawArena(): void {
  arenaGfx.clear()
    .rect(0, 0, WORLD_W, WORLD_H)
    .fill({ color: 0x02060e, alpha: 0.2 })
    .rect(WALL, WALL, WORLD_W - WALL * 2, WORLD_H - WALL * 2)
    .fill({ color: 0x000000, alpha: 0.12 })
    .rect(WALL, WALL, WORLD_W - WALL * 2, WORLD_H - WALL * 2)
    .stroke({ width: 4, color: currentLevel().tint, alpha: 0.42 });

  for (let x = 160; x < WORLD_W; x += 160) {
    arenaGfx.moveTo(x, WALL)
      .lineTo(x, WORLD_H - WALL)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.06 });
  }
}

function renderPaddleZone(): void {
  paddleZoneGfx.clear();
  if (!state.running) return;
  const zoneW = Math.max(34, paddle.w * 0.18);
  const glow = 0.35 + Math.sin(state.levelClock * 8) * 0.08;
  paddleZoneGfx
    .roundRect(paddle.x - zoneW / 2, paddle.y - paddle.h / 2 - 5, zoneW, paddle.h + 10, 8)
    .fill({ color: 0xffffff, alpha: 0.08 })
    .roundRect(paddle.x - zoneW / 2, paddle.y - paddle.h / 2 - 5, zoneW, paddle.h + 10, 8)
    .stroke({ width: 2, color: 0xfff26b, alpha: glow });
}

function renderSlowField(): void {
  slowFieldGfx.clear();

  if (state.timeWarp > 0) {
    const alpha = Math.min(0.48, state.timeWarp / 15);
    slowFieldGfx
      .rect(WALL + 10, WALL + 10, WORLD_W - WALL * 2 - 20, WORLD_H - WALL * 2 - 20)
      .fill({ color: 0x83f7ff, alpha: 0.035 * alpha })
      .rect(WALL + 10, WALL + 10, WORLD_W - WALL * 2 - 20, WORLD_H - WALL * 2 - 20)
      .stroke({ width: 3, color: 0x83f7ff, alpha: 0.28 * alpha });

    const drift = (state.levelClock * 58) % 58;
    for (let y = WALL + drift; y < WORLD_H - WALL; y += 58) {
      slowFieldGfx
        .moveTo(WALL + 24, y)
        .lineTo(WORLD_W - WALL - 24, y)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.08 * alpha });
    }
  }

  if (state.pierce > 0) {
    const alpha = Math.min(0.52, state.pierce / 9);
    slowFieldGfx
      .rect(WALL + 18, WALL + 18, WORLD_W - WALL * 2 - 36, WORLD_H - WALL * 2 - 36)
      .stroke({ width: 2, color: 0xb891ff, alpha: 0.38 * alpha });
  }

  if (state.goldRush > 0) {
    const alpha = Math.min(0.55, state.goldRush / 10);
    slowFieldGfx
      .roundRect(WALL + 60, WALL + 18, WORLD_W - WALL * 2 - 120, 10, 5)
      .fill({ color: 0xffc83d, alpha: 0.36 * alpha });
  }

  if (state.slowField > 0) {
    const alpha = Math.min(0.55, state.slowField / 7);
    const y = paddle.y - 270;
    slowFieldGfx
      .roundRect(WALL + 22, y, WORLD_W - WALL * 2 - 44, 222, 16)
      .fill({ color: 0x58e7ff, alpha: 0.07 * alpha })
      .roundRect(WALL + 22, y, WORLD_W - WALL * 2 - 44, 222, 16)
      .stroke({ width: 2, color: 0x58e7ff, alpha: 0.32 * alpha })
      .moveTo(WALL + 44, y + 112)
      .lineTo(WORLD_W - WALL - 44, y + 112)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.12 * alpha });
  }
}

function drawBrick(brick: Brick): void {
  const color = brickColor(brick.type);
  const hpAlpha = 0.72 + 0.28 * (brick.hp / brick.maxHp);
  brick.skin.clear()
    .roundRect(0, 0, brick.w, brick.h, 10)
    .fill({ color, alpha: hpAlpha })
    .roundRect(3, 3, brick.w - 6, brick.h - 6, 8)
    .stroke({ width: 2, color: 0xffffff, alpha: 0.28 })
    .roundRect(9, 8, brick.w - 18, Math.max(5, brick.h * 0.22), 5)
    .fill({ color: 0xffffff, alpha: 0.2 });

  if (brick.type === "bomb") {
    brick.skin.circle(brick.w / 2, brick.h / 2, Math.min(brick.w, brick.h) * 0.22)
      .fill({ color: 0x1a0005, alpha: 0.62 })
      .moveTo(brick.w / 2 - 14, brick.h / 2)
      .lineTo(brick.w / 2 + 14, brick.h / 2)
      .moveTo(brick.w / 2, brick.h / 2 - 14)
      .lineTo(brick.w / 2, brick.h / 2 + 14)
      .stroke({ width: 4, color: 0xfff26b, alpha: 0.9 });
  }

  if (brick.type === "steel") {
    brick.skin.moveTo(13, 9)
      .lineTo(brick.w - 13, brick.h - 9)
      .moveTo(brick.w - 13, 9)
      .lineTo(13, brick.h - 9)
      .stroke({ width: 3, color: 0x263240, alpha: 0.4 });
  }

  if (brick.role === "widen" || brick.role === "shrink") {
    const roleColor = brick.role === "widen" ? 0x13dbff : 0xff4f78;
    brick.skin
      .roundRect(brick.w / 2 - 28, brick.h / 2 - 9, 56, 18, 9)
      .fill({ color: 0x06101a, alpha: 0.58 })
      .roundRect(brick.w / 2 - 28, brick.h / 2 - 9, 56, 18, 9)
      .stroke({ width: 2, color: roleColor, alpha: 0.95 })
      .roundRect(brick.w / 2 - 12, brick.h / 2 - 3, 24, 6, 3)
      .fill({ color: 0xffffff, alpha: 0.92 });

    if (brick.role === "widen") {
      brick.skin
        .moveTo(brick.w / 2 - 26, brick.h / 2)
        .lineTo(brick.w / 2 - 15, brick.h / 2 - 8)
        .moveTo(brick.w / 2 - 26, brick.h / 2)
        .lineTo(brick.w / 2 - 15, brick.h / 2 + 8)
        .moveTo(brick.w / 2 + 26, brick.h / 2)
        .lineTo(brick.w / 2 + 15, brick.h / 2 - 8)
        .moveTo(brick.w / 2 + 26, brick.h / 2)
        .lineTo(brick.w / 2 + 15, brick.h / 2 + 8)
        .stroke({ width: 3, color: roleColor, alpha: 0.95 });
    } else {
      brick.skin
        .moveTo(brick.w / 2 - 27, brick.h / 2)
        .lineTo(brick.w / 2 - 15, brick.h / 2)
        .lineTo(brick.w / 2 - 21, brick.h / 2 - 7)
        .moveTo(brick.w / 2 - 15, brick.h / 2)
        .lineTo(brick.w / 2 - 21, brick.h / 2 + 7)
        .moveTo(brick.w / 2 + 27, brick.h / 2)
        .lineTo(brick.w / 2 + 15, brick.h / 2)
        .lineTo(brick.w / 2 + 21, brick.h / 2 - 7)
        .moveTo(brick.w / 2 + 15, brick.h / 2)
        .lineTo(brick.w / 2 + 21, brick.h / 2 + 7)
        .stroke({ width: 3, color: roleColor, alpha: 0.95 });
    }
  }

  brick.hpText.text = brick.hp > 1 ? String(brick.hp) : "";
  brick.hpText.position.set(brick.w / 2, brick.h / 2 + 1);
}

function renderFlash(): void {
  flashGfx.clear();
  if (state.feverPulse > 0) {
    flashGfx
      .rect(8, 8, WORLD_W - 16, WORLD_H - 16)
      .stroke({ width: 5, color: currentLevel().tint, alpha: state.feverPulse * 0.32 })
      .rect(0, 0, WORLD_W, WORLD_H)
      .fill({ color: currentLevel().tint, alpha: state.feverPulse * 0.035 });
  }
  if (state.flash > 0) {
    flashGfx.rect(0, 0, WORLD_W, WORLD_H).fill({ color: 0xffffff, alpha: state.flash * 0.55 });
  }
}

function renderToast(): void {
  const visible = state.levelToast > 0;
  const alpha = visible ? Math.min(1, state.levelToast / 0.7) : 0;
  toastBox.alpha = alpha;
  toastTitle.alpha = alpha;
  toastHint.alpha = alpha;
  if (!visible) return;

  toastTitle.text = levelLabel();
  toastHint.text = levelHint(currentLevel());
  toastBox.clear()
    .roundRect(WORLD_W / 2 - 320, 398, 640, 98, 8)
    .fill({ color: 0x000000, alpha: 0.34 })
    .roundRect(WORLD_W / 2 - 320, 398, 640, 98, 8)
    .stroke({ width: 2, color: currentLevel().tint, alpha: 0.42 });
}

function renderPauseOverlay(): void {
  pauseScrim.clear();
  const visible = state.running && state.paused;
  pauseScrim.alpha = visible ? 1 : 0;
  pauseTitle.alpha = visible ? 1 : 0;
  pauseSub.alpha = visible ? 1 : 0;
  if (!visible) return;

  pauseScrim
    .rect(0, 0, WORLD_W, WORLD_H)
    .fill({ color: 0x000000, alpha: 0.68 })
    .roundRect(WORLD_W / 2 - 330, WORLD_H / 2 - 128, 660, 230, 10)
    .fill({ color: 0x020712, alpha: 0.88 })
    .roundRect(WORLD_W / 2 - 330, WORLD_H / 2 - 128, 660, 230, 10)
    .stroke({ width: 3, color: currentLevel().tint, alpha: 0.7 });
}

function burst(x: number, y: number, color: number, count: number, force: number): void {
  const pressure = particles.length / MAX_PARTICLES;
  const scale = pressure > 0.6 ? 0.4 : pressure > 0.35 ? 0.65 : 1;
  const available = Math.max(0, MAX_PARTICLES - particles.length);
  const amount = Math.min(Math.ceil(count * scale), available);
  for (let i = 0; i < amount; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(110, 620) * force;
    const size = rand(5, 14);
    const sprite = new Graphics()
      .circle(0, 0, size)
      .fill({ color, alpha: 0.95 })
      .circle(0, 0, size * 0.38)
      .fill({ color: 0xffffff, alpha: 0.75 });
    effectLayer.addChild(sprite);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.25, 0.78),
      maxLife: 0.78,
      size,
      color,
      sprite
    });
  }
}

function maybeBallTrail(ball: Ball): void {
  if (particles.length >= MAX_PARTICLES) return;
  const redTrail = ball.kind === "red" || ball.kamikaze > 0;
  const chance = redTrail
    ? balls.length > 30 ? 0.03 : balls.length > 15 ? 0.08 : 0.18
    : balls.length > 30 ? 0.006 : balls.length > 15 ? 0.018 : 0.05;
  if (Math.random() > chance) return;
  const color = ball.hero ? 0xffffff : ballProfiles[ball.kind].color;
  const size = redTrail ? rand(5, 10) : ball.hero ? rand(5, 9) : rand(3, 7);
  const sprite = new Graphics();
  let px = ball.x - ball.vx * 0.018;
  let py = ball.y - ball.vy * 0.018;
  if (redTrail) {
    const sx = ball.prevX;
    const sy = ball.prevY;
    const ex = ball.x - ball.vx * 0.026;
    const ey = ball.y - ball.vy * 0.026;
    px = (sx + ex) / 2;
    py = (sy + ey) / 2;
    sprite
      .moveTo(sx - px, sy - py)
      .lineTo(ex - px, ey - py)
      .stroke({ width: ball.kamikaze > 0 ? 7 : 5, color, alpha: ball.kamikaze > 0 ? 0.48 : 0.36 })
      .circle(ex - px, ey - py, size * 0.45)
      .fill({ color, alpha: 0.24 });
  } else {
    sprite
      .circle(0, 0, size)
      .fill({ color, alpha: ball.hero ? 0.5 : 0.34 });
  }
  effectLayer.addChild(sprite);
  particles.push({
    x: px,
    y: py,
    vx: redTrail ? 0 : -ball.vx * 0.015,
    vy: redTrail ? 0 : -ball.vy * 0.015,
    life: redTrail ? 0.42 : ball.hero ? 0.34 : 0.22,
    maxLife: redTrail ? 0.42 : ball.hero ? 0.34 : 0.22,
    size,
    color,
    sprite
  });
}

function shockwave(x: number, y: number, color: number, radius: number): void {
  if (shockRings.length > MAX_SHOCK_RINGS) return;
  const gfx = new Graphics();
  effectLayer.addChild(gfx);
  shockRings.push({ x, y, radius, color, life: 0.38, maxLife: 0.38, gfx });
}

function popText(x: number, y: number, label: string, color: number): void {
  if (floatTexts.length > MAX_FLOAT_TEXTS) return;
  if (!label || !color) return;
  const text = new Text({
    text: label,
    style: {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: label.length > 4 ? 18 : 22,
      fontWeight: "900",
      fill: color,
      stroke: { color: 0x05070f, width: 4 }
    }
  });
  text.anchor.set(0.5);
  text.position.set(x, y);
  effectLayer.addChild(text);
  floatTexts.push({ x, y, vy: -72, life: 0.72, maxLife: 0.72, text });
}

function brickColor(type: BrickType): number {
  return {
    cyan: 0x13dbff,
    magenta: 0xff35d8,
    amber: 0xffbf21,
    green: 0x7cff26,
    steel: 0xf2f5ff,
    bomb: 0xff3838
  }[type];
}

function levelHint(level: LevelConfig): string {
  const layout = currentArcadeLayout();
  const motionLabel: Record<MotionStyle, string> = {
    still: "static",
    current: "currents bend bricks",
    breath: "bricks breathe in and out",
    lanes: "lanes shift side to side",
    orbit: "bricks orbit the center",
    gates: "gates open and close",
    storm: "storm bands sweep bricks"
  };
  return `${layout.name}: ${layout.hint}${level.motion !== "still" ? `. ${motionLabel[level.motion]}.` : ""}`;
}

function objectiveShortLabel(objective: ObjectiveState): string {
  if (objective.id === "core") return "Core";
  if (objective.id === "combo") return "Combo";
  return "Perfect";
}

function updateHud(): void {
  scoreEl.textContent = Math.floor(state.score).toLocaleString();
  comboEl.textContent = `x${state.combo}`;
  comboFillEl.style.transform = `scaleX(${state.combo > 1 ? clamp(state.comboClock / 1.85, 0, 1) : 0})`;
  ballsEl.textContent = String(balls.length);
  livesEl.textContent = String(state.lives);
  levelEl.textContent = levelLabel();
  if (state.objective) {
    const suffix = state.objective.complete
      ? "done"
      : state.objective.failed
        ? "missed"
        : `${Math.floor(state.objective.progress)}/${state.objective.target} ${Math.ceil(objectiveTimeRemaining())}s`;
    const banked = state.bankedPowerChoices > 0 ? ` +${state.bankedPowerChoices}P` : "";
    objectiveEl.textContent = `${objectiveShortLabel(state.objective)} ${suffix}${banked}`;
    const progress = state.objective.complete ? 1 : clamp(state.objective.progress / Math.max(1, state.objective.target), 0, 1);
    objectiveFillEl.style.transform = `scaleX(${progress})`;
  } else {
    objectiveEl.textContent = "-";
    objectiveFillEl.style.transform = "scaleX(0)";
  }
}

function ensureAudio(): void {
  if (state.audio) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  state.audio = new AudioCtor();

  const compressor = state.audio.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 18;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.16;
  compressor.connect(state.audio.destination);
  audioOutput = compressor;
}

function beep(freq: number, dur = 0.035, type: OscillatorType = "sine", gain = 0.035): void {
  if (state.muted || !state.audio || !audioOutput) return;
  const now = performance.now();
  if (now - audioWindowStart > 120) {
    audioWindowStart = now;
    audioWindowVoices = 0;
  }

  const voiceCap = balls.length > 45 ? 1 : balls.length > 25 ? 2 : balls.length > 12 ? 3 : 6;
  if (audioWindowVoices >= voiceCap) return;
  audioWindowVoices += 1;

  const crowdMix = balls.length > 45 ? 0.18 : balls.length > 25 ? 0.3 : balls.length > 12 ? 0.48 : 0.82;
  const t = state.audio.currentTime;
  const osc = state.audio.createOscillator();
  const vol = state.audio.createGain();
  osc.type = type;
  const safeFreq = clamp(freq, 42, 2800);
  const safeGain = Math.min(gain, balls.length > 25 ? 0.022 : 0.04);
  osc.frequency.setValueAtTime(safeFreq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, Math.min(3200, safeFreq * 1.45)), t + dur);
  vol.gain.setValueAtTime(safeGain * crowdMix, t);
  vol.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(vol);
  vol.connect(audioOutput);
  osc.start(t);
  osc.stop(t + dur);
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function updateChomperWarning(dt: number): void {
  if (state.chomperWarningTimer > 0) state.chomperWarningTimer -= dt;
}

function renderEffectStrip(): void {
  effectStripGfx.clear();
  effectStripLayer.removeChildren();
  const effects: Array<{ label: string; color: number; remaining: number; max: number }> = [];
  if (state.pierce > 0) effects.push({ label: "PHASE", color: 0xb891ff, remaining: state.pierce, max: 9 });
  if (state.timeWarp > 0) effects.push({ label: "TIME", color: 0x83f7ff, remaining: state.timeWarp, max: 15 });
  if (state.goldRush > 0) effects.push({ label: "GOLD", color: 0xffc83d, remaining: state.goldRush, max: 14 });
  if (state.overcharge > 0) effects.push({ label: "OVER", color: 0xff4f78, remaining: state.overcharge, max: 9 });
  if (state.redStorm > 0) effects.push({ label: "RED", color: 0xff3f3f, remaining: state.redStorm, max: 8 });
  if (state.autoLaser > 0) effects.push({ label: "AUTO", color: 0xfff26b, remaining: state.autoLaser, max: 4 });
  if (state.slowField > 0) effects.push({ label: "SLOW", color: 0x58e7ff, remaining: state.slowField, max: 7 });
  if (paddle.widen > 0) effects.push({ label: "WIDE", color: 0x13dbff, remaining: paddle.widen, max: 20 });
  if (paddle.shrink > 0) effects.push({ label: "TIGHT", color: 0xff4f78, remaining: paddle.shrink, max: 20 });
  if (state.mercyBudget > 0) effects.push({ label: `MERCY ${state.mercyBudget}/${state.maxMercyPerLife}`, color: 0xffd84a, remaining: 1, max: 1 });
  if (effects.length === 0) return;

  const barW = 72;
  const startX = WORLD_W - 60 - effects.length * 90;
  const startY = 42;
  for (let i = 0; i < effects.length; i++) {
    const fx = effects[i];
    const x = startX + i * 90;
    const y = startY;
    const fill = fx.max > 1 ? clamp(fx.remaining / fx.max, 0, 1) : 1;
    effectStripGfx
      .roundRect(x, y, barW, 28, 5)
      .fill({ color: fx.color, alpha: 0.22 })
      .roundRect(x, y, barW * fill, 28, 5)
      .fill({ color: fx.color, alpha: 0.55 })
      .roundRect(x, y, barW, 28, 5)
      .stroke({ width: 1, color: fx.color, alpha: 0.7 });
    const label = new Text({
      text: fx.label,
      style: { fontFamily: "Inter, Arial, sans-serif", fontSize: 11, fontWeight: "800", fill: 0xffffff }
    });
    label.anchor.set(0.5);
    label.position.set(x + barW / 2, y + 14);
    effectStripLayer.addChild(label);
  }
}

function renderChomperWarning(): void {
  chomperWarningGfx.clear();
  if (state.chomperWarningTimer <= 0) return;
  const a = clamp(state.chomperWarningTimer / 0.5, 0, 1);
  const side = state.chomperWarningSide;
  const x = side < 0 ? WALL + 20 : WORLD_W - WALL - 20;
  chomperWarningGfx
    .circle(x, WORLD_H * 0.3, 18 + (1 - a) * 12)
    .fill({ color: 0xffd84a, alpha: a * 0.4 })
    .circle(x, WORLD_H * 0.3, 10)
    .fill({ color: 0xffd84a, alpha: a * 0.8 });
}

function renderPauseUpgrades(): void {
  pauseUpgradeGfx.clear();
  pauseUpgradeLayer.removeChildren();
  if (!state.running || !state.paused || state.waitingChoice) return;
  const upgrades = (Object.entries(state.runUpgrades) as [UpgradeId, number][])
    .filter(([, tier]) => tier > 0);
  if (upgrades.length === 0) return;
  const startY = WORLD_H / 2 + 82;
  const startX = WORLD_W / 2 - (upgrades.length * 85) / 2;
  for (let i = 0; i < upgrades.length; i++) {
    const [id, tier] = upgrades[i];
    const safeTier = clampUpgradeTier(tier);
    const color = upgradeTierColor(safeTier);
    const x = startX + i * 85;
    const option = upgradeOptions.find((o) => o.id === id);
    pauseUpgradeGfx
      .roundRect(x, startY, 78, 42, 6)
      .fill({ color, alpha: 0.18 })
      .roundRect(x, startY, 78, 42, 6)
      .stroke({ width: 1, color, alpha: 0.5 });
    const name = new Text({
      text: option?.title ?? id,
      style: { fontFamily: "Inter, Arial, sans-serif", fontSize: 11, fontWeight: "800", fill: color }
    });
    name.anchor.set(0.5);
    name.position.set(x + 39, startY + 13);
    pauseUpgradeLayer.addChild(name);
    const tierLabel = new Text({
      text: upgradeTierBadge(safeTier),
      style: { fontFamily: "Inter, Arial, sans-serif", fontSize: 9, fontWeight: "700", fill: 0xffffff }
    });
    tierLabel.anchor.set(0.5);
    tierLabel.position.set(x + 39, startY + 30);
    pauseUpgradeLayer.addChild(tierLabel);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addShake(amount: number): void {
  const cap = balls.length > 35 ? 5.5 : balls.length > 18 ? 7 : 10;
  state.shake = Math.min(cap, Math.max(state.shake, amount));
}

function limitBall(ball: Ball, minSpeed: number, maxSpeed: number): void {
  const mag = Math.hypot(ball.vx, ball.vy) || 1;
  const speed = clamp(mag, minSpeed, maxSpeed);
  ball.vx = ball.vx / mag * speed;
  ball.vy = ball.vy / mag * speed;

  if (Math.abs(ball.vy) < speed * 0.13) {
    ball.vy = Math.sign(ball.vy || -1) * speed * 0.13;
    ball.vx = Math.sign(ball.vx || 1) * Math.sqrt(Math.max(0, speed * speed - ball.vy * ball.vy));
  }
}

function pointerToWorld(event: PointerEvent): number {
  const rect = canvas.getBoundingClientRect();
  return (event.clientX - rect.left) / rect.width * WORLD_W;
}

function resizeRenderer(): void {
  app.renderer.resize(WORLD_W, WORLD_H);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  root.scale.set(1);
}

canvas.addEventListener("pointermove", (event) => {
  state.pointerX = pointerToWorld(event);
});

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  state.pointerX = pointerToWorld(event);
  if (!state.running) startGame();
  else launch();
});

window.addEventListener("keydown", (event) => {
  state.keys.add(event.key);
  if (event.key === " ") {
    event.preventDefault();
    launch();
  }
  if (event.key.toLowerCase() === "p") togglePause();
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key);
});

window.addEventListener("resize", () => {
  resizeRenderer();
});

muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  muteBtn.textContent = state.muted ? "Sound Off" : "Sound On";
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
launchBtn.addEventListener("click", launch);

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

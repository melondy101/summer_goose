import { RECIPES, RECIPE_ORDER, WISH_ORDER } from "./recipes";
import { HAND_LIMIT, SAVE_KEY, SAVE_SCHEMA_VERSION, TOTAL_PICKS } from "./rules";
import type {
  ActivityType,
  GameEvent,
  GameState,
  HandCard,
  NotedFork,
  Phase,
  RecipeId,
  Souvenir,
  Speech,
  WishId,
} from "./types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const ACTIVITY_TYPES: ActivityType[] = [
  "research",
  "tinker",
  "flap",
  "stroll",
  "record",
  "share",
];

const PHASES: Phase[] = ["picking", "replacing", "finalTidy", "settled"];

const SPEECH_KINDS_WITH_RECIPE = new Set(["firstSouvenir", "newStamp", "recraft"]);
const SPEECH_KINDS = new Set([
  "opening",
  "firstSouvenir",
  "newStamp",
  "recraft",
  "bagFull",
  "discard",
  "lastTidy",
  "endingAll",
  "endingPartial",
  "endingEmpty",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecipeId(value: unknown): value is RecipeId {
  return typeof value === "string" && RECIPE_ORDER.includes(value as RecipeId);
}

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && ACTIVITY_TYPES.includes(value as ActivityType);
}

function isPhase(value: unknown): value is Phase {
  return typeof value === "string" && PHASES.includes(value as Phase);
}

function isCard(value: unknown): value is HandCard {
  return isRecord(value) && typeof value.id === "string" && isActivityType(value.type);
}

function isSouvenir(value: unknown): value is Souvenir {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isRecipeId(value.recipeId) &&
    typeof value.craftedAtTurn === "number"
  );
}

function isEvent(value: unknown): value is GameEvent {
  if (!isRecord(value) || typeof value.turn !== "number") return false;
  if (value.kind === "craft") return isRecipeId(value.recipeId);
  return (value.kind === "pick" || value.kind === "discard") && isActivityType(value.type);
}

function parseSpeech(value: unknown): Speech | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  if (typeof kind !== "string" || !SPEECH_KINDS.has(kind)) return null;
  if (SPEECH_KINDS_WITH_RECIPE.has(kind)) {
    const recipeId = value.recipeId;
    if (typeof recipeId !== "string" || !RECIPE_ORDER.includes(recipeId as never)) return null;
    return { kind, recipeId } as Speech;
  }
  return { kind } as Speech;
}

function parseNotedFork(value: unknown): NotedFork | null {
  if (!isRecord(value)) return null;
  const { craftRecipeId, otherRecipeId, materials } = value;
  if (!isRecipeId(craftRecipeId) || !isRecipeId(otherRecipeId)) return null;
  if (craftRecipeId === otherRecipeId) return null;
  if (RECIPES[craftRecipeId].wish === RECIPES[otherRecipeId].wish) return null;
  if (!Array.isArray(materials) || materials.length === 0) return null;
  if (!materials.every(isActivityType)) return null;
  return { craftRecipeId, otherRecipeId, materials };
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * 旧版本存档的升级步骤。v1 → v2：旧局没有种子字段，补空串，
 * 表示「续玩可以，但这一局生成不了挑战链接」。
 */
const MIGRATIONS: Record<number, Migration> = {
  1: (raw) => ({ ...raw, runSeed: "" }),
};

/** 把旧版本存档逐步升到当前版本；版本号非法或来自更新的版本时返回 null。 */
export function migrateSave(raw: Record<string, unknown>): Record<string, unknown> | null {
  let version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) return null;
  if (version < 1 || version > SAVE_SCHEMA_VERSION) return null;
  let current = raw;
  while (version < SAVE_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = step(current);
    version += 1;
  }
  current.schemaVersion = SAVE_SCHEMA_VERSION;
  return current;
}

/** 校验并恢复存档；核心对局字段无法通过校验时返回 null。 */
export function parseSave(raw: unknown): GameState | null {
  if (!isRecord(raw)) return null;
  const migrated = migrateSave(raw);
  if (!migrated) return null;

  const runSeed = migrated.runSeed;
  if (typeof runSeed !== "string" || runSeed.length > 64) return null;

  const runId = migrated.runId;
  const turn = migrated.turn;
  const phase = migrated.phase;
  if (typeof runId !== "string" || runId.length === 0) return null;
  if (typeof turn !== "number" || !Number.isInteger(turn) || turn < 0 || turn > TOTAL_PICKS) {
    return null;
  }
  if (!isPhase(phase)) return null;

  const candidates = migrated.candidates;
  const hand = migrated.hand;
  const souvenirs = migrated.souvenirs;
  const events = migrated.events;
  if (!Array.isArray(candidates) || !candidates.every(isCard)) return null;
  if (!Array.isArray(hand) || !hand.every(isCard)) return null;
  if (!Array.isArray(souvenirs) || !souvenirs.every(isSouvenir)) return null;
  if (!Array.isArray(events) || !events.every(isEvent)) return null;
  if (hand.length > HAND_LIMIT) return null;

  const ids = [...candidates, ...hand].map((card) => card.id);
  if (new Set(ids).size !== ids.length) return null;
  const souvenirIds = souvenirs.map((souvenir) => souvenir.id);
  if (new Set(souvenirIds).size !== souvenirIds.length) return null;

  let pendingCard: HandCard | null = null;
  if (migrated.pendingCard !== null && migrated.pendingCard !== undefined) {
    if (!isCard(migrated.pendingCard)) return null;
    pendingCard = migrated.pendingCard;
  }
  if (phase === "replacing" && !pendingCard) return null;
  if (phase !== "replacing" && pendingCard) return null;

  if (phase === "finalTidy" && turn !== TOTAL_PICKS) return null;
  if (phase === "picking" && turn >= TOTAL_PICKS) return null;
  if (phase === "picking" && candidates.length !== 3) return null;
  if (phase === "finalTidy" && candidates.length !== 0) return null;

  let ending: GameState["ending"] = null;
  if (migrated.ending !== null && migrated.ending !== undefined) {
    if (!isRecord(migrated.ending)) return null;
    const kind = migrated.ending.kind;
    if (kind !== "all" && kind !== "partial" && kind !== "empty") return null;
    const missing = migrated.ending.missingWishes;
    if (!Array.isArray(missing) || !missing.every((w) => WISH_ORDER.includes(w as never))) {
      return null;
    }
    ending = { kind, missingWishes: missing as WishId[] };
  }
  if (phase === "settled" && !ending) return null;
  if (phase !== "settled" && ending) return null;

  const speech = parseSpeech(migrated.speech);
  const bagFullAnnounced = migrated.bagFullAnnounced === true;
  const notedFork = parseNotedFork(migrated.notedFork);

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    runSeed,
    runId,
    turn,
    phase,
    candidates: candidates as HandCard[],
    hand: hand as HandCard[],
    pendingCard,
    souvenirs: souvenirs as Souvenir[],
    events: events as GameEvent[],
    ending: ending as GameState["ending"],
    speech,
    bagFullAnnounced,
    notedFork,
  };
}

export function saveAvailable(storage: StorageLike | undefined | null): boolean {
  if (!storage) return false;
  try {
    const probe = `${SAVE_KEY}.probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function saveState(storage: StorageLike | undefined | null, state: GameState): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时降级为本次页面内游玩
  }
}

export function loadSave(storage: StorageLike | undefined | null): GameState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return parseSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * 是否存在「有原始存档但无法通过校验」的损坏存档。
 * 设计第 3 节要求此时提示开启新局，不能静默卡死，也不能静默丢弃进度。
 */
export function hasCorruptSave(storage: StorageLike | undefined | null): boolean {
  if (!storage) return false;
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  return loadSave(storage) === null;
}

export function clearSave(storage: StorageLike | undefined | null): void {  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // 忽略
  }
}

export function browserStorage(): StorageLike | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
}

/**
 * 这一局是否值得「继续」。全新未动过的第 1 天上午不算有进度，
 * 否则开始页会把刚开始的游戏误判成待恢复的存档。
 */
export function isResumable(state: GameState | null): boolean {
  if (!state) return false;
  return state.turn > 0 || state.souvenirs.length > 0 || state.phase !== "picking";
}
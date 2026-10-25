import {
  ACTIVITY_ORDER,
  RECIPES,
  RECIPE_ORDER,
  WISH_ORDER,
  wishOfRecipe,
} from "./recipes";
import { seededRandom } from "./random";
import type {
  Action,
  ActivityType,
  GameEvent,
  GameState,
  HandCard,
  KeyedRandom,
  NotedFork,
  RecipeId,
  RulesContext,
  Speech,
  Souvenir,
  WishId,
} from "./types";

export {
  ACTIVITY_LABELS,
  ACTIVITY_LINES,
  ACTIVITY_ORDER,
  RECIPES,
  RECIPE_ORDER,
  WISH_LABELS,
  WISH_ORDER,
  recipeName,
  wishOfRecipe,
} from "./recipes";
export type { Recipe } from "./recipes";
export type * from "./types";

export const SAVE_SCHEMA_VERSION = 2;
export const HAND_LIMIT = 6;
export const TOTAL_PICKS = 14;
export const SAVE_KEY = "summer.save.v1";

/** 常驻操作提示 */
export const RESIDENT_HINT = "每次选一张，凑齐三张做展品；七天里，试着点亮三种展签。";
/** 规则说明里的固定材料例子 */
export const FORK_EXAMPLE =
  "布袋里有扑腾、溜达、记录时，可以做《风的迟到记录》。做了的话，扑腾和记录会用掉，《绕树远征纪念章》也要用到。";

export { hashRandom } from "./random";
export type { KeyedRandom } from "./types";

function makeRunId(random: KeyedRandom, key: string): string {
  const a = Math.floor(random(`${key}:a`) * 0xffffffff);
  const b = Math.floor(random(`${key}:b`) * 0xffffffff);
  return `r${a.toString(36)}${b.toString(36)}`;
}

/** 新一局的种子：从当前源派生，重开会换一副新牌，但同起点必然得到同种子。 */
function makeRunSeed(random: KeyedRandom, key: string): string {
  const a = Math.floor(random(`${key}:a`) * 0xffffffff);
  const b = Math.floor(random(`${key}:b`) * 0xffffffff);
  return `${a.toString(36)}${b.toString(36)}`.slice(0, 12);
}

/**
 * 本局自己的随机源：种子化后候选只依赖 (runSeed, runId, turn)，
 * 刷新续玩、重开、好友打开挑战链接三条路径拿到的候选完全一致。
 */
function randomOf(state: GameState, ctx: RulesContext): KeyedRandom {
  return state.runSeed ? seededRandom(state.runSeed) : ctx.random;
}

function drawCandidates(runId: string, turn: number, random: KeyedRandom): HandCard[] {
  const pool = [...ACTIVITY_ORDER];
  const picked: ActivityType[] = [];
  for (let i = 0; i < 3; i += 1) {
    const index = Math.floor(random(`${runId}:t${turn}:cand:${i}`) * pool.length);
    picked.push(pool.splice(Math.min(index, pool.length - 1), 1)[0]);
  }
  return picked.map((type, i) => ({ id: `${runId}-t${turn}-c${i}`, type }));
}

function countByType(hand: HandCard[]): Record<ActivityType, number> {
  const counts = {} as Record<ActivityType, number>;
  for (const type of ACTIVITY_ORDER) counts[type] = 0;
  for (const card of hand) counts[card.type] += 1;
  return counts;
}

export function canCraft(hand: HandCard[], recipeId: RecipeId): boolean {
  const counts = countByType(hand);
  const cost = RECIPES[recipeId].cost;
  return ACTIVITY_ORDER.every((type) => counts[type] >= (cost[type] ?? 0));
}

export function craftableRecipes(hand: HandCard[]): RecipeId[] {
  return RECIPE_ORDER.filter((id) => canCraft(hand, id));
}

function consume(
  hand: HandCard[],
  recipeId: RecipeId,
): { hand: HandCard[]; consumed: HandCard[] } {
  const rest = [...hand];
  const consumed: HandCard[] = [];
  const cost = RECIPES[recipeId].cost;
  for (const type of ACTIVITY_ORDER) {
    const need = cost[type] ?? 0;
    for (let i = 0; i < need; i += 1) {
      const index = rest.findIndex((card) => card.type === type);
      if (index >= 0) consumed.push(rest.splice(index, 1)[0]);
    }
  }
  return { hand: rest, consumed };
}

export function litWishes(souvenirs: Souvenir[]): WishId[] {
  const lit = new Set<WishId>();
  for (const souvenir of souvenirs) lit.add(wishOfRecipe(souvenir.recipeId));
  return WISH_ORDER.filter((wish) => lit.has(wish));
}

export function missingWishes(souvenirs: Souvenir[]): WishId[] {
  const lit = litWishes(souvenirs);
  return WISH_ORDER.filter((wish) => !lit.includes(wish));
}

/** 按配方顺序找出第一对跨展签的材料冲突；没有则返回 null。 */
export function findFork(state: GameState): NotedFork | null {
  const lit = litWishes(state.souvenirs);
  for (const craftId of RECIPE_ORDER) {
    if (!canCraft(state.hand, craftId)) continue;
    const counts = countByType(state.hand);
    const cost = RECIPES[craftId].cost;
    const remaining = {} as Record<ActivityType, number>;
    for (const type of ACTIVITY_ORDER) {
      remaining[type] = counts[type] - (cost[type] ?? 0);
    }
    for (const otherId of RECIPE_ORDER) {
      if (otherId === craftId) continue;
      const other = RECIPES[otherId];
      if (other.wish === RECIPES[craftId].wish) continue;
      if (lit.includes(other.wish)) continue;
      const materials = ACTIVITY_ORDER.filter(
        (type) => (cost[type] ?? 0) > 0 && remaining[type] < (other.cost[type] ?? 0),
      );
      if (materials.length > 0) {
        return { craftRecipeId: craftId, otherRecipeId: otherId, materials };
      }
    }
  }
  return null;
}

export interface ForkReminder {
  craftRecipeId: RecipeId;
  otherRecipeId: RecipeId;
  materials: ActivityType[];
}
/** 记下的一对是否仍然成立；材料按当前手牌重算。替换阶段合成暂停，这句先隐藏。 */
export function forkReminder(state: GameState): ForkReminder | null {
  const fork = state.notedFork;
  if (!fork) return null;
  if (state.phase === "replacing") return null;
  const craftId = fork.craftRecipeId;
  const otherId = fork.otherRecipeId;
  if (!RECIPES[craftId] || !RECIPES[otherId]) return null;
  if (craftId === otherId) return null;
  if (RECIPES[craftId].wish === RECIPES[otherId].wish) return null;
  if (litWishes(state.souvenirs).includes(RECIPES[otherId].wish)) return null;
  if (!canCraft(state.hand, craftId)) return null;
  const counts = countByType(state.hand);
  const cost = RECIPES[craftId].cost;
  const other = RECIPES[otherId];
  const materials = ACTIVITY_ORDER.filter((type) => {
    const used = cost[type] ?? 0;
    if (used <= 0) return false;
    return counts[type] - used < (other.cost[type] ?? 0);
  });
  if (materials.length === 0) return null;
  return { craftRecipeId: craftId, otherRecipeId: otherId, materials };
}

export function createInitialState(ctx: RulesContext, seedKey = "init"): GameState {
  const source = ctx.seed ? seededRandom(ctx.seed) : ctx.random;
  const runId = makeRunId(source, seedKey);
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    runSeed: ctx.seed ?? "",
    runId,
    turn: 0,
    phase: "picking",
    candidates: drawCandidates(runId, 0, source),
    hand: [],
    pendingCard: null,
    souvenirs: [],
    events: [],
    ending: null,
    speech: { kind: "opening" },
    bagFullAnnounced: false,
    notedFork: null,
  };
}

function afterPick(state: GameState, turn: number, ctx: RulesContext): GameState {
  const lastTurn = turn >= TOTAL_PICKS;
  const next: GameState = {
    ...state,
    turn,
    phase: lastTurn ? "finalTidy" : "picking",
    candidates: lastTurn ? [] : drawCandidates(state.runId, turn, randomOf(state, ctx)),
    pendingCard: null,
  };
  return { ...next, notedFork: next.notedFork ?? findFork(next) };
}

function pickCard(state: GameState, cardId: string, ctx: RulesContext): GameState {
  if (state.phase !== "picking") return state;
  const card = state.candidates.find((item) => item.id === cardId);
  if (!card) return state;

  if (state.hand.length >= HAND_LIMIT) {
    return {
      ...state,
      phase: "replacing",
      pendingCard: card,
      speech: null,
    };
  }

  const hand = [...state.hand, card];
  const turn = state.turn + 1;
  const bagJustFilled = state.hand.length < HAND_LIMIT && hand.length === HAND_LIMIT;
  const lastTurn = turn >= TOTAL_PICKS;
  const events: GameEvent[] = [...state.events, { turn: state.turn, kind: "pick", type: card.type }];

  let speech: Speech | null = null;
  if (lastTurn) speech = { kind: "lastTidy" };
  else if (bagJustFilled && !state.bagFullAnnounced) speech = { kind: "bagFull" };

  const committed: GameState = {
    ...state,
    turn,
    hand,
    events,
    speech,
    bagFullAnnounced: state.bagFullAnnounced || bagJustFilled,
  };
  return afterPick(committed, turn, ctx);
}

function replaceCard(state: GameState, cardId: string, ctx: RulesContext): GameState {
  if (state.phase !== "replacing" || !state.pendingCard) return state;
  const old = state.hand.find((card) => card.id === cardId);
  if (!old) return state;

  const pending = state.pendingCard;
  const hand = state.hand.filter((card) => card.id !== cardId);
  hand.push(pending);
  const turn = state.turn + 1;
  const lastTurn = turn >= TOTAL_PICKS;
  const events: GameEvent[] = [
    ...state.events,
    { turn: state.turn, kind: "pick", type: pending.type },
    { turn: state.turn, kind: "discard", type: old.type },
  ];
  const speech: Speech | null = lastTurn ? { kind: "lastTidy" } : { kind: "discard" };

  const committed: GameState = { ...state, turn, hand, events, speech };
  return afterPick(committed, turn, ctx);
}

function cancelReplace(state: GameState): GameState {
  if (state.phase !== "replacing") return state;
  return { ...state, phase: "picking", pendingCard: null };
}

function craft(state: GameState, recipeId: RecipeId): GameState {
  if (state.phase !== "picking" && state.phase !== "finalTidy") return state;
  if (!RECIPES[recipeId]) return state;
  if (!canCraft(state.hand, recipeId)) return state;

  const wish = wishOfRecipe(recipeId);
  const firstSouvenir = state.souvenirs.length === 0;
  const lightsNew = !litWishes(state.souvenirs).includes(wish);

  let speech: Speech;
  if (firstSouvenir) speech = { kind: "firstSouvenir", recipeId };
  else if (lightsNew) speech = { kind: "newStamp", recipeId };
  else speech = { kind: "recraft", recipeId };

  const { hand } = consume(state.hand, recipeId);
  const events: GameEvent[] = [
    ...state.events,
    { turn: state.turn, kind: "craft", recipeId },
  ];

  return { ...state, hand, souvenirs: [...state.souvenirs, souvenirOf(state, recipeId)], events, speech };
}

function souvenirOf(state: GameState, recipeId: RecipeId): Souvenir {
  return {
    id: `${state.runId}-s${state.souvenirs.length}`,
    recipeId,
    craftedAtTurn: state.turn,
  };
}

function finish(state: GameState): GameState {
  if (state.phase !== "finalTidy") return state;
  const missing = missingWishes(state.souvenirs);
  const kind = missing.length === 0 ? "all" : missing.length === WISH_ORDER.length ? "empty" : "partial";
  const speech: Speech =
    kind === "all"
      ? { kind: "endingAll" }
      : kind === "empty"
        ? { kind: "endingEmpty" }
        : { kind: "endingPartial" };
  return { ...state, phase: "settled", ending: { kind, missingWishes: missing }, speech };
}

export function reduce(state: GameState, action: Action, ctx: RulesContext): GameState {
  switch (action.kind) {
    case "PICK_CARD":
      return pickCard(state, action.cardId, ctx);
    case "REPLACE_CARD":
      return replaceCard(state, action.cardId, ctx);
    case "CANCEL_REPLACE":
      return cancelReplace(state);
    case "CRAFT":
      return craft(state, action.recipeId);
    case "FINISH":
      return finish(state);
    case "RESTART": {
      // 从当前源派生下一局种子：重开换新牌，同起点的两位玩家重开也一致
      const nextSeed = makeRunSeed(
        ctx.random,
        `next:${state.runSeed}:${state.runId}:${state.turn}`,
      );
      return createInitialState({ random: ctx.random, seed: nextSeed }, "init");
    }
    default:
      return state;
  }
}

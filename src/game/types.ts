export type ActivityType = "research" | "tinker" | "flap" | "stroll" | "record" | "share";

export type WishId = "create" | "body" | "echo";

export type RecipeId = "tool" | "training" | "essay" | "demo" | "evening";

export type Phase = "picking" | "replacing" | "finalTidy" | "settled";

export type EndingKind = "all" | "partial" | "empty";

export interface HandCard {
  id: string;
  type: ActivityType;
}

export interface Souvenir {
  id: string;
  recipeId: RecipeId;
  craftedAtTurn: number;
}

export type GameEvent =
  | { turn: number; kind: "pick"; type: ActivityType }
  | { turn: number; kind: "discard"; type: ActivityType }
  | { turn: number; kind: "craft"; recipeId: RecipeId };

export type Speech =
  | { kind: "opening" }
  | { kind: "firstSouvenir"; recipeId: RecipeId }
  | { kind: "newStamp"; recipeId: RecipeId }
  | { kind: "recraft"; recipeId: RecipeId }
  | { kind: "bagFull" }
  | { kind: "discard" }
  | { kind: "lastTidy" }
  | { kind: "endingAll" }
  | { kind: "endingPartial" }
  | { kind: "endingEmpty" };

export interface NotedFork {
  craftRecipeId: RecipeId;
  otherRecipeId: RecipeId;
  materials: ActivityType[];
}

export interface Ending {
  kind: EndingKind;
  missingWishes: WishId[];
}

export interface GameState {
  schemaVersion: number;
  /** 本局随机种子；同一种子整局候选可复现，空串表示旧版本存档续玩的局 */
  runSeed: string;
  runId: string;
  /** 已完成的选牌次数，0–14 */
  turn: number;
  phase: Phase;
  candidates: HandCard[];
  hand: HandCard[];
  pendingCard: HandCard | null;
  souvenirs: Souvenir[];
  events: GameEvent[];
  ending: Ending | null;
  speech: Speech | null;
  bagFullAnnounced: boolean;
  notedFork: NotedFork | null;
}

export type Action =
  | { kind: "PICK_CARD"; cardId: string }
  | { kind: "REPLACE_CARD"; cardId: string }
  | { kind: "CANCEL_REPLACE" }
  | { kind: "CRAFT"; recipeId: RecipeId }
  | { kind: "FINISH" }
  | { kind: "RESTART" };

/** 以稳定键为种子的随机源，保证同一键永远得到同一张牌。 */
export type KeyedRandom = (key: string) => number;

export interface RulesContext {
  random: KeyedRandom;
  /** 新局的种子；缺省时按无种子源创建（旧测试与旧存档续玩路径） */
  seed?: string;
}

import { describe, expect, it } from "vitest";
import {
  ACTIVITY_ORDER,
  RECIPE_ORDER,
  createInitialState,
  hashRandom,
  reduce,
  type ActivityType,
  type GameState,
  type KeyedRandom,
  type RecipeId,
} from "./rules";

function fixedRandom(value: number): KeyedRandom {
  return () => value;
}

function ctx(random: KeyedRandom = hashRandom) {
  return { random };
}

function freshState(): GameState {
  return createInitialState(ctx());
}

function withHand(state: GameState, types: ActivityType[]): GameState {
  return {
    ...state,
    hand: types.map((type, index) => ({ id: `fixed-${index}-${type}`, type })),
  };
}

function pickFirst(state: GameState): GameState {
  return reduce(state, { kind: "PICK_CARD", cardId: state.candidates[0].id }, ctx());
}

describe("回合推进", () => {
  it("初始状态是第 1 天上午，尚未选牌", () => {
    const state = freshState();
    expect(state.turn).toBe(0);
    expect(state.phase).toBe("picking");
    expect(state.hand).toEqual([]);
    expect(state.speech).toEqual({ kind: "opening" });
  });

  it("每次选牌精确推进一次", () => {
    let state = freshState();
    for (let i = 1; i <= 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
      expect(state.turn).toBe(i);
    }
    expect(state.phase).toBe("finalTidy");
  });

  it("第 14 次选牌后进入最后整理并不再发牌", () => {
    let state = freshState();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    expect(state.phase).toBe("finalTidy");
    expect(state.candidates).toEqual([]);
  });

  it("候选每组三张且类型互不重复", () => {
    let state = freshState();
    for (let i = 0; i < 30; i += 1) {
      const types = state.candidates.map((card) => card.type);
      expect(state.candidates).toHaveLength(3);
      expect(new Set(types).size).toBe(3);
      for (const type of types) {
        expect(ACTIVITY_ORDER).toContain(type);
      }
      state = pickFirst(state);
      if (state.phase !== "picking") break;
    }
  });

  it("同一种子下同一回合得到同一组牌", () => {
    const a = createInitialState(ctx(fixedRandom(0.31)));
    const b = createInitialState(ctx(fixedRandom(0.31)));
    expect(a.candidates.map((c) => c.type)).toEqual(b.candidates.map((c) => c.type));
  });
});

describe("布袋与满手替换", () => {
  it("手牌不满时直接入袋", () => {
    const state = pickFirst(freshState());
    expect(state.hand).toHaveLength(1);
    expect(state.phase).toBe("picking");
    expect(state.pendingCard).toBeNull();
  });

  it("满手时进入替换阶段并保留候选组", () => {
    const base = withHand(freshState(), ["research", "tinker", "flap", "stroll", "record", "share"]);
    const before = base.candidates;
    const state = pickFirst(base);
    expect(state.phase).toBe("replacing");
    expect(state.pendingCard).not.toBeNull();
    expect(state.candidates).toEqual(before);
    expect(state.hand).toHaveLength(6);
    expect(state.turn).toBe(0);
  });

  it("替换完成时弃掉旧牌、加入新牌并推进一次", () => {
    const base = withHand(freshState(), ["research", "tinker", "flap", "stroll", "record", "share"]);
    const picked = pickFirst(base);
    const newCard = picked.pendingCard!;
    const doomed = picked.hand[2];
    const state = reduce(picked, { kind: "REPLACE_CARD", cardId: doomed.id }, ctx());
    expect(state.phase).toBe("picking");
    expect(state.turn).toBe(1);
    expect(state.hand).toHaveLength(6);
    expect(state.hand.map((c) => c.id)).not.toContain(doomed.id);
    expect(state.hand.map((c) => c.id)).toContain(newCard.id);
    expect(state.pendingCard).toBeNull();
  });

  it("取消替换返回同一组候选且不消耗时间", () => {
    const base = withHand(freshState(), ["research", "tinker", "flap", "stroll", "record", "share"]);
    const picked = pickFirst(base);
    const state = reduce(picked, { kind: "CANCEL_REPLACE" }, ctx());
    expect(state.phase).toBe("picking");
    expect(state.turn).toBe(0);
    expect(state.candidates).toEqual(base.candidates);
    expect(state.pendingCard).toBeNull();
    expect(state.hand).toHaveLength(6);
  });

  it("替换阶段暂停选牌与合成，且手牌不超限", () => {
    const base = withHand(freshState(), ["research", "research", "flap", "stroll", "record", "share"]);
    const picked = pickFirst(base);
    const afterPick = reduce(picked, { kind: "PICK_CARD", cardId: picked.candidates[1].id }, ctx());
    expect(afterPick).toBe(picked);
    const afterCraft = reduce(picked, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(afterCraft).toBe(picked);
    expect(picked.hand).toHaveLength(6);
  });

  it("替换阶段不能越过该阶段直接结算", () => {
    const base = withHand(freshState(), ["research", "tinker", "flap", "stroll", "record", "share"]);
    const picked = pickFirst(base);
    const afterFinish = reduce(picked, { kind: "FINISH" }, ctx());
    expect(afterFinish).toBe(picked);
  });

  it("完成替换后候选组被消费并发出新的一组", () => {
    const base = withHand(freshState(), ["research", "tinker", "flap", "stroll", "record", "share"]);
    const picked = pickFirst(base);
    const state = reduce(picked, { kind: "REPLACE_CARD", cardId: picked.hand[0].id }, ctx());
    expect(state.candidates).toHaveLength(3);
    expect(state.candidates).not.toEqual(base.candidates);
  });
});

describe("合成", () => {
  it("合成不消耗时间也不刷新当前候选", () => {
    const base = withHand(freshState(), ["research", "research", "tinker"]);
    const state = reduce(base, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state.turn).toBe(base.turn);
    expect(state.candidates).toEqual(base.candidates);
    expect(state.phase).toBe("picking");
  });

  it("精确消耗三张卡并生成唯一纪念物", () => {
    const base = withHand(freshState(), ["research", "research", "tinker", "flap"]);
    const state = reduce(base, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state.hand.map((c) => c.type)).toEqual(["flap"]);
    expect(state.souvenirs).toHaveLength(1);
    expect(state.souvenirs[0].recipeId).toBe("tool");
    expect(state.souvenirs[0].craftedAtTurn).toBe(base.turn);
  });

  it("重复获得同一配方生成不同实例", () => {
    let state = withHand(freshState(), ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state.souvenirs).toHaveLength(2);
    expect(state.souvenirs[0].id).not.toBe(state.souvenirs[1].id);
  });

  it("材料不足时合成不改变状态", () => {
    const base = withHand(freshState(), ["research", "tinker"]);
    const state = reduce(base, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state).toBe(base);
  });

  it("无卡时合成不改变状态", () => {
    const base = freshState();
    const state = reduce(base, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state).toBe(base);
  });

  it("14 张入手卡最多合成四件展品", () => {
    let state = withHand(freshState(), [
      "research",
      "research",
      "research",
      "tinker",
      "tinker",
      "flap",
      "flap",
      "stroll",
      "record",
      "record",
      "share",
      "share",
      "stroll",
      "record",
    ]);
    for (const recipeId of ["tool", "training", "essay", "demo"] as RecipeId[]) {
      state = reduce(state, { kind: "CRAFT", recipeId }, ctx());
    }
    expect(state.souvenirs).toHaveLength(4);
    expect(state.hand).toHaveLength(2);
  });
});

describe("展签与愿望", () => {
  it("首次获得对应类别纪念物才盖章，重复不增加", () => {
    let state = withHand(freshState(), ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(stampsOf(state)).toEqual(["create"]);
    state = withHand(state, ["research", "tinker", "share"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "demo" }, ctx());
    expect(stampsOf(state)).toEqual(["create"]);
  });

  it("三个类别都能点亮", () => {
    let state = withHand(freshState(), ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    state = withHand(state, ["flap", "flap", "record"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "training" }, ctx());
    state = withHand(state, ["stroll", "record", "share"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "essay" }, ctx());
    expect(stampsOf(state)).toEqual(["create", "body", "echo"]);
  });

  it("配方顺序固定为 tool、training、essay、demo、evening", () => {
    expect(RECIPE_ORDER).toEqual(["tool", "training", "essay", "demo", "evening"]);
  });
});

describe("最后整理、开张与重开", () => {
  function reachFinalTidy(hand: ActivityType[] = []): GameState {
    let state = freshState();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    expect(state.phase).toBe("finalTidy");
    return hand.length > 0 ? withHand(state, hand) : state;
  }

  it("末回合先完成替换，完成后仍可合成", () => {
    let state = freshState();
    state = withHand(state, ["research", "research", "tinker", "flap", "stroll", "record"]);
    for (let i = 0; i < 13; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    expect(state.turn).toBe(13);
    state = pickFirst(state);
    expect(state.phase).toBe("replacing");
    state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
    expect(state.phase).toBe("finalTidy");
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    expect(state.souvenirs).toHaveLength(1);
  });

  it("零展品也能开张", () => {
    const state = reduce(reachFinalTidy(), { kind: "FINISH" }, ctx());
    expect(state.phase).toBe("settled");
    expect(state.souvenirs).toHaveLength(0);
    expect(state.ending?.kind).toBe("empty");
    expect(stampsOf(state)).toEqual([]);
  });

  it("未集齐三类也能开张并记录缺少的展签", () => {
    let state = reachFinalTidy();
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(state.ending?.kind).toBe("partial");
    expect(stampsOf(state)).toEqual(["create"]);
  });

  it("集齐三类时开张", () => {
    let state = reachFinalTidy();
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    state = withHand(state, ["flap", "flap", "record"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "training" }, ctx());
    state = withHand(state, ["stroll", "record", "share"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "essay" }, ctx());
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(state.ending?.kind).toBe("all");
  });

  it("结算不产生新卡或新纪念物", () => {
    let state = reachFinalTidy();
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    const before = { hand: state.hand, souvenirs: state.souvenirs };
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(state.hand).toEqual(before.hand);
    expect(state.souvenirs).toEqual(before.souvenirs);
  });

  it("结算后不能再选牌或合成", () => {
    let state = reachFinalTidy();
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx())).toBe(state);
    expect(reduce(state, { kind: "PICK_CARD", cardId: "x" }, ctx())).toBe(state);
  });

  it("再过一个暑假完整重置并从第 1 天上午开始", () => {
    let state = freshState();
    state = withHand(state, ["research", "research", "tinker"]);
    state = reduce(state, { kind: "CRAFT", recipeId: "tool" }, ctx());
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = reduce(state, { kind: "FINISH" }, ctx());
    const oldRunId = state.runId;

    state = reduce(state, { kind: "RESTART" }, ctx());
    expect(state.runId).not.toBe(oldRunId);
    expect(state.turn).toBe(0);
    expect(state.phase).toBe("picking");
    expect(state.hand).toEqual([]);
    expect(state.souvenirs).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.pendingCard).toBeNull();
    expect(state.bagFullAnnounced).toBe(false);
    expect(state.notedFork).toBeNull();
    expect(state.ending).toBeNull();
    expect(state.speech).toEqual({ kind: "opening" });
    expect(state.candidates).toHaveLength(3);
  });
});

function stampsOf(state: GameState): string[] {
  const wishes: string[] = [];
  for (const souvenir of state.souvenirs) {
    const wish = wishOfRecipe(souvenir.recipeId);
    if (!wishes.includes(wish)) wishes.push(wish);
  }
  return wishes;
}

function wishOfRecipe(recipeId: RecipeId): string {
  const map: Record<RecipeId, string> = {
    tool: "create",
    training: "body",
    essay: "echo",
    demo: "create",
    evening: "echo",
  };
  return map[recipeId];
}

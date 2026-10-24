import { describe, expect, it } from "vitest";
import {
  HAND_LIMIT,
  RECIPES,
  createInitialState,
  forkReminder,
  hashRandom,
  reduce,
  type ActivityType,
  type GameState,
  type RecipeId,
} from "./rules";
import { settlementLines, speechLine } from "./speech";

function ctx() {
  return { random: hashRandom };
}

function fresh(): GameState {
  return createInitialState(ctx());
}

function withHand(state: GameState, types: ActivityType[]): GameState {
  return {
    ...state,
    hand: types.map((type, index) => ({ id: `fixed-${index}-${type}`, type })),
  };
}

function craft(state: GameState, recipeId: RecipeId): GameState {
  return reduce(state, { kind: "CRAFT", recipeId }, ctx());
}

function pickFirst(state: GameState): GameState {
  return reduce(state, { kind: "PICK_CARD", cardId: state.candidates[0].id }, ctx());
}

function fullHand(state: GameState, types: ActivityType[]): GameState {
  return withHand(state, types.slice(0, HAND_LIMIT));
}

describe("台词选择", () => {
  it("开局说「空桌子也是桌子，先去捡。」", () => {
    expect(speechLine(fresh())).toBe("空桌子也是桌子，先去捡。");
  });

  it("第一件展品用口头禅", () => {
    const state = craft(withHand(fresh(), ["research", "research", "tinker"]), "tool");
    expect(speechLine(state)).toBe("《一颗石头的单间》，这可是好东西。");
  });

  it("点亮新展签时用展签句", () => {
    let state = craft(withHand(fresh(), ["research", "research", "tinker"]), "tool");
    state = craft(withHand(state, ["flap", "flap", "record"]), "training");
    expect(speechLine(state)).toBe("《绕树远征纪念章》摆上来了，展签名盖上了。");
  });

  it("同一展签再次合成用配方句", () => {
    let state = craft(withHand(fresh(), ["research", "research", "tinker"]), "tool");
    state = craft(withHand(state, ["research", "tinker", "share"]), "demo");
    expect(speechLine(state)).toBe("规则还是可以以后再讲。");
  });

  it("普通选牌清掉上一句台词", () => {
    const state = craft(withHand(fresh(), ["research", "research", "tinker"]), "tool");
    const after = pickFirst(state);
    expect(after.speech).toBeNull();
    expect(speechLine(after)).toBeNull();
  });

  it("满手句每局至多一次", () => {
    let state = withHand(fresh(), ["research", "research", "tinker", "flap", "stroll"]);
    state = pickFirst(state);
    expect(state.phase).toBe("picking");
    expect(state.hand).toHaveLength(HAND_LIMIT);
    expect(state.speech).toEqual({ kind: "bagFull" });
    expect(speechLine(state)).toBe("布袋满了，可以先做一件，也可以换掉一张旧的。");
    expect(state.bagFullAnnounced).toBe(true);

    // 合成腾出位置后再次装满，不再提示
    state = craft(state, "tool");
    expect(state.hand).toHaveLength(3);
    for (let i = 0; i < 3; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    expect(state.hand).toHaveLength(HAND_LIMIT);
    expect(state.bagFullAnnounced).toBe(true);
    expect(state.speech).toBeNull();
  });

  it("移出旧牌时说「先留在这里，下次路过再看看。」", () => {
    const base = fullHand(fresh(), ["research", "research", "tinker", "flap", "stroll", "record"]);
    const picked = pickFirst(base);
    const done = reduce(picked, { kind: "REPLACE_CARD", cardId: picked.hand[0].id }, ctx());
    expect(done.speech).toEqual({ kind: "discard" });
    expect(speechLine(done)).toBe("先留在这里，下次路过再看看。");
  });

  it("进入最后整理时说最后整理那句", () => {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    expect(state.phase).toBe("finalTidy");
    expect(speechLine(state)).toBe("到最后一下午了，桌上和布袋里就是这次的暑假。");
  });

  it("第 14 次选牌先进替换时，完成替换后进入最后整理句", () => {
    let state = fresh();
    for (let i = 0; i < 13; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = fullHand(state, ["research", "research", "tinker", "flap", "stroll", "record"]);
    const picked = pickFirst(state);
    expect(picked.phase).toBe("replacing");
    const done = reduce(picked, { kind: "REPLACE_CARD", cardId: picked.hand[0].id }, ctx());
    expect(done.phase).toBe("finalTidy");
    expect(speechLine(done)).toBe("到最后一下午了，桌上和布袋里就是这次的暑假。");
  });

  it("取消替换不新增台词", () => {
    const base = fullHand(fresh(), ["research", "research", "tinker", "flap", "stroll", "record"]);
    const picked = pickFirst(base);
    const cancelled = reduce(picked, { kind: "CANCEL_REPLACE" }, ctx());
    expect(cancelled.speech).toBeNull();
  });

  it("三种展签都点亮时结算说「三种展签都在，夏天来过这里。」", () => {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = craft(withHand(state, ["research", "research", "tinker"]), "tool");
    state = craft(withHand(state, ["flap", "flap", "record"]), "training");
    state = craft(withHand(state, ["stroll", "record", "share"]), "essay");
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(speechLine(state)).toBe("三种展签都在，夏天来过这里。");
  });

  it("零展品结算包含「好东西」", () => {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = reduce(state, { kind: "FINISH" }, ctx());
    expect(speechLine(state)).toBe("布袋还是鼓的，这些都是好东西，今天先不摆。");
  });
});

describe("结算分支台词与提示", () => {
  function settledWith(crafts: [RecipeId, ActivityType[]][]): GameState {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    for (const [recipeId, hand] of crafts) {
      state = craft(withHand(state, hand), recipeId);
    }
    return reduce(state, { kind: "FINISH" }, ctx());
  }

  it("缺一种展签写成「还差身体出过门，桌上这些先摆着。」", () => {
    const state = settledWith([
      ["tool", ["research", "research", "tinker"]],
      ["essay", ["stroll", "record", "share"]],
    ]);
    expect(speechLine(state)).toBe("还差身体出过门，桌上这些先摆着。");
  });

  it("缺两种展签用「和」连接", () => {
    const state = settledWith([["training", ["flap", "flap", "record"]]]);
    expect(speechLine(state)).toBe("还差小小创造和日子有回声，桌上这些先摆着。");
  });

  it("未点亮展签按小小创造、身体出过门、日子有回声排列", () => {
    const state = settledWith([]);
    expect(state.ending?.missingWishes).toEqual(["create", "body", "echo"]);
  });
});

describe("材料提醒", () => {
  it("扑腾、溜达、记录这一手指向《风的迟到记录》和《绕树远征纪念章》", () => {
    const state = withHand(fresh(), ["flap", "stroll", "record"]);
    const fork: GameState["notedFork"] = {
      craftRecipeId: "evening",
      otherRecipeId: "training",
      materials: ["flap", "record"],
    };
    const reminder = forkReminder({ ...state, notedFork: fork });
    expect(reminder).not.toBeNull();
    expect(reminder?.craftRecipeId).toBe("evening");
    expect(reminder?.otherRecipeId).toBe("training");
    expect(reminder?.materials).toEqual(["flap", "record"]);
  });

  it("同一展签下的不同配方不提醒", () => {
    // 研究×2、捣鼓×1 可做 tool；另一件 demo 与 tool 同属小小创造，不应成立
    const state = withHand(fresh(), ["research", "research", "tinker"]);
    const fork: GameState["notedFork"] = {
      craftRecipeId: "tool",
      otherRecipeId: "demo",
      materials: ["research", "tinker"],
    };
    expect(forkReminder({ ...state, notedFork: fork })).toBeNull();
  });

  it("选牌后手牌更新时才记下第一对，之后不替换", () => {
    let state = fresh();
    for (let i = 0; i < 3; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    if (state.notedFork) {
      const first = state.notedFork;
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
      expect(state.notedFork).toEqual(first);
    }
  });

  it("条件不再成立时隐藏句子但保留记下的一对", () => {
    const state = withHand(fresh(), ["flap", "stroll", "record"]);
    const noted: GameState = {
      ...state,
      notedFork: { craftRecipeId: "evening", otherRecipeId: "training", materials: ["flap", "record"] },
    };
    expect(forkReminder(noted)).not.toBeNull();
    const emptied = withHand(noted, ["research"]);
    expect(forkReminder(emptied)).toBeNull();
    expect(emptied.notedFork).toEqual(noted.notedFork);
  });

  it("替换阶段合成暂停，材料句先隐藏", () => {
    const base = fullHand(fresh(), ["flap", "stroll", "record", "flap", "stroll", "record"]);
    const noted: GameState = {
      ...base,
      notedFork: { craftRecipeId: "evening", otherRecipeId: "training", materials: ["flap", "record"] },
    };
    const picked = pickFirst(noted);
    expect(picked.phase).toBe("replacing");
    expect(forkReminder(picked)).toBeNull();
  });

  it("句子只列入用掉后低于另一件所需的材料", () => {
    const state = withHand(fresh(), ["flap", "flap", "record"]);
    const noted: GameState = {
      ...state,
      notedFork: { craftRecipeId: "training", otherRecipeId: "evening", materials: ["flap", "record"] },
    };
    const reminder = forkReminder(noted);
    expect(reminder?.materials).toEqual(["flap", "record"]);
  });
});

describe("结算选择句与未制作提示互斥", () => {
  function runToSettle(hands: ActivityType[][], fork?: GameState["notedFork"]): GameState {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    for (const hand of hands) {
      state = craft(withHand(state, hand), "tool");
    }
    state = reduce(state, { kind: "FINISH" }, ctx());
    return fork ? { ...state, notedFork: fork } : state;
  }

  const toolDemoFork: GameState["notedFork"] = {
    craftRecipeId: "tool",
    otherRecipeId: "demo",
    materials: ["research", "tinker"],
  };

  it("记下的两件恰好做成一件时出现选择句，并隐藏未制作提示", () => {
    const state = runToSettle([["research", "research", "tinker"]], toolDemoFork);
    const lines = settlementLines(state);
    expect(lines.choice).toBe("《一颗石头的单间》做成了，《瓶盖碰碰棋》那次没做。");
    expect(lines.unmade).toBeNull();
  });

  it("两件都没做成时没有选择句，改为未制作提示", () => {
    const state = runToSettle([], toolDemoFork);
    const lines = settlementLines(state);
    expect(lines.choice).toBeNull();
    expect(lines.unmade).toBe("下个暑假可以试试《一颗石头的单间》。");
  });

  it("两件都做成时没有选择句，改为未制作提示", () => {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = craft(withHand(state, ["research", "research", "tinker"]), "tool");
    state = craft(withHand(state, ["research", "tinker", "share"]), "demo");
    state = reduce(state, { kind: "FINISH" }, ctx());
    state = { ...state, notedFork: toolDemoFork };
    const lines = settlementLines(state);
    expect(lines.choice).toBeNull();
    expect(lines.unmade).toBe("下个暑假可以试试《绕树远征纪念章》。");
  });

  it("未制作提示按配方表顺序取第一件未制作的展品，且与选择句互斥", () => {
    let state = fresh();
    for (let i = 0; i < 14; i += 1) {
      state = pickFirst(state);
      if (state.phase === "replacing") {
        state = reduce(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id }, ctx());
      }
    }
    state = craft(withHand(state, ["research", "research", "tinker"]), "tool");
    state = reduce(state, { kind: "FINISH" }, ctx());
    state = { ...state, notedFork: toolDemoFork };
    const lines = settlementLines(state);
    expect(lines.choice).toBe("《一颗石头的单间》做成了，《瓶盖碰碰棋》那次没做。");
    expect(lines.unmade).toBeNull();
    expect(RECIPES.tool.name).toBe("一颗石头的单间");
  });
});

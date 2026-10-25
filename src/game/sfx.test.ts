import { describe, expect, it } from "vitest";
import { SOUND_KEY, planSfx, readSoundPref, writeSoundPref } from "./sfx";
import { createInitialState, hashRandom, reduce, type GameState } from "./rules";
import type { Action, ActivityType } from "./types";

function ctx() {
  return { random: hashRandom };
}

function apply(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((acc, action) => reduce(acc, action, ctx()), state);
}

function fresh(): GameState {
  return createInitialState(ctx());
}

function withHand(state: GameState, types: ActivityType[]): GameState {
  return { ...state, hand: types.map((type, i) => ({ id: `h${i}-${type}`, type })) };
}

describe("planSfx 音效触发", () => {
  it("首次进入带开场台词的新局时阿满「嘎」一声", () => {
    expect(planSfx(null, fresh())).toEqual(["honk"]);
  });

  it("恢复中的存档不是新局，不响", () => {
    const state = { ...fresh(), turn: 3, speech: null };
    expect(planSfx(null, state)).toEqual([]);
  });

  it("普通选牌响 pick", () => {
    const state = fresh();
    const next = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    expect(planSfx(state, next)).toEqual(["pick"]);
  });

  it("替换旧牌响 discard", () => {
    let state = withHand(fresh(), ["research", "research", "tinker", "flap", "stroll", "record"]);
    state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    const next = apply(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id });
    expect(planSfx(state, next)).toEqual(["discard"]);
  });

  it("布袋满了响 bagFull", () => {
    // 先把手牌填到 5 张再选第 6 张
    let state = withHand(fresh(), ["research", "tinker", "flap", "stroll", "record"]);
    state = { ...state, turn: 5, bagFullAnnounced: false };
    // 直接构造：手牌 5 张 + 第 6 次选牌
    const six = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    expect(six.hand).toHaveLength(6);
    expect(planSfx(state, six)).toEqual(["bagFull"]);
  });

  it("最后一次选牌响 lastTidy（满手时经替换完成）", () => {
    let state = fresh();
    for (let i = 0; i < 13; i += 1) {
      state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
      if (state.phase === "replacing") {
        state = apply(state, { kind: "REPLACE_CARD", cardId: state.hand[0].id });
      }
    }
    let next = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    if (next.phase === "replacing") {
      next = apply(next, { kind: "REPLACE_CARD", cardId: next.hand[0].id });
    }
    expect(next.speech?.kind).toBe("lastTidy");
    expect(planSfx(state, next)).toEqual(["lastTidy"]);
  });

  it("第一件展品响 craft + stamp", () => {
    const state = withHand(fresh(), ["research", "research", "tinker"]);
    const next = apply(state, { kind: "CRAFT", recipeId: "tool" });
    expect(next.speech?.kind).toBe("firstSouvenir");
    expect(planSfx(state, next)).toEqual(["craft", "stamp"]);
  });

  it("点亮新展签的合成响 craft + stamp，重复合成只响 craft", () => {
    const base = withHand(fresh(), [
      "research", "research", "tinker", // tool: create
      "flap", "flap", "record", // training: body
    ]);
    const afterTool = apply(base, { kind: "CRAFT", recipeId: "tool" });
    const litNew = apply(afterTool, { kind: "CRAFT", recipeId: "training" });
    expect(litNew.speech?.kind).toBe("newStamp");
    expect(planSfx(afterTool, litNew)).toEqual(["craft", "stamp"]);

    const recraftHand = withHand(fresh(), ["research", "research", "tinker"]);
    const recrafted = apply(
      { ...recraftHand, souvenirs: [{ id: "s0", recipeId: "tool", craftedAtTurn: 0 }] },
      { kind: "CRAFT", recipeId: "tool" },
    );
    expect(recrafted.speech?.kind).toBe("recraft");
    expect(planSfx({ ...recraftHand, souvenirs: [{ id: "s0", recipeId: "tool", craftedAtTurn: 0 }] }, recrafted)).toEqual(["craft"]);
  });

  function toFinalTidy(state: GameState): GameState {
    return { ...state, phase: "finalTidy", turn: 14, candidates: [] };
  }

  it("三种展签集齐结算响 jingle + honk", () => {
    let state = withHand(fresh(), [
      "research", "research", "tinker",
      "flap", "flap", "record",
      "stroll", "record", "share",
    ]);
    state = apply(
      state,
      { kind: "CRAFT", recipeId: "tool" },
      { kind: "CRAFT", recipeId: "training" },
      { kind: "CRAFT", recipeId: "essay" },
    );
    state = toFinalTidy(state);
    const settled = apply(state, { kind: "FINISH" });
    expect(settled.ending?.kind).toBe("all");
    expect(planSfx(state, settled)).toEqual(["jingle", "honk"]);
  });

  it("部分集齐响 jingleLow，零展品响 honkLow", () => {
    let state = withHand(fresh(), ["research", "research", "tinker"]);
    state = apply(state, { kind: "CRAFT", recipeId: "tool" });
    state = toFinalTidy(state);
    const partial = apply(state, { kind: "FINISH" });
    expect(partial.ending?.kind).toBe("partial");
    expect(planSfx(state, partial)).toEqual(["jingleLow"]);

    const emptyBase = toFinalTidy(fresh());
    const empty = apply(emptyBase, { kind: "FINISH" });
    expect(empty.ending?.kind).toBe("empty");
    expect(planSfx(emptyBase, empty)).toEqual(["honkLow"]);
  });

  it("重开跨局只响一次出场「嘎」，不把 turn 回退误判成选牌", () => {
    let state = fresh();
    state = apply(state, { kind: "PICK_CARD", cardId: state.candidates[0].id });
    const restarted = apply(state, { kind: "RESTART" });
    expect(restarted.turn).toBe(0);
    expect(planSfx(state, restarted)).toEqual(["honk"]);
  });

  it("同一状态重复触发不响", () => {
    const state = fresh();
    expect(planSfx(state, state)).toEqual([]);
  });

  it("每个配方都能发声（音效 id 齐全）", () => {
    let state = withHand(fresh(), ["research", "research", "tinker"]);
    state = apply(state, { kind: "CRAFT", recipeId: "tool" });
    const ids = planSfx(withHand(fresh(), ["research", "research", "tinker"]), state);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(["pick", "craft", "stamp", "bagFull", "discard", "lastTidy", "honk", "honkLow", "jingle", "jingleLow"]).toContain(id);
    }
  });
});

describe("静音偏好", () => {
  function makeStorage(seed: Record<string, string> = {}) {
    const map = new Map(Object.entries(seed));
    return {
      getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
    };
  }

  it("默认开启", () => {
    expect(readSoundPref(makeStorage())).toBe(true);
    expect(readSoundPref(undefined)).toBe(true);
  });

  it("写入 off 后读回 false", () => {
    const storage = makeStorage();
    writeSoundPref(storage, false);
    expect(storage.getItem(SOUND_KEY)).toBe("off");
    expect(readSoundPref(storage)).toBe(false);
    writeSoundPref(storage, true);
    expect(readSoundPref(storage)).toBe(true);
  });

  it("读取抛错时按默认开启", () => {
    const hostile = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(readSoundPref(hostile)).toBe(true);
    expect(() => writeSoundPref(hostile, false)).not.toThrow();
  });
});

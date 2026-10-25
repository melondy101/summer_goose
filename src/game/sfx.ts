import type { GameState } from "./types";
import { browserStorage, type StorageLike } from "./save";

/** 全部音效由 Web Audio 即时合成，不引入音频文件。 */
export type SfxId =
  | "pick"
  | "craft"
  | "stamp"
  | "bagFull"
  | "discard"
  | "lastTidy"
  | "honk"
  | "honkLow"
  | "jingle"
  | "jingleLow";

export const SOUND_KEY = "summer.sound.v1";

/** 静音偏好独立于对局存档，默认开启。 */
export function readSoundPref(storage: StorageLike | undefined | null): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundPref(storage: StorageLike | undefined | null, on: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // 存储不可用时只影响本次页面内
  }
}

interface ToneSpec {
  type: OscillatorType;
  from: number;
  to: number;
  dur: number;
  gain: number;
  delay?: number;
}

/** 每种音效的合成配方；数值按「短、轻、能区分」原则手调。 */
const RECIPES: Record<SfxId, ToneSpec[]> = {
  pick: [{ type: "square", from: 620, to: 660, dur: 0.06, gain: 0.05 }],
  craft: [
    { type: "triangle", from: 440, to: 440, dur: 0.09, gain: 0.08 },
    { type: "triangle", from: 587, to: 587, dur: 0.1, gain: 0.08, delay: 0.07 },
  ],
  stamp: [{ type: "triangle", from: 880, to: 1318, dur: 0.16, gain: 0.09 }],
  bagFull: [
    { type: "sawtooth", from: 220, to: 196, dur: 0.12, gain: 0.06 },
    { type: "sawtooth", from: 196, to: 165, dur: 0.14, gain: 0.06, delay: 0.12 },
  ],
  discard: [{ type: "square", from: 330, to: 247, dur: 0.1, gain: 0.05 }],
  lastTidy: [{ type: "sine", from: 494, to: 392, dur: 0.24, gain: 0.07 }],
  // 阿满的签名「嘎」：锯齿波下滑加一点粗糙的二次泛音
  honk: [
    { type: "sawtooth", from: 340, to: 175, dur: 0.26, gain: 0.11 },
    { type: "square", from: 680, to: 350, dur: 0.26, gain: 0.03 },
  ],
  honkLow: [
    { type: "sawtooth", from: 240, to: 130, dur: 0.3, gain: 0.1 },
    { type: "square", from: 480, to: 260, dur: 0.3, gain: 0.025 },
  ],
  jingle: [
    { type: "sine", from: 523, to: 523, dur: 0.12, gain: 0.08 },
    { type: "sine", from: 659, to: 659, dur: 0.12, gain: 0.08, delay: 0.09 },
    { type: "sine", from: 784, to: 784, dur: 0.2, gain: 0.09, delay: 0.18 },
  ],
  jingleLow: [
    { type: "sine", from: 392, to: 392, dur: 0.14, gain: 0.07 },
    { type: "sine", from: 523, to: 523, dur: 0.2, gain: 0.07, delay: 0.11 },
  ],
};

type AudioContextLike = {
  state: string;
  resume(): Promise<void>;
  createOscillator(): {
    type: OscillatorType;
    frequency: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(node: unknown): void;
    start(t: number): void;
    stop(t: number): void;
  };
  createGain(): {
    gain: { setValueAtTime(v: number, t: number): void; exponentialRampToValueAtTime(v: number, t: number): void };
    connect(node: unknown): void;
  };
  currentTime: number;
  destination: unknown;
};

/**
 * 从前后两个状态推出该响哪些音效的纯函数，便于单元测试；
 * 真正的发声与音量策略都在引擎里。
 */
export function planSfx(prev: GameState | null, next: GameState): SfxId[] {
  const out: SfxId[] = [];

  if (!prev) {
    if (next.speech?.kind === "opening") out.push("honk");
    return out;
  }

  // 重开跨局：只当一次出场「嘎」，不把回退的 turn 误判成选牌
  if (prev.runId !== next.runId) {
    if (next.speech?.kind === "opening") out.push("honk");
    return out;
  }

  if (next.turn > prev.turn) {
    const kind = next.speech?.kind;
    if (kind === "lastTidy") out.push("lastTidy");
    else if (kind === "bagFull") out.push("bagFull");
    else if (kind === "discard") out.push("discard");
    else out.push("pick");
  }

  if (next.souvenirs.length > prev.souvenirs.length) {
    out.push("craft");
    const kind = next.speech?.kind;
    if (kind === "firstSouvenir" || kind === "newStamp") out.push("stamp");
  }

  if (prev.phase !== "settled" && next.phase === "settled") {
    const kind = next.ending?.kind;
    if (kind === "all") {
      out.push("jingle", "honk");
    } else if (kind === "partial") {
      out.push("jingleLow");
    } else {
      out.push("honkLow");
    }
  }

  return out;
}

class SfxEngine {
  private ctx: AudioContextLike | null = null;
  private muted = false;

  constructor(private readonly global: {
    AudioContext?: new () => AudioContextLike;
    addEventListener?: (type: string, fn: () => void, options?: { once: boolean }) => void;
  }) {
    // 浏览器要求用户手势后才能出声：第一次点按/按键时解锁
    global.addEventListener?.("pointerdown", () => this.ensure(), { once: true });
    global.addEventListener?.("keydown", () => this.ensure(), { once: true });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  private ensure(): AudioContextLike | null {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const Ctor = this.global.AudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }

  play(id: SfxId, delay = 0): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== "running") return;
    try {
      const master = ctx.createGain();
      master.connect(ctx.destination);
      const base = ctx.currentTime + delay;
      for (const tone of RECIPES[id]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = base + (tone.delay ?? 0);
        osc.type = tone.type;
        osc.frequency.setValueAtTime(tone.from, start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(tone.to, 1), start + tone.dur);
        gain.gain.setValueAtTime(tone.gain, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + tone.dur + 0.02);
      }
    } catch {
      // 音频失败不影响玩法
    }
  }
}

let engine: SfxEngine | null = null;

function getEngine(): SfxEngine | null {
  if (engine) return engine;
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: new () => AudioContextLike;
    webkitAudioContext?: new () => AudioContextLike;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  engine = new SfxEngine({ AudioContext: Ctor, addEventListener: window.addEventListener.bind(window) });
  engine.setMuted(!readSoundPref(browserStorage()));
  return engine;
}

/** 依次播放；多个音效时轻微错开，形成小小节奏。 */
export function playSfx(ids: readonly SfxId[]): void {
  const e = getEngine();
  if (!e) return;
  ids.forEach((id, index) => e.play(id, index * 0.12));
}

export function setSfxMuted(muted: boolean): void {
  getEngine()?.setMuted(muted);
}

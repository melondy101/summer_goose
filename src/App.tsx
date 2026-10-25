import { useState } from "react";
import { CorruptSaveScreen } from "@/components/game/CorruptSaveScreen";
import { EndingScreen } from "@/components/game/EndingScreen";
import { ErrorBoundary } from "@/components/game/ErrorBoundary";
import { GameScreen } from "@/components/game/GameScreen";
import { SoundToggle } from "@/components/game/SoundToggle";
import { StartScreen } from "@/components/game/StartScreen";
import { useGame, useHasSave } from "@/hooks/useGame";
import { useGameSfx } from "@/hooks/useSfx";
import { playSfx } from "@/game/sfx";

type Screen = "start" | "game";

function GameShell() {
  const game = useGame();
  useGameSfx(game.state);
  const hasSave = useHasSave();
  // 有存档时直接回到已保存阶段；没有存档时先看规则说明
  const [screen, setScreen] = useState<Screen>(() => (game.resumed ? "game" : "start"));

  const startNew = () => {
    game.beginFresh();
    // 点「开始暑假」的那一下就是阿满出场，响一声「嘎」
    playSfx(["honk"]);
    setScreen("game");
  };

  const restart = () => {
    game.restart();
    setScreen("game");
  };

  if (game.corruptSave) {
    return <CorruptSaveScreen onStartNew={startNew} />;
  }

  if (screen === "start") {
    return (
      <StartScreen
        hasSave={hasSave}
        storageReady={game.storageReady}
        onStart={startNew}
        onContinue={() => setScreen("game")}
        onRestart={restart}
      />
    );
  }

  if (game.state.phase === "settled") {
    return <EndingScreen state={game.state} onRestart={restart} runSeed={game.runSeed} />;
  }

  return <GameScreen state={game.state} dispatch={game.dispatch} seed={game.seed} />;
}

export function App() {
  return (
    <ErrorBoundary>
      <SoundToggle />
      <GameShell />
    </ErrorBoundary>
  );
}

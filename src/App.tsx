import { useState } from "react";
import { CorruptSaveScreen } from "@/components/game/CorruptSaveScreen";
import { EndingScreen } from "@/components/game/EndingScreen";
import { GameScreen } from "@/components/game/GameScreen";
import { StartScreen } from "@/components/game/StartScreen";
import { useGame, useHasSave } from "@/hooks/useGame";

type Screen = "start" | "game";

export function App() {
  const game = useGame();
  const hasSave = useHasSave();
  // 有存档时直接回到已保存阶段；没有存档时先看规则说明
  const [screen, setScreen] = useState<Screen>(() => (game.resumed ? "game" : "start"));

  const startNew = () => {
    game.beginFresh();
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
    return <EndingScreen state={game.state} onRestart={restart} />;
  }

  return <GameScreen state={game.state} dispatch={game.dispatch} seed={game.seed} />;
}

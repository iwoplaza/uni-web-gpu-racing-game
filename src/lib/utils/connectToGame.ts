import { createCarGame } from '$lib/carGame';
import { disconnect, connect } from '$lib/clientSocket';
import GameInstance from '$lib/common/gameInstance';
import GameEngine from '$lib/gameEngine';

export async function connnectToGame(canvas: HTMLCanvasElement, adress: string) {
  const gameEnginePromise = (async () => {
    const gameInstance = new GameInstance();
    connect(gameInstance, adress);
    const carGame = createCarGame(gameInstance);

    return GameEngine.initFromCanvas(canvas, carGame);
  })();
  return () => {
    gameEnginePromise.then((e) => e.dispose());
    disconnect();
  };
}

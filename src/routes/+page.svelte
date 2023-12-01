<script lang="ts">
  import { onMount } from 'svelte';

  import { createCarGame } from '$lib/carGame';
  import GameEngine from '$lib/gameEngine';
  import { connect, disconnect } from '$lib/clientSocket';
  import GameInstance from '$lib/common/gameInstance';

  let canvas!: HTMLCanvasElement;

  onMount(() => {
    const gameEnginePromise = (async () => {
      const gameInstance = new GameInstance();
      const socketId = connect(gameInstance);
      const carGame = createCarGame(gameInstance);

      return GameEngine.initFromCanvas(canvas, carGame);
    })();
    return () => {
      gameEnginePromise.then((e) => e.dispose());
      disconnect();
    };
  });
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
  <canvas bind:this={canvas} width={256} height={256} />
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 0.6;
  }
</style>

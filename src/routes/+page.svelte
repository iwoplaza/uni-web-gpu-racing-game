<script lang="ts">
  import { onMount } from 'svelte';

  import { createCarGame } from '$lib/carGame';
  import GameEngine from '$lib/gameEngine';
  import { clientSocket, connect, disconnect } from '$lib/clientSocket';
  import GameInstance from '$lib/common/gameInstance';
    import type { Socket } from 'socket.io';

  let canvas!: HTMLCanvasElement;

  onMount(() => {

  });
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
  
  <canvas bind:this={canvas} width={256} height={256} />
  {#if $clientSocket}
  <button on:click={()=>
    {
      disconnect();
    }}>Disconnect</button>
    {:else}
    <div>
      <p>Server adress</p>
      <input type="text" placeholder="localhost"/>
      <button on:click={()=>
        {
          const gameEnginePromise = (async () => {
            const gameInstance = new GameInstance();
            connect(gameInstance);
            const carGame = createCarGame(gameInstance);
          
            return GameEngine.initFromCanvas(canvas, carGame);
          })();
          return () => {
            gameEnginePromise.then((e) => e.dispose());
            disconnect();
          };
        }}>Connect</button>
    </div>

    {/if}
  

  
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

<script lang="ts">
  import { onMount } from 'svelte';

  import { createCarGame } from '$lib/carGame';
  import GameEngine from '$lib/gameEngine';
  import { clientSocket, connect, disconnect } from '$lib/clientSocket';
  import GameInstance from '$lib/common/gameInstance';
    import { connnectToGame } from '$lib/utils/connectToGame';

  let canvas!: HTMLCanvasElement;
  let adress: string = "localhost";
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
      <input bind:value={adress} type="text" placeholder="localhost"/>
      <button on:click={()=>
        {
          connnectToGame(canvas, adress)
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

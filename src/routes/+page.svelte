<script lang="ts">
  import { onMount } from 'svelte';

  import { connect, createCarGame, disconnect, disposeCarGame } from '$lib/carGame';
  import { jitter, latency, ping, serverAddress, speedCheat } from '$lib/clientSocket';

  let canvas!: HTMLCanvasElement;
  let addressInput: string = 'localhost';


  onMount(() => {
    createCarGame(canvas);

    return () => {
      disposeCarGame();
    };
  });
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="WebGPU Car Racing Game" />
</svelte:head>

<section>
  <canvas bind:this={canvas} width={256} height={256} />
  {#if $serverAddress}
    <button on:click={() => disconnect()}>Disconnect</button>
    <div>
      <p>Latency (0-150 ms). Current value {$latency} </p>
      <input type="range" min="0" max="150" step="10" bind:value={$latency} />
      <p>Jitter (0-100 ms). Current value {$jitter} </p>
      <input type="range" min="0" max="100" step="1" bind:value={$jitter} />
      <p>Car speed cheat (0-200%). Current value {$speedCheat} </p>
      <input type="range" min="0" max="200" step="10" bind:value={$speedCheat} />
      <h3>Ping: {$ping}</h3>
    </div>
  {:else}
    <div>
      <p>Server address</p>
      <input bind:value={addressInput} type="text" placeholder="localhost" />
      <button on:click={() => connect(canvas, addressInput)}>Connect</button>
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

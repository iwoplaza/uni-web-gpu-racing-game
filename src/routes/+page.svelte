<script lang="ts">
  import { onMount } from 'svelte';

  import { connect, createCarGame, disconnect, disposeCarGame } from '$lib/carGame';
  import { serverAddress } from '$lib/clientSocket';

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

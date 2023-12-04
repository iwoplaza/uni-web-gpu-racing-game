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
    <button class="button-19 disconnect" on:click={() => disconnect()}>Disconnect</button>
    <div>
      <p>Latency (0-150 ms). Current value {$latency}</p>
      <input type="range" min="0" max="150" step="10" bind:value={$latency} />
      <p>Jitter (0-100 ms). Current value {$jitter}</p>
      <input type="range" min="0" max="100" step="1" bind:value={$jitter} />
      <p>Car speed cheat (0-200%). Current value {$speedCheat}</p>
      <input type="range" min="0" max="200" step="10" bind:value={$speedCheat} />
      <h3>Ping: {$ping}</h3>
    </div>
  {:else}
    <div>
      <p>Server address</p>
      <input bind:value={addressInput} type="text" placeholder="localhost" />
      <button class="button-19" on:click={() => connect(canvas, addressInput)}>Connect</button>
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



  /* CSS */

  .button-19 {
    appearance: button;
    background-color: #1899d6;
    border: solid transparent;
    border-radius: 16px;
    border-width: 0 0 4px;
    box-sizing: border-box;
    color: #ffffff;
    cursor: pointer;
    display: inline-block;
    font-family: din-round, sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.8px;
    line-height: 20px;
    margin: 0;
    outline: none;
    overflow: visible;
    padding: 13px 16px;
    text-align: center;
    text-transform: uppercase;
    touch-action: manipulation;
    transform: translateZ(0);
    transition: filter 0.2s;
    user-select: none;
    -webkit-user-select: none;
    vertical-align: middle;
    white-space: nowrap;
  }

  .button-19:after {
    background-clip: padding-box;
    background-color: #1cb0f6;
    border: solid transparent;
    border-radius: 16px;
    border-width: 0 0 4px;
    bottom: -4px;
    content: '';
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    z-index: -1;
  }

  .button-19:main,
  .button-19:focus {
    user-select: auto;
  }

  .button-19:hover:not(:disabled) {
    filter: brightness(1.1);
    -webkit-filter: brightness(1.1);
  }

  .button-19:disabled {
    cursor: auto;
  }

  .button-19:active {
    border-width: 4px 0 0;
    background: none;
  }
  .disconnect
  {
    background-color: rgb(171, 18, 18);

  }
  .disconnect:after {
    background-color: rgb(249, 0, 0);

  }
</style>

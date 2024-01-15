<script lang="ts">
  import { onMount } from 'svelte';

  import { connect, createCarGame, disconnect, disposeCarGame, ready } from '$lib/game/carGame';
  import { packetsReceived, packetsSent, ping } from '$lib/common/ping';
  import { jitter, latency, maxBitrate, packetsLost, serverAddress } from '$lib/clientSocket';
  import gameStateStore from '$lib/gameStateStore';
  import FpsCounter from '$lib/FpsCounter.svelte';
  import GameMessages from '$lib/GameMessages.svelte';

  let canvas!: HTMLCanvasElement;
  let addressInput: string = 'gpu.dushess.net';

  let readyState = false;
  serverAddress.subscribe((address) => {
    readyState = false;
  });

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
  <FpsCounter />
  <GameMessages />
  <!-- <LeaderBoard /> -->
  <canvas bind:this={canvas} width={256} height={256} />
  {#if $serverAddress}
    <button class="button-19 disconnect" on:click={() => disconnect()}>Disconnect</button>
    {#if $gameStateStore?.inLobby}
      <div>
        {#if readyState}
          <button
            class="button-19 unready"
            on:click={() => {
              readyState = !readyState;
              ready(readyState);
            }}>Unready</button
          >
        {:else}
          <button
            class="button-19 ready"
            on:click={() => {
              readyState = !readyState;
              ready(readyState);
            }}>Ready</button
          >
        {/if}
      </div>
    {/if}
    <div>
      <p>Latency (0-150 ms). Current value {$latency}</p>
      <input type="range" min="0" max="150" step="10" bind:value={$latency} />
      <p>Jitter (0-100 ms). Current value {$jitter}</p>
      <input type="range" min="0" max="100" step="1" bind:value={$jitter} />
      <p>Max Bitrate (Max messages per 10 seconds). Current value {$maxBitrate}</p>
      <input type="range" min="1" max="200" step="1" bind:value={$maxBitrate} />
      <h3>Ping: {$ping}</h3>
      <h3>Packetloss: {$packetsLost}</h3>
      <h3>Packets received/sent: {$packetsReceived}/{$packetsSent}</h3>
    </div>
  {:else}
    <div style="margin: 20px;">
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
  .disconnect {
    background-color: rgb(171, 18, 18);
    margin: 20px;
  }
  .disconnect:after {
    background-color: rgb(249, 0, 0);
  }

  .ready {
    background-color: rgb(16, 208, 144);
    margin: 20px;
  }
  .ready:after {
    background-color: rgb(0, 249, 129);
  }
  .unready {
    background-color: rgb(100, 96, 96);
    margin: 20px;
  }
  .unready:after {
    background-color: rgb(91, 91, 91);
  }
</style>

<script lang="ts">
  import type { GameState } from './common/systems/types';
  import {GetLocalPlayerId, carGame} from './game/carGame';
  import gameStateStore from './gameStateStore';
  let gameState: GameState | null;
  gameStateStore.subscribe((state) => {
    gameState = state;
  });
</script>

<div>
  {#if gameState}
    {#if gameState.inLobby}
      <p class="text-xl text-black font-light">{@html gameState.customMessage}</p>
    {/if}
    {#if gameState.inGame && gameState.leaderboard}
      <h1>Leaders</h1>
      <ul>
        {#each gameState.leaderboard as leader}
          {#if leader.playerId === GetLocalPlayerId()}
            <li class="text-green-500">{leader.playerId}: {leader.loops}</li>
          {:else}
            <li>{leader.playerId}: {leader.loops}</li>
          {/if}
        {/each}
      </ul>
    {/if}
  {/if}
</div>

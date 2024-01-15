<script lang="ts">
  import type { GameState } from './common/systems/types';
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
      <p>Leaders</p>
      <ul>
        {#each gameState.leaderboard as leader}
          <li>{leader.playerId}: {leader.loops}</li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

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
  {/if}
</div>

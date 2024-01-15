<script lang="ts">
  import type { GameState } from './common/systems/types';
  import gameStateStore from './gameStateStore';
  let gameState: GameState | null;
  gameStateStore.subscribe((state) => {
    gameState = state;
    console.log(state);
  });
</script>

<div>
  {#if gameState}
    <p class="text-xl text-black font-light">{gameState.customMessage}</p>
  {/if}
</div>

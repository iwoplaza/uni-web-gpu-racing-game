<script lang="ts">
  import { GetLocalPlayerId } from './game/carGame';
  import gameStateStore from './gameStateStore';
</script>
<div>
  {#if $gameStateStore}
    {#if $gameStateStore.inLobby}
      <p class="text-xl text-black font-light">{@html $gameStateStore.customMessage}</p>
    {/if}
    {#if $gameStateStore.showingLeaderboard && $gameStateStore.leaderboard}
      <h1>Leaders</h1>
      <ul>
        {#each $gameStateStore.leaderboard as leader}
          {#if leader.playerId === GetLocalPlayerId()}
            <li class="text-green-500">{leader.playerId}: {leader.loops}</li>
          {:else}
            <li>{leader.playerId}: {leader.loops}</li>
          {/if}
        {/each}
      </ul>
    {/if}
    {#if $gameStateStore.winningAnimation && $gameStateStore.leaderboard}
      <h1>WINNER WINNER CHICKEN DINNER!</h1>
      <ul>
        {#each $gameStateStore.leaderboard as leader}
          {#if leader.winner}
            <h1 class="rainbow-text">{leader.playerId}</h1>
          {:else}
            <li>{leader.playerId}: {leader.loops}</li>
          {/if}
        {/each}
      </ul>
    {/if}
  {/if}
</div>
<style>
  .rainbow-text {
    background-image: linear-gradient(to left, violet, indigo, blue, green, yellow, orange, red);
  }
</style>
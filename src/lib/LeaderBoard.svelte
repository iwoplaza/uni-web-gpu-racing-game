<script lang="ts">
  import gameStateStore from './gameStateStore';
</script>

<div>
  {#if $gameStateStore != null}
    <p class="text-xl text-black font-light">{$gameStateStore.inLobby}</p>
  {/if}
</div>

<script lang="ts">
	import GameEngine from '$lib/gameEngine';
	import { onMount } from 'svelte';

	let canvas!: HTMLCanvasElement;

	onMount(() => {
		let mounted = true;
		let gameEngine: GameEngine | null = null;
		const gameEnginePromise = GameEngine.initFromCanvas(canvas);

		let animationFrameHandle = -1;

		gameEnginePromise.then((engine) => {
			if (mounted) {
				gameEngine = engine;
				function run() {
					animationFrameHandle = requestAnimationFrame(run);

					engine.renderFrame();
				}
				run();
			} else {
				engine.dispose();
			}
		});

		return () => {
			if (gameEngine) {
				cancelAnimationFrame(animationFrameHandle);
				gameEngine.dispose();
			}
			mounted = false;
		};
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<canvas bind:this={canvas} width={256} height={256} />
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

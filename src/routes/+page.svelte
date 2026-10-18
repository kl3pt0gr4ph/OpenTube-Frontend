<script lang="ts">
	import KioskCarousel from '#lib/components/KioskCarousel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="w-full px-4 py-8">
	{#if data.sections.length === 0}
		<p class="py-16 text-center text-neutral-400">
			Nothing to show right now. The upstream feeds may be unavailable — try again shortly.
		</p>
	{:else}
		{#each data.sections as section (section.id)}
			<KioskCarousel title={section.title} videos={section.videos} />
		{/each}
	{/if}
</main>

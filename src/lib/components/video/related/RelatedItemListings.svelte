<script lang="ts">
	import RelatedVideoCard from './RelatedVideoCard.svelte';
	import RelatedPlaylistCard from './RelatedPlaylistCard.svelte';
	import RelatedChannelCard from './RelatedChannelCard.svelte';
	import type { RelatedItemConfig } from '#lib/adapters/related.js';

	let { items = [] }: { items?: RelatedItemConfig[] } = $props();
</script>

<div class="flex w-full flex-col gap-4 px-6">
	{#if items.length === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center py-8 text-center">
			<div class="mb-4 text-4xl">📹</div>
			<p class="text-secondary text-sm">No related Videos available</p>
		</div>
	{:else}
		{#each items as item (`${item.type}:${item.id}`)}
			{#if item.type === 'video'}
				<RelatedVideoCard video={item} />
			{:else if item.type === 'playlist'}
				<RelatedPlaylistCard playlist={item} />
			{:else}
				<RelatedChannelCard channel={item} />
			{/if}
		{/each}
	{/if}
</div>

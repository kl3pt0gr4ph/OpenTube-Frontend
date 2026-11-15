<script lang="ts">
	import ChannelEmptyState from '#lib/components/channel/ChannelEmptyState.svelte';
	import RelatedPlaylistCard from '#lib/components/video/related/RelatedPlaylistCard.svelte';
	import type { ChannelPlaylistConfig } from '#lib/adapters/channel.ts';

	let {
		playlists,
		tab = 'playlists'
	}: { playlists: ChannelPlaylistConfig[]; tab?: 'playlists' | 'albums' } = $props();
</script>

<div>
	{#if playlists.length === 0}
		<ChannelEmptyState icon="playlist" message={`No ${tab} available`} />
	{:else}
		<!-- px-4 plus the card's own mx-2 lines the grid up with the video grid's px-6 -->
		<div class="grid grid-cols-1 gap-4 px-4 pb-8 md:grid-cols-2 xl:grid-cols-3">
			{#each playlists as playlist (playlist.id)}
				<RelatedPlaylistCard {playlist} />
			{/each}
		</div>
	{/if}
</div>

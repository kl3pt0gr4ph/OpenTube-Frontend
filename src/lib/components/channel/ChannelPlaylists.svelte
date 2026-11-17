<script lang="ts">
	import ChannelEmptyState from '#lib/components/channel/ChannelEmptyState.svelte';
	import ChannelPlaylistCard from '#lib/components/channel/ChannelPlaylistCard.svelte';
	import type { ChannelPlaylistConfig } from '#lib/adapters/channel.js';

	let {
		playlists,
		tab = 'playlists'
	}: { playlists: ChannelPlaylistConfig[]; tab?: 'playlists' | 'albums' } = $props();
</script>

<div>
	{#if playlists.length === 0}
		<ChannelEmptyState icon="playlist" message={`No ${tab} available`} />
	{:else}
		<!-- Same grid as ChannelVideos, so the tabs line up -->
		<div class="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each playlists as playlist (playlist.id)}
				<ChannelPlaylistCard {playlist} album={tab === 'albums'} />
			{/each}
		</div>
	{/if}
</div>

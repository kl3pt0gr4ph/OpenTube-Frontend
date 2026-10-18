<script lang="ts">
	import type { PageData } from './$types';
	import VideoResult from '#lib/components/search/VideoResult.svelte';
	import ErrorCard from '#lib/components/ErrorCard.svelte';
	import ChannelResult from '#lib/components/search/ChannelResult.svelte';
	import PlaylistResult from '#lib/components/search/PlaylistResult.svelte';
	import type { NextPage } from '#lib/api/types.js';
	import { getSearchResultsNextPage } from '#lib/api/search.js';
	import { adaptSearchResults, type SearchResultConfig } from '#lib/adapters/search.js';
	import thumbnailPlaceholder from '#lib/assets/placeholders/thumbnailFallback.svg?raw';
	import avatarPlaceholder from '#lib/assets/placeholders/logofallback.svg?raw';

	let { data }: { data: PageData } = $props();

	let results = $derived(data.results);
	let query = $derived(data.query);
	let error = $derived(data.error);
	let sortFilter = $derived(data.sortFilter ?? 'asc');

	let items = $state<SearchResultConfig[]>([]);
	let nextPage = $state<NextPage | null>(null);
	let loadingMore = $state(false);
	let loadMoreError = $state<string | null>(null);

	$effect(() => {
		items = data.results?.items ?? [];
		nextPage = data.results?.nextPage ?? null;
		loadMoreError = null;
	});

	let hasResults = $derived(results && items.length > 0);

	async function loadMore(): Promise<void> {
		if (!nextPage || loadingMore) return;

		loadingMore = true;
		loadMoreError = null;
		try {
			const nextPageData = await getSearchResultsNextPage(
				query,
				nextPage.url,
				nextPage.id ?? '',
				sortFilter
			);
			const adapted = adaptSearchResults(nextPageData, thumbnailPlaceholder, avatarPlaceholder);
			items = [...items, ...adapted.items];
			nextPage = adapted.nextPage;
		} catch (err) {
			loadMoreError = err instanceof Error ? err.message : 'Failed to load more results';
		} finally {
			loadingMore = false;
		}
	}
</script>

<!-- Content States -->
<div class="container mx-auto w-full max-w-7xl px-4 py-8">
	{#if query}
		<h1 class="text-primary mb-6 text-xl font-bold sm:text-2xl">
			Search Results for "{query}"
		</h1>
	{/if}

	<!-- Error State -->
	{#if error}
		<ErrorCard variant="error" title="Search Error" message={error}>
			<p class="text-secondary mt-4 text-sm">Please try again later.</p>
		</ErrorCard>

		<!-- Empty Query State -->
	{:else if !query}
		<ErrorCard
			variant="empty"
			title="No Search Query"
			message="Enter a search query to find videos"
		/>

		<!-- No Results State -->
	{:else if !hasResults}
		<div class="py-6 text-center">
			<h2 class="text-primary text-xl font-bold">No results found</h2>
			<p class="text-secondary text-md mt-1">Try different keywords or check your spelling.</p>
		</div>

		<!-- Results List -->
	{:else}
		<div class="space-y-4">
			{#each items as result (result.id)}
				{#if result.type === 'channel'}
					<ChannelResult {result} />
				{:else if result.type === 'playlist'}
					<PlaylistResult {result} />
				{:else}
					<VideoResult {result} />
				{/if}
			{/each}
		</div>

		<!-- Results Count -->
		<div class="mt-8 text-center">
			<p class="text-secondary text-sm">
				Showing {items.length} result{items.length !== 1 ? 's' : ''}
			</p>

			{#if loadMoreError}
				<p class="text-sm text-red-500">{loadMoreError}</p>
			{/if}

			{#if nextPage}
				<button
					type="button"
					class="btn-primary rounded px-4 py-2 text-sm disabled:opacity-50"
					onclick={loadMore}
					disabled={loadingMore}
				>
					{loadingMore ? 'Loading…' : 'Load more'}
				</button>
			{/if}
		</div>
	{/if}
</div>

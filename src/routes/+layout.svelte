<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import 'shaka-player/dist/controls.css';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import favicon from '#lib/assets/streaming-logo.png';
	import Navbar from '#lib/components/navbar/Navbar.svelte';
	import SearchResultsLoading from '#lib/components/search/SearchResultsLoading.svelte';
	import VideoLoading from '#lib/components/video/VideoLoading.svelte';
	import VideoListingsLoading from '#lib/components/video/VideoListingsLoading.svelte';
	import ChannelLoading from '#lib/components/channel/ChannelLoading.svelte';
	import Loading from '#lib/components/Loading.svelte';
	import LandingLoading from '#lib/components/LandingLoading.svelte';

	const SKELETON_ROUTES = new Set(['/results', '/video/[id]', '/channel/[channelId]']);

	// This is so the generic loader does not show for fast page navigation
	const GENERIC_LOADER_DELAY_MS = 200;

	// Navigation state
	let isNavigating = $state(false);
	let targetRouteId = $state<string | null>(null);

	beforeNavigate((navigation) => {
		if (navigation.to && navigation.willUnload) {
			isNavigating = true;
			targetRouteId = navigation.to.route.id;
		}
	});

	afterNavigate(() => {
		targetRouteId = null;
	});

	/**
	 * Determine which loading skeleton to show based on navigation target
	 *
	 * Route patterns:
	 *  - '/' -> Landing page
	 *  - '/results' -> Search results page
	 *  - '/video/[id]' -> Video player page
	 *  - '/channel/[channelId]' -> Channel page
	 *  - anything else -> generic loader
	 */
	const isNavigatingToLanding = $derived(isNavigating && targetRouteId === '/');
	const isNavigatingToSearch = $derived(isNavigating && targetRouteId === '/results');
	const isNavigatingToVideo = $derived(isNavigating && targetRouteId === '/video/[id]');
	const isNavigatingToChannel = $derived(isNavigating && targetRouteId === '/channels/[channelId]');
	const isNavigatingToOther = $derived(
		isNavigating && targetRouteId !== null && !SKELETON_ROUTES.has(targetRouteId)
	);

	let showGenericLoader = $state(false);

	$effect(() => {
		if (!isNavigatingToOther) {
			showGenericLoader = false;
			return;
		}
		const timer = setTimeout(() => (showGenericLoader = true), GENERIC_LOADER_DELAY_MS);
		return () => clearTimeout(timer);
	});

	const displayedRouteId = $derived(
		targetRouteId && (SKELETON_ROUTES.has(targetRouteId) || showGenericLoader)
			? targetRouteId
			: page.route.id
	);

	const isLanding = $derived(displayedRouteId === '/');

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>OpenTube</title>
	<meta name="description" content="Free video on demand service for YouTube content" />
</svelte:head>

<div class="bg-primary min-h-screen">
	<div class={isLanding ? 'w-full' : 'mx-auto max-w-480'}>
		<div class="fixed inset-x-0 top-0 z-40">
			<Navbar />
		</div>
		{#if isNavigatingToLanding}
			<div class="pt-16">
				<LandingLoading />
			</div>
		{:else if isNavigatingToSearch}
			<div class="pt-16">
				<SearchResultsLoading count={10} />
			</div>
		{:else if isNavigatingToVideo}
			<div class="mt-4 flex min-h-screen w-full pt-16">
				<section class="flex w-full flex-col items-start justify-start lg:w-2/3">
					<div class="w-full p-4 sm:p-6 lg:p-8">
						<VideoLoading />
					</div>
				</section>
				<aside class="mt-4 hidden flex-col gap-5 pt-16 lg:flex lg:w-1/3">
					<VideoListingsLoading />
				</aside>
			</div>
		{:else if isNavigatingToChannel}
			<div class="pt-16">
				<ChannelLoading />
			</div>
		{:else if showGenericLoader}
			<div class="pt-16">
				<Loading />
			</div>
		{:else}
			<div class="pt-16">
				{@render children?.()}
			</div>
		{/if}
	</div>
</div>

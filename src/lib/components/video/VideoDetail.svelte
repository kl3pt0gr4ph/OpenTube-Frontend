<script lang="ts">
	import roundLogo from '#lib/assets/placeholders/logofallback.svg';
	import { sanitizeHtml } from '#lib/sanitize.js';
	import type { VideoMetadata } from '#lib/adapters/metadata.js';

	let { metadata }: { metadata: VideoMetadata } = $props();

	let displayAvatar = $derived(metadata.channelAvatar || roundLogo);
	let isExpanded = $state(false);

	const COLLAPSED_HEIGHT = 100;

	/**
	 * Format view count with locale specific number formatting
	 */
	const formatViewCount = (viewCount: number): string => {
		const formatter = Intl.NumberFormat('en-US');
		return formatter.format(Math.floor(viewCount));
	};

	const toggleExpanded = () => {
		isExpanded = !isExpanded;
	};
</script>

<div>
	<div>
		<h2 class="text-primary mt-3 mb-3 text-2xl font-bold">{metadata.title}</h2>
	</div>
	<div class="grid grid-cols-2 gap-3">
		<div class="col-spacn-2 flex items-center space-x-3">
			<img
				src={displayAvatar}
				alt={metadata.channelName}
				class="h-8 w-8 rounded-full object-cover"
			/>
			<h3 class="text-md text-primary font-semibold">{metadata.channelName}</h3>
			<button
				type="button"
				class="bg-accent hover:bg-accent-hover focus-visible:outline-accent rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
				>Subscribe</button
			>
		</div>
	</div>
	<div>
		<div class="bg-card border-default mt-6 border shadow-sm sm:rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				<h3 class="text-primary text-base font-semibold">
					{formatViewCount(metadata.viewCount)} views
				</h3>
				<div class="text-secondary relative mt-2 text-sm">
					<div
						class="overflow-hidden transition-all duration-300 ease-in-out"
						style={isExpanded ? '' : `max-height: ${COLLAPSED_HEIGHT}px;`}
					>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<p>{@html sanitizeHtml(metadata.description)}</p>
					</div>
					{#if !isExpanded}
						<div
							class="from-card pointer-events-none absolute right-0 bottom-0 left-0 h-12 bg-linear-to-t to-transparent"
						></div>
					{/if}
				</div>
				<button
					type="button"
					onclick={toggleExpanded}
					class="text-accent hover:text-accent-hover focus-visible:outline-accent mt-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					{isExpanded ? 'Show less' : 'Show more'}
				</button>
			</div>
		</div>
	</div>
</div>

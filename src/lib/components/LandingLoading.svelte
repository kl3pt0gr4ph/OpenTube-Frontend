<script lang="ts">
	let { sections = 3, cardsPerSection = 8 }: { sections?: number; cardsPerSection?: number } =
		$props();
</script>

<div class="w-full px-4 py-8" aria-busy="true" aria-live="polite">
	<span class="sr-only">Loading…</span>

	{#each Array.from({ length: sections }, (_, i) => i) as s (s)}
		<!-- Matches KioskCarousel section layout -->
		<section class="mb-10" aria-hidden="true">
			<!-- Header: title + scroll buttons -->
			<div class="mb-3 flex items-center justify-between gap-4 px-1">
				<div class="h-6 w-48 animate-pulse rounded bg-gray-700"></div>
				<div class="flex items-center gap-2">
					<div class="hidden size-8 animate-pulse rounded-full bg-gray-700 sm:block"></div>
					<div class="hidden size-8 animate-pulse rounded-full bg-gray-700 sm:block"></div>
				</div>
			</div>

			<!-- Track: overflow hidden so extra cards are clipped like the real carousel -->
			<div class="flex gap-4 overflow-hidden pb-2">
				{#each Array.from({ length: cardsPerSection }, (_, i) => i) as c (c)}
					<div class="w-64 shrink-0 sm:w-72">
						<!-- Thumbnail -->
						<div class="aspect-video w-full animate-pulse rounded-lg bg-gray-700"></div>

						<!-- Title (2 lines) -->
						<div class="mt-2 space-y-1.5">
							<div class="h-4 w-full animate-pulse rounded bg-gray-700"></div>
							<div class="h-4 w-3/4 animate-pulse rounded bg-gray-700"></div>
						</div>

						<!-- Channel -->
						<div class="mt-2 flex items-center gap-2">
							<div class="size-6 shrink-0 animate-pulse rounded-full bg-gray-700"></div>
							<div class="h-3 w-24 animate-pulse rounded bg-gray-700"></div>
						</div>

						<!-- Views · date -->
						<div class="mt-2 h-3 w-28 animate-pulse rounded bg-gray-700"></div>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>

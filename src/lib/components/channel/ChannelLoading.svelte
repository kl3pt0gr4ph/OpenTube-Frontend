<script lang="ts">
	let { count = 12 }: { count?: number } = $props();
</script>

<div class="flex w-full flex-col" aria-busy="true" aria-live="polite">
	<span class="sr-only">Loading channel…</span>

	<!-- Banner skeleton (matches ChannelDetails banner sizing) -->
	<div
		class="w-full animate-pulse overflow-hidden bg-gray-800"
		style="aspect-ratio: 32/9; max-height: 200px;"
	></div>

	<!-- Header skeleton -->
	<div class="px-6 pt-3 pb-4">
		<div class="flex items-start gap-4">
			<!-- Avatar -->
			<div class="z-10 -mt-10 shrink-0">
				<div
					class="h-20 w-20 animate-pulse rounded-full border-4 border-(--color-bg,#fff) bg-gray-700 shadow-sm"
				></div>
			</div>

			<!-- Name / meta / description -->
			<div class="mt-2 flex min-w-0 flex-1 flex-col">
				<!-- Channel name -->
				<div class="h-6 w-48 animate-pulse rounded bg-gray-700"></div>

				<!-- Handle · subscribers · videos -->
				<div class="mt-2 flex items-center gap-2">
					<div class="h-3 w-24 animate-pulse rounded bg-gray-700"></div>
					<div class="h-3 w-28 animate-pulse rounded bg-gray-700"></div>
					<div class="h-3 w-20 animate-pulse rounded bg-gray-700"></div>
				</div>

				<!-- Description -->
				<div class="mt-3 max-w-2xl space-y-2">
					<div class="h-3 w-full animate-pulse rounded bg-gray-700"></div>
					<div class="h-3 w-3/4 animate-pulse rounded bg-gray-700"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Tab bar (static labels so the bar doesn't jump when real tabs mount) -->
	<div class="border-default border-b px-6">
		<div class="flex" aria-hidden="true">
			<div class="text-primary relative px-4 py-3 text-sm font-medium">
				Videos
				<span class="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t-sm"></span>
			</div>
			<div class="text-secondary px-4 py-3 text-sm font-medium">Playlists</div>
		</div>
	</div>

	<!-- Video grid skeleton (matches ChannelVideos grid) -->
	<div class="mt-6">
		<div class="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array.from({ length: count }, (_, i) => i) as i (i)}
				<div class="flex flex-col gap-2 rounded-lg p-2">
					<!-- Thumbnail -->
					<div class="aspect-video w-full animate-pulse rounded-lg bg-gray-700"></div>

					<!-- Info -->
					<div class="flex flex-col gap-2">
						<div class="h-4 w-full animate-pulse rounded bg-gray-700"></div>
						<div class="h-4 w-4/5 animate-pulse rounded bg-gray-700"></div>
						<div class="mt-1 flex items-center gap-2">
							<div class="h-3 w-16 animate-pulse rounded bg-gray-700"></div>
							<div class="h-3 w-20 animate-pulse rounded bg-gray-700"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
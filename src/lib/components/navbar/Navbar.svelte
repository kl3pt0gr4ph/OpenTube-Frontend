<script lang="ts">
	import { goto } from '$app/navigation';
	import logo from '../../assets/streaming-logo.png';
	import ThemeToggle from './ThemeToggle.svelte';
	import { resolve } from '$app/paths';

	let query = $state('');
	let showMobileSearch = $state(false);

	function executeSearch() {
		if (!query.trim()) return;

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`${resolve('results')}?query=${encodeURIComponent(query.trim())}`);
		showMobileSearch = false; // Close mobile search after search
	}

	function handleKey(event: KeyboardEvent) {
		if (event.key === 'Enter') executeSearch();
	}

	function toggleMobileSearch() {
		showMobileSearch = !showMobileSearch;
	}
</script>

<nav class="bg-navbar border-default relative border-b">
	<div class="mx-auto px-2 sm:px-4 lg:px-8">
		<div class="flex h-14 items-center justify-between">
			<!-- Logo -->
			<div class="flex shrink-0 px-2 lg:px-0">
				<div class="flex items-center">
					<a href={resolve('/')}>
						<img src={logo} alt="OpenTube" class="h-11 w-auto dark:hidden" />
						<img src={logo} alt="OpenTube" class="h-11 w-auto not-dark:hidden" />
					</a>
				</div>
			</div>

			<!-- Desktop Search - Hidden on mobile -->
			<div class="hidden flex-1 items-center justify-center px-2 md:flex lg:ml-6">
				<div class="grid w-full max-w-lg grid-cols-1">
					<input
						type="search"
						name="search"
						bind:value={query}
						onkeydown={handleKey}
						placeholder="Search"
						class="bg-card text-primary border-default placeholder:text-muted focus:border-accent col-start-1 row-start-1 block w-full rounded-md border py-1.5 pr-3 pl-10 text-base focus:outline-2 focus:-outline-offset-2 sm:text-sm/6"
					/>
					<svg
						viewBox="0 0 20 20"
						fill="currentColor"
						data-slot="icon"
						aria-hidden="true"
						class="text-muted pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center"
					>
						<path
							d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
							clip-rule="evenodd"
							fill-rule="evenodd"
						></path>
					</svg>
				</div>
			</div>

			<!-- Right side buttons -->
			<div class="flex items-center gap-2">
				<!-- Mobile Search Button -->
				<button
					type="button"
					class="text-secondary hover:bg-secondary hover:text-primary focus:border-accent relative inline-flex items-center justify-center rounded-md p-2 focus:outline-2 focus:-outline-offset-1 md:hidden"
					onclick={toggleMobileSearch}
					aria-label="Search"
				>
					<svg viewBox="0 0 20 20" fill="currentColor" class="size-5">
						<path
							d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
							clip-rule="evenodd"
							fill-rule="evenodd"
						></path>
					</svg>
				</button>

				<!-- Theme toggle button -->
				<ThemeToggle />
			</div>
		</div>

		<!-- Mobile Search Dropdown -->
		{#if showMobileSearch}
			<div class="border-default border-t px-2 py-3 md:hidden">
				<div class="grid grid-cols-1">
					<input
						type="search"
						name="mobile-search"
						bind:value={query}
						onkeydown={handleKey}
						placeholder="Search"
						class="bg-card text-primary border-default placeholder:text-muted focus:border-accent col-start-1 row-start-1 block w-full rounded-md border py-1.5 pr-3 pl-10 text-base focus:outline-2 focus:-outline-offset-2"
					/>
					<svg
						viewBox="0 0 20 20"
						fill="currentColor"
						data-slot="icon"
						aria-hidden="true"
						class="text-muted pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center"
					>
						<path
							d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
							clip-rule="evenodd"
							fill-rule="evenodd"
						></path>
					</svg>
				</div>
			</div>
		{/if}
	</div>

	<!-- Accent strip at bottom -->
	<div class="bg-accent absolute inset-x-0 bottom-0 h-0.5"></div>
</nav>

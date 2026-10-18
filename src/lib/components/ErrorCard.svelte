<script lang="ts">
	import type { Snippet } from 'svelte';

	import errorIcon from '#lib/assets/icons/error.svg?raw';
	import warningIcon from '#lib/assets/icons/warning.svg?raw';
	import infoIcon from '#lib/assets/icons/info.svg?raw';
	import emptyIcon from '#lib/assets/icons/error.svg?raw';

	type Variant = 'error' | 'warning' | 'info' | 'empty';

	let {
		variant = 'error',
		title,
		message,
		icon,
		showRetry = false,
		onRetry = null,
		children
	}: {
		variant?: Variant;
		title: string;
		message: string | null;
		icon?: Snippet;
		showRetry?: boolean;
		onRetry?: (() => void) | null;
		children?: Snippet;
	} = $props();

	// Default icons for each variant
	const defaultIcons = {
		error: errorIcon,
		warning: warningIcon,
		info: infoIcon,
		empty: emptyIcon
	};

	const tone: Record<Variant, string> = {
		error: 'text-accent',
		warning: 'text-amber-400',
		info: 'text-muted',
		empty: 'text-muted'
	};

	let showButton = $derived(showRetry && !!onRetry);
</script>

<div
	role={variant === 'error' ? 'alert' : 'status'}
	class="error-card mx-auto w-full max-w-2xl rounded-xl border p-5 sm:p-6 {tone[variant]}"
>
	<div class="flex items-start gap-5">
		<div class="flex size-14 shrink-0 items-center justify-center" aria-hidden="true">
			{#if icon}
				{@render icon()}
			{:else}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html defaultIcons[variant]}
			{/if}
		</div>

		<div class="min-w-0 flex-1 pt-1.5">
			<h2 class="text-primary text-xl leading-tight font-semibold">
				{title}
			</h2>

			{#if message}
				<p class="text-secondary mt-1.5 text-base">
					{message}
				</p>
			{/if}

			{#if children || showButton}
				<div class="error-card-divider text-secondary mt-4 border-t pt-4 text-sm">
					{@render children?.()}

					{#if showButton}
						<button
							type="button"
							class="bg-accent hover:bg-accent-hover focus-visible:outline-accent rounded-md px-4 py-1.5 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 {children
								? 'mt-3'
								: ''}"
							onclick={onRetry}
						>
							Retry
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.error-card {
		border-color: color-mix(in srgb, currentColor 35%, transparent);
		background-color: color-mix(in srgb, currentColor 6%, transparent);
	}

	.error-card-divider {
		border-color: color-mix(in srgb, currentColor 15%, transparent);
	}
</style>

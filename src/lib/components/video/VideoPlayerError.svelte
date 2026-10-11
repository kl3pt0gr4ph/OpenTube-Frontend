<script lang="ts">
	import infoIcon from '$lib/assets/icons/info.svg?raw';
	import warningIcon from '$lib/assets/icons/warning.svg?raw';
	import errorIcon from '$lib/assets/icons/error.svg?raw';
	import refreshIcon from '$lib/assets/icons/refresh.svg?raw';

	type IconVariant = 'info' | 'warning' | 'error';

	const CATEGORY: Record<number, string> = {
		1: 'NETWORK',
		2: 'TEXT',
		3: 'MEDIA',
		4: 'MANIFEST',
		5: 'STREAMING',
		6: 'DRM',
		7: 'PLAYER',
		8: 'CAST',
		9: 'STORAGE'
	};

	const UNSUPPORTED_CONTENT_CODES = new Set([4011, 4032]);

	const ICONS: Record<IconVariant, string> = {
		info: infoIcon,
		warning: warningIcon,
		error: errorIcon
	};

	export interface ShakaErrorDetail {
		category: number;
		code: number;
		severity: number;
	}

	function getIconVariant(code: number, severity: number): IconVariant {
		if (UNSUPPORTED_CONTENT_CODES.has(code)) return 'info';
		return severity === 2 ? 'error' : 'warning';
	}

	interface Props {
		error: ShakaErrorDetail;
		onRetry: () => void;
		retrying?: boolean;
	}

	let { error, onRetry, retrying = false }: Props = $props();

	function getMessage(category: number, code: number): { title: string; body: string } {
		if (UNSUPPORTED_CONTENT_CODES.has(code)) {
			return {
				title: 'Format Not Supported',
				body: "This browser can't play any of the formats available for this video. Try a different browser."
			};
		}

		switch (category) {
			case 1: // NETWORK
				return {
					title: 'Network Error',
					body: 'Something went wrong fetching the stream. Check your connection and try again.'
				};
			case 4: // MANIFEST
				return {
					title: 'Stream Unavailable',
					body: 'The video manifest could not be loaded. The stream may be unavailable or restricted.'
				};
			case 3: // MEDIA
				return {
					title: 'Media Error',
					body: "There was a problem decoding the video. Your browser may not support this stream's format."
				};
			case 6: // DRM
				return {
					title: 'DRM Error',
					body: 'A content protection error occurred. This stream may use unsupported DRM.'
				};
			case 5: // STREAMING
				return {
					title: 'Streaming Error',
					body: 'Playback was interrupted. The stream may have stalled or encountered a segment error.'
				};
			default:
				return {
					title: 'Playback Error',
					body: 'An unexpected error occurred while loading the video.'
				};
		}
	}

	let { title, body } = $derived(getMessage(error.category, error.code));
	let canRetry = $derived(!UNSUPPORTED_CONTENT_CODES.has(error.code));
	let categoryName = $derived(CATEGORY[error.category] ?? 'UNKNOWN');
	let iconVariant = $derived(getIconVariant(error.code, error.severity));
	let severityLabel = $derived(error.severity === 2 ? 'Critical' : 'Recoverable');
</script>

<!--
	Fills the same space as the <video> element (width:100%, aspect-ratio 16/9).
	Uses CSS variables so it inherits whatever theme the page sets.
-->
<div
	class="error-shell"
	role="alert"
	aria-live="assertive"
	aria-atomic="true"
	data-testid="video-player-error"
>
	<div class="error-icon error-icon--{iconVariant}" data-variant={iconVariant} aria-hidden="true">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted local asset -->
		{@html ICONS[iconVariant]}
	</div>

	<h3 class="error-title">{title}</h3>
	<p class="error-body">{body}</p>

	<p
		class="error-debug"
		aria-label="Debug: error category {categoryName}, code {error.code}, severity {severityLabel}"
	>
		{categoryName}/{error.code} &bull; {severityLabel}
	</p>

	{#if canRetry}
		<button
			class="retry-btn"
			onclick={onRetry}
			disabled={retrying}
			aria-label={retrying ? 'Retrying, please wait' : 'Retry loading the video'}
		>
			{#if retrying}
				<span class="spinner" aria-hidden="true"></span>
				Retrying…
			{:else}
				<!-- Refresh icon -->
				<span class="retry-icon" aria-hidden="true">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted local asset -->
					{@html refreshIcon}
				</span>
				Try again
			{/if}
		</button>
	{/if}
</div>

<style>
	.error-shell {
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #0a0a0a;

		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		text-align: center;
		box-sizing: border-box;

		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.error-icon {
		width: 3rem;
		height: 3rem;
		flex-shrink: 0;
		margin-bottom: 0.25rem;
	}

	.error-icon--info {
		color: #60a5fa; /* blue-400 */
	}

	.error-icon--warning {
		color: #f97316; /* orange-500 */
	}

	.error-icon--error {
		color: #ef4444; /* red-500 */
	}

	/* :global because {@html} content doesn't get Svelte's scoping class */
	.error-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.error-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #f4f4f5; /* zinc-100 */
		letter-spacing: -0.01em;
	}

	.error-body {
		margin: 0;
		font-size: 0.875rem;
		color: #a1a1aa; /* zinc-400 */
		max-width: 36ch;
		line-height: 1.5;
	}

	.error-debug {
		margin: 0;
		font-size: 0.7rem;
		font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
		color: #52525b; /* zinc-600 */
		letter-spacing: 0.03em;
	}

	.retry-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.5rem;
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #18181b; /* zinc-900 */
		background: #f4f4f5; /* zinc-100 */
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease,
			transform 0.1s ease;
	}

	.retry-btn:hover:not(:disabled) {
		background: #ffffff;
		transform: translateY(-1px);
	}

	.retry-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.retry-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.retry-icon {
		display: inline-flex;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.retry-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.spinner {
		display: inline-block;
		width: 0.875rem;
		height: 0.875rem;
		border: 2px solid rgba(0, 0, 0, 0.2);
		border-top-color: #18181b;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Scale down gracefully on very small players (mobile, sidebar) */
	@media (max-width: 480px) {
		.error-title {
			font-size: 1rem;
		}
		.error-body {
			font-size: 0.8rem;
		}
	}
</style>

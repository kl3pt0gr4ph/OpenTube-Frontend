<script lang="ts">
	import logoPlaceholder from '#lib/assets/placeholders/logofallback.svg';
	import { HeartIcon, ThumbsUpIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-svelte';
	import { sanitizeHtml } from '#lib/sanitize.js';
	import type { CommentConfig } from '#lib/adapters/comments.js';

	interface Props {
		comment: CommentConfig;
		depth?: number;
	}

	let { comment, depth = 0 }: Props = $props();

	let showReplies = $state(false);
	let loadingReplies = $state(false);

	const maxDepth = 3; // Maximum nesting level for replies

	function toggleReplies() {
		if (comment.hasReplies && !showReplies) {
			loadingReplies = true;
			// TODO: Implement reply loading
			// For now, just toggle the state
			setTimeout(() => {
				showReplies = !showReplies;
				loadingReplies = false;
			}, 300);
		} else {
			showReplies = !showReplies;
		}
	}

	function handleAvatarError(e: Event) {
		(e.currentTarget as HTMLImageElement).src = logoPlaceholder;
	}
</script>

<div
	class="comment-container"
	class:ml-8={depth > 0}
	class:ml-12={depth > 1}
	style="border-left: {depth > 0
		? '2px solid rgb(var(--color-border) / 0.3)'
		: 'none'}; padding-left: {depth > 0 ? '1rem' : '0'}"
>
	<div class="flex gap-3 py-4">
		<!-- Avatar -->
		<div class="shrink-0">
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a href={comment.authorUrl} target="_blank" rel="noopener noreferrer">
				<img
					src={comment.authorAvatar || logoPlaceholder}
					alt="{comment.author}-avatar"
					class="h-10 w-10 rounded-full object-cover"
					onerror={handleAvatarError}
				/>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>

		<!-- Comment Content -->
		<div class="min-w-0 flex-1">
			<!-- Author and Date -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<div class="mb-1 flex flex-wrap items-center gap-2">
				<a
					href={comment.authorUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm font-semibold hover:underline"
				>
					{comment.author}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->

				{#if comment.isVerified}
					<svg
						class="h-4 w-4 text-gray-500"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-label="Verified"
					>
						<path
							d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
						/>
					</svg>
				{/if}

				{#if comment.isChannelOwner}
					<span class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium dark:bg-gray-700">
						Creator
					</span>
				{/if}

				<span class="text-xs text-gray-600 dark:text-gray-400">
					{comment.uploadDate}
				</span>

				{#if comment.isPinned}
					<span class="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
							<path
								d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"
							/>
						</svg>
						Pinned
					</span>
				{/if}
			</div>

			<!-- Comment Text -->
			<div class="mb-2 text-sm wrap-break-word whitespace-pre-wrap">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html sanitizeHtml(comment.text)}
			</div>

			<!-- Actions -->
			<div class="flex items-center gap-4 text-xs">
				<button
					class="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
				>
					<ThumbsUpIcon class="h-4 w-4" />
					<span>{comment.likeCountText}</span>
				</button>

				{#if comment.isHearted}
					<div class="flex items-center gap-1 text-red-500" title="Hearted by creator">
						<HeartIcon class="h-4 w-4 fill-current" />
					</div>
				{/if}

				{#if comment.hasReplies && depth < maxDepth}
					<button
						onclick={toggleReplies}
						class="flex items-center gap-1 rounded px-2 py-1 font-medium text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-800"
						disabled={loadingReplies}
					>
						{#if loadingReplies}
							<span class="animate-pulse">Loading...</span>
						{:else}
							{#if showReplies}
								<ChevronUpIcon class="h-4 w-4" />
							{:else}
								<ChevronDownIcon class="h-4 w-4" />
							{/if}
							<span>
								{comment.replyCount}
								{comment.replyCount === 1 ? 'reply' : 'replies'}
							</span>
						{/if}
					</button>
				{/if}
			</div>

			<!-- Replies Section (placeholder for future implementation) -->
			{#if showReplies && comment.hasReplies}
				<div class="mt-4">
					<p class="text-sm text-gray-500 italic">
						Replies loading... (To be implemented with reply fetching)
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.comment-container {
		transition: background-color 0.2s ease;
	}

	.comment-container:hover {
		background-color: rgb(0 0 0 / 0.02);
	}

	:global(.dark) .comment-container:hover {
		background-color: rgb(255 255 255 / 0.02);
	}
</style>

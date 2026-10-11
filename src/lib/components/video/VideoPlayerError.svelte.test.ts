import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import VideoPlayerError from './VideoPlayerError.svelte';
import type { ShakaErrorDetail } from './VideoPlayerError.svelte';

const buildError = (overrides: Partial<ShakaErrorDetail> = {}): ShakaErrorDetail => ({
	category: 1,
	code: 1002,
	severity: 2,
	...overrides
});

const renderError = (
	error: Partial<ShakaErrorDetail> = {},
	props: { onRetry?: () => void; retrying?: boolean } = {}
) =>
	render(VideoPlayerError, {
		props: { error: buildError(error), onRetry: props.onRetry ?? vi.fn(), retrying: props.retrying }
	});

describe('VideoPlayerError', () => {
	it('announces itself as an assertive alert', () => {
		renderError();
		expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
	});

	describe('category → message mapping', () => {
		it.each([
			[1, 'Network Error', /check your connection/i, 'NETWORK'],
			[3, 'Media Error', /problem decoding/i, 'MEDIA'],
			[4, 'Stream Unavailable', /manifest could not be loaded/i, 'MANIFEST'],
			[5, 'Streaming Error', /playback was interrupted/i, 'STREAMING'],
			[6, 'DRM Error', /content protection/i, 'DRM'],
			[2, 'Playback Error', /unexpected error/i, 'TEXT'],
			[7, 'Playback Error', /unexpected error/i, 'PLAYER']
		])('category %i → "%s" with %s pill', (category, title, body, pillName) => {
			renderError({ category, code: 42 });

			expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(title);
			expect(screen.getByText(body)).toBeInTheDocument();
			expect(screen.getByText(`${pillName}/42`, { exact: false })).toBeInTheDocument();
		});

		it('falls back to UNKNOWN for an unmapped category', () => {
			renderError({ category: 99, code: 7 });

			expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Playback Error');
			expect(screen.getByText('UNKNOWN/7', { exact: false })).toBeInTheDocument();
		});
	});

	describe('unsupported content', () => {
		it.each([
			[4032, 'CONTENT_UNSUPPORTED_BY_BROWSER'],
			[4011, 'UNPLAYABLE_PERIOD']
		])('code %i (%s) explains the browser cannot play the video and hides retry', (code) => {
			renderError({ category: 4, code });

			expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Format Not Supported');
			expect(screen.getByText(/can't play any of the formats/i)).toBeInTheDocument();
			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});
	});

	describe('severity label', () => {
		it.each([
			[2, 'Critical'],
			[1, 'Recoverable'],
			[0, 'Recoverable']
		])('severity %i → %s', (severity, label) => {
			renderError({ severity });
			expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
		});
	});

	describe('retry', () => {
		it('invokes onRetry when the retry button is clicked', async () => {
			const onRetry = vi.fn();
			renderError({}, { onRetry });

			await fireEvent.click(screen.getByRole('button', { name: 'Retry loading the video' }));

			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it('disables the button and shows the retrying state while retrying', async () => {
			const onRetry = vi.fn();
			renderError({}, { onRetry, retrying: true });

			const button = screen.getByRole('button', { name: 'Retrying, please wait' });
			expect(button).toBeDisabled();
			expect(button).toHaveTextContent('Retrying…');
			expect(screen.queryByText('Try again')).not.toBeInTheDocument();

			const user = userEvent.setup();
			await user.click(button);

			expect(onRetry).not.toHaveBeenCalled();
		});
	});
});

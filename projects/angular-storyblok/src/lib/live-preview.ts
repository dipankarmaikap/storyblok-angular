import { InjectionToken, Provider, inject, NgZone, PLATFORM_ID, Injectable } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { ISbStoryData } from '@storyblok/js';
import type { StoryblokFeature } from './storyblok-components';
import type StoryblokBridge from '@storyblok/preview-bridge';

/**
 * Configuration options for the Storyblok Live Preview bridge.
 */
export interface LivePreviewConfig {
  /**
   * Custom parent URL for the bridge (for cross-origin setups).
   * @example 'https://app.storyblok.com'
   */
  customParent?: string;

  /**
   * Automatically reload the page on 'published' and 'change' events.
   * @default true
   */
  autoReload?: boolean;
}

/**
 * Injection token for live preview configuration.
 * @internal
 */
export const LIVE_PREVIEW_CONFIG = new InjectionToken<LivePreviewConfig>('LIVE_PREVIEW_CONFIG');

/**
 * Injection token to check if live preview is enabled.
 */
export const LIVE_PREVIEW_ENABLED = new InjectionToken<boolean>('LIVE_PREVIEW_ENABLED');

/**
 * Callback function type for live preview updates.
 */
export type LivePreviewCallback = (story: ISbStoryData) => void;

/**
 * Error class for live preview configuration issues.
 */
export class LivePreviewNotEnabledError extends Error {
  constructor() {
    super(
      `[angular-storyblok] LivePreviewService requires withLivePreview() to be added to your providers.\n\n` +
        `Add it to your app.config.ts:\n\n` +
        `  provideStoryblok(\n` +
        `    { accessToken: 'your-token' },\n` +
        `    withStoryblokComponents({ ... }),\n` +
        `    withLivePreview()  // <-- Add this\n` +
        `  )\n`,
    );
    this.name = 'LivePreviewNotEnabledError';
  }
}

/**
 * Service for managing live preview functionality.
 *
 * **Important:** This service requires `withLivePreview()` to be added to your providers.
 * Without it, calling `enable()` will throw an error in development or silently no-op in production.
 *
 * @example
 * ```typescript
 * // 1. Add withLivePreview() to your providers (app.config.ts)
 * provideStoryblok(
 *   { accessToken: 'your-token' },
 *   withLivePreview()
 * )
 *
 * // 2. Use the service in your component
 * export class MyComponent implements OnInit {
 *   private livePreview = inject(LivePreviewService);
 *
 *   ngOnInit() {
 *     this.livePreview.enable((story) => this.story.set(story));
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class LivePreviewService {
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isEnabled = inject(LIVE_PREVIEW_ENABLED, { optional: true }) ?? false;
  private readonly config = inject(LIVE_PREVIEW_CONFIG, { optional: true });

  private bridge: StoryblokBridge | null = null;
  private bridgePromise: Promise<StoryblokBridge> | null = null;

  /**
   * Check if running in browser environment.
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Check if live preview feature is enabled.
   * Returns true if `withLivePreview()` was added to providers.
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Lazily load and get the Storyblok Bridge instance.
   */
  private async getBridge(): Promise<StoryblokBridge | null> {
    if (!this.isBrowser) {
      return null;
    }

    if (this.bridge) {
      return this.bridge;
    }

    if (this.bridgePromise) {
      return this.bridgePromise;
    }

    this.bridgePromise = this.loadBridge();
    return this.bridgePromise;
  }

  /**
   * Dynamically import and instantiate the bridge.
   */
  private async loadBridge(): Promise<StoryblokBridge> {
    const { default: StoryblokBridgeClass } = await import('@storyblok/preview-bridge');

    this.bridge = new StoryblokBridgeClass({
      customParent: this.config?.customParent,
    });

    return this.bridge;
  }

  /**
   * Enable live preview for real-time visual editing.
   * Listens for changes from the Storyblok Visual Editor and calls the callback.
   *
   * **Note:** Requires `withLivePreview()` to be added to your providers.
   * Without it, this method will:
   * - In development: throw `LivePreviewNotEnabledError` with setup instructions
   * - In production: silently no-op (no error thrown)
   *
   * @param callback - Function called when content is updated in the Visual Editor
   * @throws {LivePreviewNotEnabledError} In development mode if `withLivePreview()` is not configured
   *
   * @example
   * ```typescript
   * export class MyComponent implements OnInit {
   *   private livePreview = inject(LivePreviewService);
   *   readonly story = signal<ISbStoryData | null>(null);
   *
   *   ngOnInit() {
   *     this.livePreview.enable((updatedStory) => {
   *       this.story.set(updatedStory);
   *     });
   *   }
   * }
   * ```
   */
  async enable(callback: LivePreviewCallback): Promise<void> {
    // Skip on server-side rendering - live preview only works in browser
    if (!this.isBrowser) {
      return;
    }

    // Check if feature is enabled
    if (!this.isEnabled) {
      // In development, throw a helpful error
      if (typeof ngDevMode === 'undefined' || ngDevMode) {
        throw new LivePreviewNotEnabledError();
      }
      // In production, silently no-op (don't crash the app)
      return;
    }

    const bridge = await this.getBridge();
    if (!bridge) {
      return;
    }

    const autoReload = this.config?.autoReload ?? true;

    bridge.on(['published', 'change', 'input'], (event) => {
      if (event.action === 'input') {
        // Run callback in NgZone for proper change detection
        this.ngZone.run(() => callback(event.story as unknown as ISbStoryData));
      } else if (autoReload && (event.action === 'published' || event.action === 'change')) {
        window.location.reload();
      }
    });
  }
}

/**
 * Enables live preview functionality for the Storyblok Visual Editor.
 *
 * This feature is optional and tree-shakeable. Only include it if you need
 * real-time preview in the Visual Editor. The bridge code is lazily loaded
 * only when `LivePreviewService.enable()` is called.
 *
 * @param config - Optional configuration for the live preview bridge
 * @returns A feature to pass to `provideStoryblok()`
 *
 * @example
 * ```typescript
 * // Basic usage
 * provideStoryblok(
 *   { accessToken: 'your-token' },
 *   withStoryblokComponents({ ... }),
 *   withLivePreview()
 * )
 *
 * // With custom configuration
 * provideStoryblok(
 *   { accessToken: 'your-token' },
 *   withStoryblokComponents({ ... }),
 *   withLivePreview({
 *     customParent: 'https://app.storyblok.com',
 *     autoReload: false
 *   })
 * )
 * ```
 */
export function withLivePreview(config?: LivePreviewConfig): StoryblokFeature {
  // Only provide the tokens - the service is providedIn: 'root'
  // This enables the feature and passes configuration
  const providers: Provider[] = [
    { provide: LIVE_PREVIEW_ENABLED, useValue: true },
    { provide: LIVE_PREVIEW_CONFIG, useValue: config ?? {} },
  ];

  return {
    ɵkind: 'components', // Reusing the feature kind for now
    ɵproviders: providers,
  };
}

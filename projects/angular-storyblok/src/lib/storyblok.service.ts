import {
  Injectable,
  inject,
  PLATFORM_ID,
  InjectionToken,
  makeEnvironmentProviders,
  provideAppInitializer,
  NgZone,
  type EnvironmentProviders,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StoryblokFeature } from './storyblok-components';
import StoryblokClient, { type ISbConfig } from 'storyblok-js-client';
import type { ISbStoryData } from '@storyblok/js';
import { LIVE_PREVIEW_ENABLED } from './live-preview';

/**
 * Options for fetching stories from the Storyblok API.
 */
export interface StoryblokApiOptions {
  /** Content version: 'draft' for preview, 'published' for production */
  version?: 'draft' | 'published';
  /** Resolve relations by component and field name */
  resolve_relations?: string;
  /** Resolve internal links */
  resolve_links?: 'url' | 'story' | 'link';
}

/**
 * Injection token for Storyblok configuration
 */
export const STORYBLOK_CONFIG = new InjectionToken<ISbConfig>('STORYBLOK_CONFIG');

/**
 * Provides Storyblok configuration at the application level.
 * Use this in your app.config.ts to initialize Storyblok.
 *
 * @param config - Storyblok configuration options
 * @param features - Optional features like `withStoryblokComponents()`
 * @returns EnvironmentProviders for Angular's DI system
 *
 * @example
 * ```typescript
 * import { provideStoryblok, withStoryblokComponents } from 'angular-storyblok';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideStoryblok(
 *       { accessToken: 'your-access-token', region: 'eu' },
 *       withStoryblokComponents({
 *         teaser: () => import('./components/teaser').then(m => m.Teaser),
 *         feature: () => import('./components/feature').then(m => m.Feature),
 *       })
 *     ),
 *   ],
 * };
 * ```
 */
export function provideStoryblok(
  config: ISbConfig,
  ...features: StoryblokFeature[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: STORYBLOK_CONFIG, useValue: config },
    provideAppInitializer(() => {
      const storyblok = inject(StoryblokService);
      storyblok.ɵinit(config);
    }),
    // Collect providers from all features
    ...features.flatMap((feature) => feature.ɵproviders),
  ]);
}

/**
 * Core service for interacting with the Storyblok API.
 * Provides methods for fetching stories and integrating with the Visual Editor.
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   private storyblok = inject(StoryblokService);
 *
 *   async loadContent() {
 *     const story = await this.storyblok.getStory('home');
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class StoryblokService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly livePreviewEnabled = inject(LIVE_PREVIEW_ENABLED, { optional: true });
  private storyblok: StoryblokClient | null = null;
  private initialized = false;

  /**
   * @internal
   * Initialize Storyblok SDK with the provided configuration.
   * This is called automatically by `provideStoryblok()`.
   */
  /** @internal */
  ɵinit(config: ISbConfig): void {
    if (this.initialized) {
      return;
    }
    const storyblok = new StoryblokClient(config);
    this.storyblok = storyblok;
    this.initialized = true;
  }

  /**
   * Check if running in browser environment.
   */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Fetch a single story by its slug.
   *
   * @param slug - The story slug (e.g., 'home', 'about', 'blog/my-post')
   * @param options - API options for resolving relations and links
   * @returns The story data or null if not found
   */
  async getStory(slug: string, options: StoryblokApiOptions = {}): Promise<ISbStoryData | null> {
    if (!this.storyblok) {
      console.error('Storyblok API not initialized. Call init() first.');
      return null;
    }
    try {
      const response = await this.storyblok.get(`cdn/stories/${slug}`, {
        version: options.version ?? 'draft',
        resolve_relations: options.resolve_relations,
        resolve_links: options.resolve_links,
      });

      return response.data?.story ?? null;
    } catch (error) {
      console.error(`Failed to fetch story: ${slug}`, error);
      return null;
    }
  }

  /**
   * @deprecated Use `LivePreviewService` from `withLivePreview()` feature instead.
   *
   * Enable the Storyblok Bridge for real-time visual editing.
   * Only works in browser environment.
   *
   * @param callback - Function called when the story is updated in the Visual Editor
   * @param options - Bridge configuration options
   *
   * @example
   * ```typescript
   * // New recommended approach:
   * // 1. Add withLivePreview() to your providers
   * provideStoryblok(
   *   { accessToken: 'your-token' },
   *   withLivePreview()
   * )
   *
   * // 2. Use LivePreviewService in your component
   * private livePreview = inject(LivePreviewService);
   * this.livePreview.enable((story) => this.story.set(story));
   * ```
   */
  async enableLivePreview(
    callback: (story: ISbStoryData) => void,
    options?: { customParent?: string },
  ): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    // Warn about deprecation in development
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn(
        '[angular-storyblok] enableLivePreview() is deprecated. ' +
          'Use LivePreviewService with withLivePreview() feature instead. ' +
          'See: https://github.com/storyblok/storyblok-angular#live-preview',
      );
    }

    // Dynamically import the bridge
    const { default: StoryblokBridge } = await import('@storyblok/preview-bridge');
    const storyblokBridge = new StoryblokBridge({
      customParent: options?.customParent,
    });

    // Wrap callback in NgZone.run() to ensure Angular detects the change
    storyblokBridge.on(['published', 'change', 'input'], (event) => {
      if (event.action === 'input') {
        this.ngZone.run(() => callback(event.story as unknown as ISbStoryData));
      } else {
        window.location.reload();
      }
    });
  }
}

// Re-export types from @storyblok/js for convenience
export type { ISbStoryData, SbBlokData } from '@storyblok/js';

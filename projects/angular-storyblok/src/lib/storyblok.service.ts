import {
  Injectable,
  inject,
  PLATFORM_ID,
  InjectionToken,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  storyblokInit,
  apiPlugin,
  useStoryblokBridge,
  type ISbStoryData,
  type StoryblokBridgeConfigV2,
  ISbConfig,
} from '@storyblok/js';
import { StoryblokFeature } from './storyblok-components';

/**
 * Configuration options for Storyblok initialization.
 */
export interface StoryblokConfig {
  /** Access token for the Storyblok space */
  accessToken: string;
  /** Enable/disable the Storyblok Bridge. Defaults to true in browser. */
  bridge?: boolean | StoryblokBridgeConfigV2;
  useCustomApi?: boolean;
  apiOptions?: ISbConfig;
}

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
export const STORYBLOK_CONFIG = new InjectionToken<StoryblokConfig>('STORYBLOK_CONFIG');

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
  config: StoryblokConfig,
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
  private storyblokApi: ReturnType<typeof storyblokInit>['storyblokApi'] | null = null;
  private initialized = false;

  /**
   * @internal
   * Initialize Storyblok SDK with the provided configuration.
   * This is called automatically by `provideStoryblok()`.
   */
  /** @internal */
  ɵinit(config: StoryblokConfig): void {
    if (this.initialized) {
      return;
    }

    const bridgeEnabled =
      typeof config.bridge === 'boolean'
        ? config.bridge
        : config.bridge !== undefined || this.isBrowser;

    const { storyblokApi } = storyblokInit({
      accessToken: config.accessToken,
      use: config?.useCustomApi ? [] : [apiPlugin],
      bridge: bridgeEnabled,
      apiOptions: config.apiOptions,
      bridgeUrl: typeof config.bridge === 'object' ? config.bridge.customParent : undefined,
    });

    this.storyblokApi = storyblokApi;
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
    if (!this.storyblokApi) {
      console.error('Storyblok API not initialized. Call init() first.');
      return null;
    }
    try {
      const response = await this.storyblokApi.get(`cdn/stories/${slug}`, {
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
   * Enable the Storyblok Bridge for real-time visual editing.
   * Only works in browser environment.
   *
   * @param storyId - The story ID to listen for changes
   * @param callback - Function called when the story is updated in the Visual Editor
   * @param options - Bridge configuration options
   */
  enableLivePreview(
    storyId: number,
    callback: (story: ISbStoryData) => void,
    options?: StoryblokBridgeConfigV2,
  ): void {
    if (!this.isBrowser) {
      return;
    }
    useStoryblokBridge(storyId, callback, options);
  }
}

// Re-export types from @storyblok/js for convenience
export type { ISbStoryData, SbBlokData, StoryblokBridgeConfigV2 } from '@storyblok/js';

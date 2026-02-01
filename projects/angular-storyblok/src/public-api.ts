/*
 * Public API Surface of angular-storyblok
 */

// Core service and provider
export { StoryblokService, provideStoryblok, STORYBLOK_CONFIG } from './lib/storyblok.service';
export type { StoryblokConfig, StoryblokApiOptions } from './lib/storyblok.service';

// Component registry
export {
  STORYBLOK_COMPONENTS,
  withStoryblokComponents,
  isComponentLoader,
} from './lib/storyblok-components';
export type { StoryblokComponentsMap, StoryblokComponentLoader } from './lib/storyblok-components';

// Directive
export { SbBlokDirective } from './lib/sb-blok.directive';

// Re-export useful types from @storyblok/js
export type {
  ISbStoryData,
  ISbStoriesParams,
  SbBlokData,
  ISbResult,
  ISbStory,
} from '@storyblok/js';

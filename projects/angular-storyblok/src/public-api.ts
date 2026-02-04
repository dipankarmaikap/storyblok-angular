/*
 * Public API Surface of angular-storyblok
 */

// Core service and provider
export { StoryblokService, provideStoryblok, STORYBLOK_CONFIG } from './lib/storyblok.service';

// Component registry
export {
  STORYBLOK_COMPONENTS,
  withStoryblokComponents,
  isComponentLoader,
} from './lib/storyblok-components';
export type { StoryblokComponentsMap, StoryblokComponentLoader } from './lib/storyblok-components';

// Live Preview feature (optional, tree-shakeable)
export {
  withLivePreview,
  LivePreviewService,
  LivePreviewNotEnabledError,
  LIVE_PREVIEW_ENABLED,
  LIVE_PREVIEW_CONFIG,
} from './lib/live-preview';
export type { LivePreviewConfig, LivePreviewCallback } from './lib/live-preview';

// Directive
export { SbBlokDirective } from './lib/sb-blok.directive';

// Rich Text
export { SbRichTextPipe, renderRichText } from './lib/richtext.pipe';
export { SbRichTextComponent } from './lib/richtext.component';

// Re-export richtext types for convenience
export {
  richTextResolver,
  BlockTypes,
  MarkTypes,
  type StoryblokRichTextNode,
  type StoryblokRichTextOptions,
} from '@storyblok/richtext';

// Re-export useful types from @storyblok/js
export type {
  ISbStoryData,
  ISbStoriesParams,
  SbBlokData,
  ISbResult,
  ISbStory,
} from '@storyblok/js';

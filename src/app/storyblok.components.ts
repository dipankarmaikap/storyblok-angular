import { type StoryblokComponentsMap } from 'angular-storyblok';

/**
 * Registry of Storyblok components with lazy loading.
 * Components are loaded on-demand when first used, reducing initial bundle size.
 *
 * The key should match the component name in Storyblok.
 */
export const storyblokComponents: StoryblokComponentsMap = {
  page: () => import('./components/page/page').then((m) => m.Page),
  teaser: () => import('./components/teaser/teaser').then((m) => m.Teaser),
  grid: () => import('./components/grid/grid').then((m) => m.Grid),
  feature: () => import('./components/feature/feature').then((m) => m.Feature),
};

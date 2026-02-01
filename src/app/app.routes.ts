import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Routes } from '@angular/router';
import { StoryblokService } from 'angular-storyblok';

export const routes: Routes = [
  {
    path: '',
    title: 'Home | Storyblok Angular',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'about',
    title: 'About | Storyblok Angular',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
    resolve: {
      story: () => inject(StoryblokService).getStory('about'),
    },
  },
  {
    path: '**',
    title: 'Catch All | Storyblok Angular',
    loadComponent: () =>
      import('./pages/catch-all/catch-all.component').then((m) => m.CatchAllComponent),
    resolve: {
      story: (route: ActivatedRouteSnapshot) => {
        const slug = route.url.map((s) => s.path).join('/') || 'home';
        return inject(StoryblokService).getStory(slug);
      },
    },
  },
];

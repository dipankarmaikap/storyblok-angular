import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideStoryblok, withStoryblokComponents } from 'angular-storyblok';
import { storyblokComponents } from './storyblok.components';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideStoryblok(
      {
        accessToken: 'YiSZzi4L5blzN713TsG4Ogtt',
      },
      withStoryblokComponents(storyblokComponents),
    ),
  ],
};

import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { type SbBlokData } from '@storyblok/js';

export interface TeaserBlok extends SbBlokData {
  headline?: string;
}

@Component({
  selector: 'app-teaser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="py-16 text-center bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-lg"
    >
      <h2 class="text-4xl font-bold">{{ blok().headline }}</h2>
    </div>
  `,
})
export class Teaser {
  readonly blok = input.required<TeaserBlok>();
}

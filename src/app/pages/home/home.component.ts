import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      <h1 class="text-slate-800 text-3xl font-bold mb-4">Home</h1>
      <p class="text-slate-600">Welcome to the Storyblok Angular application.</p>
    </div>
  `,
})
export class HomeComponent {}

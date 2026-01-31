import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      <h1 class="text-slate-800 text-3xl font-bold mb-4">About</h1>
      <p class="text-slate-600">This is an Angular application integrated with Storyblok CMS.</p>
    </div>
  `,
})
export class AboutComponent {}

import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-slate-800 text-white px-8 py-6 text-center">
      <p class="m-0">&copy; 2026 Storyblok Angular. All rights reserved.</p>
    </footer>
  `,
})
export class FooterComponent {}

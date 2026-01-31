import { Component, ChangeDetectionStrategy, inject, computed, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-catch-all',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      <h1 class="text-slate-800 text-3xl font-bold mb-4">{{ pageTitle() }}</h1>
      <p class="text-slate-600">Current path: /{{ currentPath() }}</p>
    </div>
  `,
})
export class CatchAllComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly url = toSignal(this.route.url, { initialValue: [] });

  private readonly urlSegments = computed(() => this.url().map((s) => s.path));

  protected readonly currentPath = computed(() => this.urlSegments().join('/'));

  protected readonly pageTitle = computed(() => {
    const segments = this.urlSegments();
    if (segments.length === 0) return 'Page';
    const lastSegment = segments[segments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  });

  constructor() {
    effect(() => {
      this.titleService.setTitle(`${this.pageTitle()} | Storyblok Angular`);
    });
  }
}

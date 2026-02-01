import {
  Directive,
  input,
  inject,
  ViewContainerRef,
  effect,
  Type,
  signal,
  untracked,
} from '@angular/core';
import { storyblokEditable, type SbBlokData } from '@storyblok/js';
import { STORYBLOK_COMPONENTS, isComponentLoader } from './storyblok-components';

/**
 * Directive that dynamically renders a Storyblok component based on the blok data.
 * Supports both eager and lazy-loaded components for optimal bundle size.
 *
 * The directive looks up the component from the registry (configured via
 * `withStoryblokComponents()`) using the `blok.component` field as the key.
 *
 * @example
 * ```html
 * <!-- Render a single blok -->
 * <ng-container [sbBlok]="storyContent()" />
 *
 * <!-- Render a list of bloks -->
 * @for (blok of story().content.body; track blok._uid) {
 *   <ng-container [sbBlok]="blok" />
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In your component
 * @Component({
 *   imports: [SbBlokDirective],
 *   template: `<ng-container [sbBlok]="content()" />`
 * })
 * export class MyComponent {
 *   content = input<SbBlokData>();
 * }
 * ```
 */
@Directive({
  selector: '[sbBlok]',
})
export class SbBlokDirective {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly components = inject(STORYBLOK_COMPONENTS, { optional: true });

  /** The Storyblok blok data to render */
  readonly sbBlok = input.required<SbBlokData | null | undefined>();

  /** Cache for loaded components to avoid re-importing */
  private readonly componentCache = new Map<string, Type<unknown>>();

  /** Loading state for async component loading */
  private readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      const blok = this.sbBlok();

      // Clear previous content
      this.viewContainerRef.clear();

      if (!blok?.component || !this.components) {
        return;
      }

      const componentEntry = this.components[blok.component];
      if (!componentEntry) {
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
          console.warn(
            `[angular-storyblok] Component "${blok.component}" not found in registry. ` +
              `Register it using withStoryblokComponents({ ${blok.component}: ... })`,
          );
        }
        return;
      }

      // Check if it's a lazy loader or direct component
      if (isComponentLoader(componentEntry)) {
        this.loadAndRenderComponent(blok.component, componentEntry, blok);
      } else {
        this.renderComponent(componentEntry, blok);
      }
    });
  }

  private async loadAndRenderComponent(
    componentName: string,
    loader: () => Promise<Type<unknown>>,
    blok: SbBlokData,
  ): Promise<void> {
    // Check cache first
    let Component = this.componentCache.get(componentName);

    if (!Component) {
      untracked(() => this.isLoading.set(true));

      try {
        Component = await loader();
        this.componentCache.set(componentName, Component);
      } catch (error) {
        console.error(`[angular-storyblok] Failed to load component: ${componentName}`, error);
        return;
      } finally {
        untracked(() => this.isLoading.set(false));
      }
    }

    // Re-check if blok is still the same (user might have navigated)
    if (this.sbBlok()?.component === componentName) {
      this.renderComponent(Component, blok);
    }
  }

  private renderComponent(Component: Type<unknown>, blok: SbBlokData): void {
    const componentRef = this.viewContainerRef.createComponent(Component);

    // Set the blok input
    componentRef.setInput('blok', blok);

    // Apply storyblok editable attributes for Visual Editor
    const editableAttrs = storyblokEditable(blok);
    const hostElement = componentRef.location.nativeElement as HTMLElement;

    if (editableAttrs['data-blok-c']) {
      hostElement.setAttribute('data-blok-c', editableAttrs['data-blok-c']);
      hostElement.setAttribute('data-blok-uid', editableAttrs['data-blok-uid']);
    }
  }
}

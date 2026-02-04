import {
  Directive,
  input,
  inject,
  ViewContainerRef,
  effect,
  Type,
  ComponentRef,
  DestroyRef,
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
  private readonly destroyRef = inject(DestroyRef);

  /** The Storyblok blok data to render */
  readonly sbBlok = input.required<SbBlokData | null | undefined>();

  /** Cache for loaded components to avoid re-importing */
  private readonly componentCache = new Map<string, Type<unknown>>();

  /** Track the currently rendered component for efficient updates */
  private currentComponentRef: ComponentRef<unknown> | null = null;
  private currentComponentName: string | null = null;

  /** Track pending async load to handle race conditions */
  private pendingLoadId = 0;

  /** Track if directive has been destroyed */
  private isDestroyed = false;

  constructor() {
    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
      this.cleanup();
    });

    // Use effect to react to input changes
    // The effect runs synchronously when the signal changes (if in zone)
    effect(() => {
      const blok = this.sbBlok();
      this.handleBlokChange(blok);
    });
  }

  private handleBlokChange(blok: SbBlokData | null | undefined): void {
    // Skip if directive is destroyed
    if (this.isDestroyed) {
      return;
    }

    // Handle null/undefined blok - cleanup and exit
    if (!blok?.component || !this.components) {
      this.cleanup();
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
      this.cleanup();
      return;
    }

    // If same component type is already rendered, just update the input (no flicker!)
    if (this.currentComponentRef && this.currentComponentName === blok.component) {
      this.updateComponent(this.currentComponentRef, blok);
      return;
    }

    // Different component type - need to recreate
    this.cleanup();

    // Check if it's a lazy loader or direct component
    if (isComponentLoader(componentEntry)) {
      this.loadAndRenderComponent(blok.component, componentEntry, blok);
    } else {
      this.createAndRenderComponent(componentEntry, blok);
    }
  }

  private async loadAndRenderComponent(
    componentName: string,
    loader: () => Promise<Type<unknown>>,
    blok: SbBlokData,
  ): Promise<void> {
    // Increment load ID to track this specific load request
    const loadId = ++this.pendingLoadId;

    // Check cache first
    let Component = this.componentCache.get(componentName);

    if (!Component) {
      try {
        Component = await loader();
        this.componentCache.set(componentName, Component);
      } catch (error) {
        console.error(`[angular-storyblok] Failed to load component: ${componentName}`, error);
        return;
      }
    }

    // Check if directive was destroyed during async load (SSR cleanup)
    if (this.isDestroyed) {
      return;
    }

    // Check if this load is still relevant (handles race conditions)
    if (loadId !== this.pendingLoadId) {
      return;
    }

    // Re-check if blok is still the same (user might have navigated)
    const currentBlok = this.sbBlok();
    if (currentBlok?.component === componentName) {
      this.createAndRenderComponent(Component, currentBlok);
    }
  }

  private createAndRenderComponent(Component: Type<unknown>, blok: SbBlokData): void {
    const componentRef = this.viewContainerRef.createComponent(Component);

    // Track the current component
    this.currentComponentRef = componentRef;
    this.currentComponentName = blok.component ?? null;

    // Set the blok input and editable attributes
    this.updateComponent(componentRef, blok);
  }

  private updateComponent(componentRef: ComponentRef<unknown>, blok: SbBlokData): void {
    // Update the blok input
    componentRef.setInput('blok', blok);

    // Force synchronous change detection on the child component
    // This ensures the DOM updates immediately in the same frame,
    // eliminating the flicker between old and new values
    componentRef.changeDetectorRef.detectChanges();

    // Apply storyblok editable attributes for Visual Editor
    const editableAttrs = storyblokEditable(blok);
    const hostElement = componentRef.location.nativeElement as HTMLElement;

    if (editableAttrs['data-blok-c']) {
      hostElement.setAttribute('data-blok-c', editableAttrs['data-blok-c']);
      hostElement.setAttribute('data-blok-uid', editableAttrs['data-blok-uid']);
    }
  }

  private cleanup(): void {
    this.viewContainerRef.clear();
    this.currentComponentRef = null;
    this.currentComponentName = null;
  }
}

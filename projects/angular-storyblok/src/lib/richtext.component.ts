import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  SecurityContext,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  richTextResolver,
  BlockTypes,
  type StoryblokRichTextNode,
  type StoryblokRichTextOptions,
} from '@storyblok/richtext';
import { SbBlokDirective } from './sb-blok.directive';
import type { SbBlokData } from '@storyblok/js';

/**
 * Represents a parsed segment of rich text content.
 * Can be either HTML text or an embedded blok.
 */
export type RichTextSegment =
  | { type: 'html'; content: SafeHtml }
  | { type: 'blok'; blok: SbBlokData };

/**
 * Component that renders Storyblok rich text content with support for embedded bloks.
 *
 * Unlike the `SbRichTextPipe` which only renders HTML, this component can render
 * embedded Storyblok components (bloks) within rich text using your registered
 * components from `withStoryblokComponents()`.
 *
 * @example Basic usage
 * ```html
 * <sb-rich-text [doc]="blok().richTextField" />
 * ```
 *
 * @example With custom class
 * ```html
 * <sb-rich-text [doc]="blok().content" class="prose prose-lg" />
 * ```
 *
 * @example With image optimization
 * ```html
 * <sb-rich-text [doc]="blok().content" [options]="richTextOptions" />
 * ```
 *
 * ```typescript
 * readonly richTextOptions: StoryblokRichTextOptions = {
 *   optimizeImages: { width: 800, filters: { format: 'webp' } }
 * };
 * ```
 */
@Component({
  selector: 'sb-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SbBlokDirective],
  template: `
    @for (segment of segments(); track $index) {
      @if (segment.type === 'html') {
        <span [innerHTML]="segment.content"></span>
      } @else {
        <ng-container [sbBlok]="segment.blok" />
      }
    }
  `,
  host: {
    style: 'display: block',
  },
})
export class SbRichTextComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** The rich text document from Storyblok */
  readonly doc = input.required<StoryblokRichTextNode<string> | null | undefined>();

  /** Optional configuration for the rich text resolver */
  readonly options = input<StoryblokRichTextOptions<string>>();

  /** Parsed segments of the rich text (HTML or bloks) */
  readonly segments = computed<RichTextSegment[]>(() => {
    const doc = this.doc();
    if (!doc) return [];

    return this.parseRichText(doc);
  });

  /**
   * Sanitize HTML content for safe rendering
   */
  private sanitize(html: string): SafeHtml {
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized ?? '');
  }

  /**
   * Parse rich text document into segments of HTML and bloks.
   * Follows the pattern from @storyblok/vue and @storyblok/react.
   */
  private parseRichText(doc: StoryblokRichTextNode<string>): RichTextSegment[] {
    const segments: RichTextSegment[] = [];
    const blokGroups: SbBlokData[][] = [];

    // Create a custom resolver that captures bloks and replaces them with markers
    // Similar to @storyblok/astro's richTextToHTML implementation
    const options: StoryblokRichTextOptions<string> = {
      ...this.options(),
      resolvers: {
        ...this.options()?.resolvers,
        [BlockTypes.COMPONENT]: (node) => {
          const body = node.attrs?.['body'];

          // Handle case where body is not an array or is empty
          if (!Array.isArray(body) || body.length === 0) {
            return '';
          }

          // Store the entire body array (supports multiple bloks)
          blokGroups.push(body as SbBlokData[]);
          // Return a unique marker that we'll split on
          return `<!--SB_BLOK_GROUP_${blokGroups.length - 1}-->`;
        },
      },
    };

    const html = richTextResolver<string>(options).render(doc);

    // Split by blok group markers and create segments
    const parts = html.split(/<!--SB_BLOK_GROUP_(\d+)-->/);

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Even indices are HTML content
        const content = parts[i].trim();
        if (content) {
          segments.push({ type: 'html', content: this.sanitize(content) });
        }
      } else {
        // Odd indices are blok group indices - add each blok as a segment
        const groupIndex = parseInt(parts[i], 10);
        const bloks = blokGroups[groupIndex];
        if (bloks) {
          for (const blok of bloks) {
            segments.push({ type: 'blok', blok });
          }
        }
      }
    }

    return segments;
  }
}

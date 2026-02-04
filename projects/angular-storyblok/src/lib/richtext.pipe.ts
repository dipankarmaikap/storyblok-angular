import { Pipe, PipeTransform, inject, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  richTextResolver,
  type StoryblokRichTextNode,
  type StoryblokRichTextOptions,
} from '@storyblok/richtext';

/**
 * Pipe that renders Storyblok rich text content to sanitized HTML.
 *
 * @example
 * ```html
 * <div [innerHTML]="blok.richtext | sbRichText"></div>
 * ```
 *
 * @example With custom options
 * ```html
 * <div [innerHTML]="blok.richtext | sbRichText:richTextOptions"></div>
 * ```
 *
 * ```typescript
 * readonly richTextOptions: StoryblokRichTextOptions = {
 *   optimizeImages: {
 *     width: 800,
 *     height: 600,
 *     filters: { format: 'webp' }
 *   }
 * };
 * ```
 */
@Pipe({
  name: 'sbRichText',
})
export class SbRichTextPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(
    value: StoryblokRichTextNode<string> | null | undefined,
    options?: StoryblokRichTextOptions<string>,
  ): SafeHtml | null {
    if (!value) {
      return null;
    }

    const html = richTextResolver<string>(options).render(value);

    // Sanitize the HTML to prevent XSS attacks
    const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, html);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized ?? '');
  }
}

/**
 * Render Storyblok rich text content to HTML string.
 * Use this function when you need the raw HTML string (e.g., for SSR or custom processing).
 *
 * @param data - The rich text data from Storyblok
 * @param options - Optional configuration for the rich text resolver
 * @returns The rendered HTML string
 *
 * @example
 * ```typescript
 * import { renderRichText } from 'angular-storyblok';
 *
 * const html = renderRichText(story.content.richtext);
 * ```
 *
 * @example With image optimization
 * ```typescript
 * const html = renderRichText(story.content.richtext, {
 *   optimizeImages: {
 *     width: 800,
 *     filters: { format: 'webp', quality: 80 }
 *   }
 * });
 * ```
 */
export function renderRichText<T = string>(
  data: StoryblokRichTextNode<T> | null | undefined,
  options?: StoryblokRichTextOptions<T>,
): T | undefined {
  if (!data) {
    return undefined;
  }
  return richTextResolver<T>(options).render(data);
}

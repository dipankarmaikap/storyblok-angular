import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  input,
  linkedSignal,
} from '@angular/core';
import {
  type ISbStoryData,
  type SbBlokData,
  StoryblokService,
  SbBlokDirective,
} from 'angular-storyblok';

@Component({
  selector: 'app-catch-all',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SbBlokDirective],
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      <!-- Pass content directly - directive handles null internally -->
      <ng-container [sbBlok]="storyContent()" />
      @if (!storyContent()) {
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 class="text-yellow-800 text-xl font-semibold mb-2">No content found</h2>
        </div>
      }
    </div>
  `,
})
export class CatchAllComponent implements OnInit {
  private readonly storyblok = inject(StoryblokService);

  /** Story data resolved from the route */
  readonly storyInput = input<ISbStoryData | null>(null, { alias: 'story' });

  /** Writable signal linked to input - allows bridge updates */
  readonly story = linkedSignal(() => this.storyInput());

  /** The story content (blok) to render */
  readonly storyContent = computed(() => this.story()?.content as SbBlokData | undefined);

  ngOnInit(): void {
    // Enable the Storyblok Bridge for real-time editing in the Visual Editor
    const currentStory = this.story();
    if (currentStory) {
      this.storyblok.enableLivePreview(currentStory.id, (updatedStory) => {
        this.story.set(updatedStory);
      });
    }
  }
}

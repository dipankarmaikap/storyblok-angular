import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  linkedSignal,
  OnInit,
} from '@angular/core';
import {
  type ISbStoryData,
  type SbBlokData,
  SbBlokDirective,
  StoryblokService,
} from 'angular-storyblok';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SbBlokDirective],
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      @if (storyContent(); as content) {
        <ng-container [sbBlok]="content" />
      } @else {
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 class="text-yellow-800 text-xl font-semibold mb-2">No content found</h2>
          <p class="text-yellow-600">No story found for slug: about</p>
        </div>
      }
    </div>
  `,
})
export class AboutComponent implements OnInit {
  private readonly storyblok = inject(StoryblokService);

  /** Story data from route resolver */
  readonly storyInput = input<ISbStoryData | null>(null, { alias: 'story' });

  /** Writable signal linked to input - allows bridge updates */
  readonly story = linkedSignal(() => this.storyInput());

  readonly storyContent = computed(() => this.story()?.content as SbBlokData | undefined);

  ngOnInit(): void {
    const currentStory = this.story();
    if (currentStory) {
      this.storyblok.enableLivePreview(currentStory.id, (updatedStory) => {
        this.story.set(updatedStory);
      });
    }
  }
}

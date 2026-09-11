import { Cast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { describe, it, test as base } from '@serenity-js/playwright-test';

// Shared Serenity/JS test harness: every actor can browse the web with
// Playwright and take notes. Import `test`, `it`, `describe` from here.
const test = base.extend({});

test.use({
  actors: async ({ browser, contextOptions }, use) => {
    await use(
      Cast.where((actor) =>
        actor.whoCan(
          BrowseTheWebWithPlaywright.using(browser, contextOptions),
          TakeNotes.usingAnEmptyNotepad(),
        ),
      ),
    );
  },
});

export { describe, it, test };
export { expect } from '@serenity-js/playwright-test';

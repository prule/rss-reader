import { Ensure, equals, includes, isPresent } from '@serenity-js/assertions';
import { By, Click, ExecuteScript, isVisible, Navigate, PageElement, Text } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';

const SEED = {
  version: 1,
  nodes: [{ id: 's1', type: 'feed', name: 'Longreads', parentId: null, collapsed: false, url: 'https://x/feed' }],
  entries: [
    {
      id: 'e1',
      feedId: 's1',
      title: 'Stored offline',
      author: 'A',
      link: null,
      guid: 'e1',
      publishedAt: Date.now() - 3_600_000,
      snippet: 'This entry lives in localStorage.',
      body: '<p>This entry lives in localStorage.</p>',
      read: false,
      marked: false,
    },
  ],
};

const entryRow = PageElement.located(By.css('[data-testid="entry-e1"]')).describedAs('the entry');
const bookmarkBtn = PageElement.located(
  By.css('[data-testid="entry-e1"] button[aria-label^="Bookmark"]'),
).describedAs('the bookmark button');
const bookmarksShortcut = PageElement.located(
  By.cssContainingText('.side-row', 'Bookmarks'),
).describedAs('the Bookmarks shortcut');
const refresh = PageElement.located(By.cssContainingText('button', 'Refresh')).describedAs(
  'the Refresh button',
);
const toast = PageElement.located(By.css('.toast')).describedAs('the status toast');

describe('Offline behaviour', () => {
  it('keeps stored entries readable and bookmarkable, and degrades refresh gracefully', async ({
    actor,
  }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      ExecuteScript.sync(
        `window.localStorage.setItem('ferrite.library.v1', arguments[0]);
         // Simulate no network: every fetch rejects, like being offline.
         window.fetch = () => Promise.reject(new Error('offline'));`,
      ).withArguments(JSON.stringify(SEED)),
      Navigate.reloadPage(),
      // Re-install the offline fetch shim after reload.
      ExecuteScript.sync(`window.fetch = () => Promise.reject(new Error('offline'));`),

      // Stored content is readable with no network.
      Ensure.that(entryRow, isVisible()),
      Click.on(entryRow),
      Ensure.that(Text.of(PageElement.located(By.css('.article h2'))), equals('Stored offline')),

      // Bookmarking works offline and shows in the Bookmarks view.
      Click.on(bookmarkBtn),
      Click.on(bookmarksShortcut),
      Ensure.that(entryRow, isPresent()),

      // A refresh with no network reports it could not fetch, but keeps entries.
      // The status bar renders uppercased via CSS, so match the visible casing.
      Click.on(refresh),
      Ensure.that(Text.of(toast), includes('FAILING')),
      Ensure.that(entryRow, isPresent()),
    );
  });
});

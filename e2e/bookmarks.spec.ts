import { Ensure, isPresent, not } from '@serenity-js/assertions';
import { By, Click, Enter, isVisible, Navigate, PageElement } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';
import { SeedLibrary } from './screenplay/library';

const SEED = {
  nodes: [
    { id: 'f_tech', type: 'folder', name: 'Technology', parentId: null, collapsed: false },
    {
      id: 's_pl',
      type: 'feed',
      name: 'Packet Loss Weekly',
      parentId: 'f_tech',
      collapsed: false,
      url: 'u',
    },
  ],
  entries: [
    {
      id: 'e1',
      feedId: 's_pl',
      title: 'Anycast is not a load balancer',
      author: 'noc',
      link: null,
      guid: 'e1',
      publishedAt: Date.now() - 7_200_000,
      snippet: 'Anycast routes to the nearest announcement.',
      body: '<p>Anycast routes to the nearest announcement.</p>',
      read: false,
      marked: false,
    },
  ],
};

const bookmarkButton = PageElement.located(
  By.css('[data-testid="entry-e1"] button[aria-label^="Bookmark"]'),
).describedAs('the bookmark button on the entry');
const bookmarksShortcut = PageElement.located(
  By.cssContainingText('.side-row', 'Bookmarks'),
).describedAs('the Bookmarks library shortcut');
const searchField = PageElement.located(By.css('input[aria-label="Search bookmarks"]')).describedAs(
  'the bookmark search field',
);
const technologyChip = PageElement.located(By.cssContainingText('.chip', 'Technology')).describedAs(
  'the Technology tag chip',
);
const result = PageElement.located(By.css('[data-testid="entry-e1"]')).describedAs('the bookmark');

describe('Bookmarks', () => {
  it('finds a bookmarked entry by tag and keyword', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with(SEED),
      Navigate.reloadPage(),
      Click.on(bookmarkButton),
      Click.on(bookmarksShortcut),
      Ensure.that(result, isVisible()),
      Click.on(technologyChip),
      Enter.theValue('anycast').into(searchField),
      Ensure.that(result, isPresent()),
      Enter.theValue('zzznotfound').into(searchField),
      Ensure.that(result, not(isVisible())),
    );
  });
});

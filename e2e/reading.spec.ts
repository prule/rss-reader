import { Ensure, equals, isPresent } from '@serenity-js/assertions';
import { By, Click, ExecuteScript, Navigate, PageElement, Text } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';

const SEED = {
  version: 1,
  nodes: [
    { id: 's1', type: 'feed', name: 'Longreads', parentId: null, collapsed: false, url: 'u' },
  ],
  entries: [
    {
      id: 'e1',
      feedId: 's1',
      title: 'The mapmakers',
      author: 'H. Marsh',
      link: null,
      guid: 'e1',
      publishedAt: Date.now() - 3_600_000,
      snippet: 'A border that existed only as a compromise.',
      body: '<p>A border that existed only as a compromise.</p>',
      read: false,
      marked: false,
    },
  ],
};

const entryRow = PageElement.located(By.css('[data-testid="entry-e1"]')).describedAs('the entry');
const articleHeading = PageElement.located(By.css('.article h2')).describedAs('the article title');
const markAllRead = PageElement.located(
  By.cssContainingText('button', 'Mark all read'),
).describedAs('the Mark all read button');

describe('Reading entries', () => {
  it('opens an entry into the reading pane and can mark all read', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      ExecuteScript.sync(
        `window.localStorage.setItem('rss-reader-pwa.library.v1', arguments[0]);`,
      ).withArguments(JSON.stringify(SEED)),
      Navigate.reloadPage(),
      Click.on(entryRow),
      Ensure.that(Text.of(articleHeading), equals('The mapmakers')),
      Click.on(markAllRead),
      Ensure.that(entryRow, isPresent()),
    );
  });
});

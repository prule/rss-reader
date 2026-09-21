import { Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { By, Click, isVisible, Navigate, PageElement, Text } from '@serenity-js/web';
import { Duration, Wait } from '@serenity-js/core';
import { describe, it } from './screenplay/serenity';
import {
  RenderedEntries,
  ScrollEntryList,
  SeedLibrary,
  StoredEntries,
  type SeedEntry,
} from './screenplay/library';

// A library comfortably larger than one page (the list pages at 50), so the test
// exercises the boundary rather than a list that happens to fit.
const TOTAL = 120;
const PAGE = 50;

const entry = (i: number): SeedEntry => ({
  id: `e${String(i).padStart(3, '0')}`,
  feedId: 's1',
  title: `Dispatch ${i}`,
  author: 'A. Writer',
  link: null,
  guid: `g${i}`,
  publishedAt: Date.now() - i * 60_000,
  snippet: `Body of dispatch ${i}.`,
  body: `<p>Body of dispatch ${i}.</p>`,
  read: false,
  marked: false,
});

const SEED = {
  nodes: [
    {
      id: 's1',
      type: 'feed' as const,
      name: 'Dispatches',
      parentId: null,
      collapsed: false,
      url: 'https://x/feed',
    },
  ],
  entries: Array.from({ length: TOTAL }, (_, i) => entry(i)),
};

const subtitle = PageElement.located(By.css('.list-subtitle')).describedAs('the entry count');
const listEnd = PageElement.located(By.css('[data-testid="list-end"]')).describedAs(
  'the end-of-list marker',
);
const unreadShortcut = PageElement.located(By.cssContainingText('.side-row', 'Unread')).describedAs(
  'the Unread shortcut',
);
const unreadCount = PageElement.located(By.css('.side-row .count-accent')).describedAs(
  'the unread count',
);
const markAllRead = PageElement.located(
  By.cssContainingText('button', 'Mark all read'),
).describedAs('the Mark all read button');

describe('A library larger than one page', () => {
  it('loads more entries as the reader scrolls, without loading everything up front', async ({
    actor,
  }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with(SEED),
      Navigate.reloadPage(),

      // Everything is stored, but only the first page is rendered.
      Ensure.that(StoredEntries.count(), equals(TOTAL)),
      Ensure.that(RenderedEntries.count(), equals(PAGE)),
      // The count is the full total, not the number on screen. The subtitle is
      // uppercased via CSS, so match the visible casing.
      Ensure.that(Text.of(subtitle), equals(`${TOTAL} ENTRIES`)),
      Ensure.that(listEnd, not(isPresent())),

      // Scrolling to the end brings in the next page.
      ScrollEntryList.toTheEnd(),
      Ensure.that(RenderedEntries.count(), equals(PAGE * 2)),

      // Keep going and the list reports that there is nothing left.
      ScrollEntryList.toTheEnd(3),
      Ensure.that(RenderedEntries.count(), equals(TOTAL)),
      Ensure.that(listEnd, isVisible()),
    );
  });

  it('marks every unread entry read, including ones never scrolled into view', async ({
    actor,
  }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with(SEED),
      Navigate.reloadPage(),

      Click.on(unreadShortcut),
      Ensure.that(Text.of(unreadCount), equals(String(TOTAL))),
      // Only the first page has been rendered — the rest were never shown.
      Ensure.that(RenderedEntries.count(), equals(PAGE)),

      Click.on(markAllRead),

      // All 120 are read, not just the 50 on screen. Marking that many rows takes
      // a moment to land, so wait for the count rather than sampling it once.
      Wait.upTo(Duration.ofSeconds(10)).until(Text.of(unreadCount), equals('0')),
      Ensure.that(RenderedEntries.count(), equals(0)),
      // Nothing was deleted to achieve it.
      Ensure.that(StoredEntries.count(), equals(TOTAL)),
    );
  });
});

import { Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { By, Click, isVisible, Navigate, PageElement } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';
import {
  LegacyPayload,
  RescueBackup,
  RescueOffer,
  SeedLibrary,
  StoredEntries,
} from './screenplay/library';

// A library exactly as the retired localStorage build left it.
const LEGACY = {
  version: 1,
  nodes: [
    { id: 'f1', type: 'folder', name: 'Technology', parentId: null, collapsed: false },
    {
      id: 's1',
      type: 'feed',
      name: 'Packet Loss Weekly',
      parentId: 'f1',
      collapsed: false,
      url: 'https://packet.example/rss',
    },
  ],
  entries: [
    {
      id: 'e1',
      feedId: 's1',
      title: 'Anycast in practice',
      author: 'R. Mora',
      link: null,
      guid: 'g1',
      publishedAt: Date.now() - 7_200_000,
      snippet: 'How anycast behaves under load.',
      body: '<p>How anycast behaves under load.</p>',
      read: false,
      marked: true,
    },
  ],
};

const offer = PageElement.located(
  By.css('[role="dialog"][aria-label="Old library found"]'),
).describedAs('the rescue offer');
const restoredEntry = PageElement.located(By.css('[data-testid="entry-e1"]')).describedAs(
  'the restored entry',
);
const feedInTree = PageElement.located(
  By.cssContainingText('.tree-name', 'Packet Loss Weekly'),
).describedAs('the restored feed');
const bookmarksShortcut = PageElement.located(
  By.cssContainingText('.side-row', 'Bookmarks'),
).describedAs('the Bookmarks shortcut');
const feedsHeading = PageElement.located(
  By.cssContainingText('.side-heading', 'Feeds'),
).describedAs('the Feeds heading');
const discard = PageElement.located(By.cssContainingText('button', 'Discard')).describedAs(
  'the Discard button',
);

describe('A library left by the pre-database build', () => {
  it('is offered as a download and restores through the ordinary import', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with({ nodes: [], entries: [] }),
      SeedLibrary.asLegacyPayload(LEGACY),
      Navigate.reloadPage(),

      // The offer appears, and the old library is NOT loaded — this is a rescue,
      // not a migration.
      Ensure.that(offer, isVisible()),
      Ensure.that(StoredEntries.count(), equals(0)),
      Ensure.that(restoredEntry, not(isPresent())),

      // Take the download and hand it back through Import.
      RescueBackup.downloadAndReimport(),

      // The library is restored, with its bookmark intact.
      Ensure.that(StoredEntries.count(), equals(1)),
      Ensure.that(feedInTree, isVisible()),
      Click.on(bookmarksShortcut),
      Ensure.that(restoredEntry, isPresent()),

      // And the old key is gone, so nothing is offered a second time.
      Ensure.that(LegacyPayload.isStillStored(), equals(false)),
      Navigate.reloadPage(),
      Ensure.that(RescueOffer.isShowing(), equals(false)),
    );
  });

  it('is dropped when the offer is declined, and not offered again', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with({ nodes: [], entries: [] }),
      SeedLibrary.asLegacyPayload(LEGACY),
      Navigate.reloadPage(),

      Ensure.that(offer, isVisible()),
      Click.on(discard),

      Ensure.that(RescueOffer.isShowing(), equals(false)),
      Ensure.that(LegacyPayload.isStillStored(), equals(false)),
      Ensure.that(StoredEntries.count(), equals(0)),

      Navigate.reloadPage(),
      Ensure.that(RescueOffer.isShowing(), equals(false)),
    );
  });

  it('is not offered when there is nothing left behind', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      SeedLibrary.with({ nodes: [], entries: [] }),
      Navigate.reloadPage(),
      Ensure.that(RescueOffer.isShowing(), equals(false)),
      // The app came up normally rather than being blocked by an offer.
      Ensure.that(feedsHeading, isVisible()),
    );
  });
});

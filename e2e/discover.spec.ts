import { Ensure, isPresent, not } from '@serenity-js/assertions';
import { Wait } from '@serenity-js/core';
import { By, Click, Enter, Navigate, PageElement } from '@serenity-js/web';
import type { Route, Request } from '@playwright/test';
import { describe, it, test } from '@serenity-js/playwright-test';

// This spec stubs the relay with page.route, so the actor must browse the very
// page the test routes. Use serenity-js/playwright-test's default page-bound
// cast (not the project's browser-context harness) and block the PWA service
// worker, which would otherwise intercept the relay fetches before page.route.
test.use({ serviceWorkers: 'block' });

// A minimal RSS document the stubbed relay returns for a feed fetch.
const rss = (title: string) =>
  `<rss><channel><title>${title}</title>` +
  `<item><title>${title} item</title><link>https://x/${encodeURIComponent(title)}</link>` +
  `<guid>${title}-1</guid></item></channel></rss>`;

// Relay stub: discovery returns two feeds; a feed fetch returns RSS whose
// channel title depends on which discovered URL was requested. `found`
// controls whether discovery advertises any feeds.
const relayStub =
  (found: boolean) =>
  async (route: Route, request: Request): Promise<void> => {
    const u = new URL(request.url());
    if (u.searchParams.get('discover') !== null) {
      const feeds = found
        ? [
            { url: 'https://site.example/feed', type: 'rss', title: 'Site Main' },
            { url: 'https://site.example/ai/feed', type: 'rss', title: 'Site AI' },
          ]
        : [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ feeds }) });
      return;
    }
    const target = u.searchParams.get('url') ?? '';
    // A bare site URL is not a feed → 415 so the client falls back to discovery.
    if (target.endsWith('site.example') || target.endsWith('site.example/')) {
      await route.fulfill({ status: 415, contentType: 'application/json', body: JSON.stringify({ kind: 'not-a-feed' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/rss+xml',
      body: rss(target.includes('ai') ? 'Real AI' : 'Real Main'),
    });
  };

const urlField = PageElement.located(By.css('input[aria-label="Feed or site URL"]')).describedAs('the URL field');
const subscribe = PageElement.located(By.cssContainingText('button', 'Subscribe')).describedAs('the Subscribe button');
const addFeedButton = PageElement.located(By.cssContainingText('button', 'Add Feed')).describedAs('the Add Feed button');
const feedsFound = PageElement.located(By.cssContainingText('h4', 'Feeds found')).describedAs('the discovery heading');
const aiCheckbox = PageElement.located(By.css('input[aria-label="Site AI"]')).describedAs('the Site AI checkbox');
const addSelected = PageElement.located(By.cssContainingText('button', 'Add selected')).describedAs('the Add selected button');
const noFeedsFound = PageElement.located(By.cssContainingText('h4', 'No feeds found')).describedAs('the no-feeds heading');
const addAnyway = PageElement.located(By.cssContainingText('button', 'Add URL anyway')).describedAs('the add-anyway button');
const treeNamed = (name: string) =>
  PageElement.located(By.cssContainingText('.tree-name', name)).describedAs(`the "${name}" feed`);

describe('Discovering feeds from a site URL', () => {
  it('discovers feeds, lets the reader pick a subset, and adds them', async ({ actor, page }) => {
    await page.route(/\?(discover|url)=/, relayStub(true));
    await actor.attemptsTo(
      Navigate.to('/'),
      Click.on(addFeedButton),
      Enter.theValue('https://site.example').into(urlField),
      Click.on(subscribe),
      Wait.until(feedsFound, isPresent()),
      // Both are selected by default; unchecking Site AI leaves only Site Main.
      Click.on(aiCheckbox),
      Click.on(addSelected),
      Wait.until(treeNamed('Real Main'), isPresent()),
      Ensure.that(treeNamed('Real AI'), not(isPresent())),
    );
  });

  it('subscribes directly when the URL is already a feed (no selection step)', async ({ actor, page }) => {
    await page.route(/\?(discover|url)=/, relayStub(true));
    await actor.attemptsTo(
      Navigate.to('/'),
      Click.on(addFeedButton),
      Enter.theValue('https://site.example/ai/feed').into(urlField),
      Click.on(subscribe),
      // Went straight to the tree, never showing the discovery step.
      Wait.until(treeNamed('Real AI'), isPresent()),
      Ensure.that(feedsFound, not(isPresent())),
    );
  });

  it('offers add-as-is when no feeds are found', async ({ actor, page }) => {
    await page.route(/\?(discover|url)=/, relayStub(false));
    await actor.attemptsTo(
      Navigate.to('/'),
      Click.on(addFeedButton),
      Enter.theValue('https://site.example').into(urlField),
      Click.on(subscribe),
      Wait.until(noFeedsFound, isPresent()),
      Click.on(addAnyway),
      // Added as-is: relay returns 415 for the bare site, so it lands named from host.
      Wait.until(treeNamed('site.example'), isPresent()),
    );
  });
});

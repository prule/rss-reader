import { Ensure, isPresent } from '@serenity-js/assertions';
import { By, Navigate, PageElement } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';

describe('Ferrite', () => {
  it('renders the app shell', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      Ensure.that(
        PageElement.located(By.css('.brand')).of(PageElement.located(By.css('.app'))),
        isPresent(),
      ),
    );
  });
});

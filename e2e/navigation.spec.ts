import { Ensure, isPresent } from '@serenity-js/assertions';
import { By, Click, Enter, Navigate, PageElement, Press } from '@serenity-js/web';
import { Key } from '@serenity-js/web';
import { describe, it } from './screenplay/serenity';

const newFolderButton = PageElement.located(By.cssContainingText('button', 'New Folder')).describedAs(
  'the New Folder button',
);
const renameInput = PageElement.located(By.css('input[aria-label="Rename"]')).describedAs(
  'the inline rename field',
);
const folderNamed = (name: string) =>
  PageElement.located(By.cssContainingText('.tree-name', name)).describedAs(`the "${name}" folder`);

describe('Navigation tree', () => {
  it('lets a reader create and name a folder', async ({ actor }) => {
    await actor.attemptsTo(
      Navigate.to('/'),
      Click.on(newFolderButton),
      Enter.theValue('Reading List').into(renameInput),
      Press.the(Key.Enter).in(renameInput),
      Ensure.that(folderNamed('Reading List'), isPresent()),
    );
  });
});

import { Session } from 'electron';
import { resolve, basename } from 'path';
import { promises, existsSync } from 'fs';

import { getPath } from '../utils/paths';
import { Extension } from '../models/extension';
import { registerProtocols } from './services/protocols';
import { runWebRequestService } from './services/web-request';
import { runMessagingService } from './services/messaging';
import { StorageArea } from '../models/storage-area';
import { startBackgroundPage } from '../utils/extensions';

export class ExtensionsMain {
  public extensions: { [key: string]: Extension } = {};

  public session: Session;

  constructor() {
    registerProtocols(this);
  }

  public setSession(ses: Session) {
    this.session = ses;
    ses.setPreloads([`${__dirname}/../renderer/content/index.js`]);

    runWebRequestService(ses);
    runMessagingService(this);
  }

  public async load(
    dir: string,
    { devtools }: { devtools: boolean } = { devtools: false },
  ) {
    const stats = await promises.stat(dir);

    if (!stats.isDirectory()) throw new Error('Given path is not a directory');

    const manifestPath = resolve(dir, 'manifest.json');

    if (!existsSync(manifestPath)) {
      throw new Error("Given directory doesn't contain manifest.json file");
    }

    const manifest: chrome.runtime.Manifest = JSON.parse(
      await promises.readFile(manifestPath, 'utf8'),
    );

    const id = basename(dir);

    if (this.extensions[id]) {
      return;
    }

    const storagePath = getPath('storage/extensions', id);
    const local = new StorageArea(resolve(storagePath, 'local'));
    const sync = new StorageArea(resolve(storagePath, 'sync'));
    const managed = new StorageArea(resolve(storagePath, 'managed'));

    const extension: Extension = {
      manifest,
      alarms: [],
      databases: { local, sync, managed },
      path: dir,
      id,
    };

    this.extensions[id] = extension;

    if (typeof manifest.default_locale === 'string') {
      const defaultLocalePath = resolve(
        dir,
        '_locales',
        manifest.default_locale,
      );

      if (!existsSync(defaultLocalePath)) return;

      const messagesPath = resolve(defaultLocalePath, 'messages.json');
      const stats = await promises.stat(messagesPath);

      if (!existsSync(messagesPath) || stats.isDirectory()) return;

      const data = await promises.readFile(messagesPath, 'utf8');
      const locale = JSON.parse(data);

      extension.locale = locale;
    }

    startBackgroundPage(extension, devtools);
  }
}

export const extensionsMain = new ExtensionsMain();

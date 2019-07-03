import { BackgroundPage } from './background-page';

export interface IpcExtension {
  id?: string;
  manifest?: chrome.runtime.Manifest;
  path?: string;
  locale?: any;
  alarms?: any[];
  backgroundPage?: BackgroundPage;
}

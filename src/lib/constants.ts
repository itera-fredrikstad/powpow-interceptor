import type { AppState } from '../types/AppState';
import type { PowPowSettings } from '../types/PowPowSettings';
import { ManifestLoadState } from './ManifestLoadState';

export const DEFAULT_SETTINGS: PowPowSettings = {
	devServerPort: 3001,
	isExtensionEnabled: false,
	targetHostname: '',
};

export const DEFAULT_APP_STATE: AppState = {
	manifestState: ManifestLoadState.NotLoaded,
	webFileCount: 0,
	webTemplateCount: 0,
	attachedTabCount: 0,
};

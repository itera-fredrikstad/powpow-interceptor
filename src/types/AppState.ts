import type { ManifestLoadState } from '../lib/ManifestLoadState';

export interface AppState {
	manifestState: ManifestLoadState;
	webFileCount: number;
	webTemplateCount: number;
	attachedTabCount: number;
}

import type { AppState } from './AppState';
import type { PowPowSettings } from './PowPowSettings';

export type RuntimeMessage =
	| {
			type: 'settingsRequest';
	  }
	| {
			type: 'settingsUpdate';
			settings: Partial<PowPowSettings>;
	  }
	| {
			type: 'settingsResponse';
			settings: PowPowSettings;
	  }
	| {
			type: 'appStateRequest';
	  }
	| {
			type: 'appStateResponse';
			appState: AppState;
	  }
	| {
			type: 'error';
			error: string;
	  };

export type RuntimeMessageType = RuntimeMessage['type'];

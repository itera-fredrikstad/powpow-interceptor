import { useSyncExternalStore } from 'react';
import type { PowPowSettings } from '../types/PowPowSettings';
import { getSettingsSnapshot, sendSettingsUpdate, subscribeSettings } from './BackgroundStore';

export function useSettings() {
	const settings = useSyncExternalStore(subscribeSettings, getSettingsSnapshot);

	const updateSettings = (updated: Partial<PowPowSettings>) => {
		sendSettingsUpdate(updated);
	};

	return { settings, updateSettings };
}

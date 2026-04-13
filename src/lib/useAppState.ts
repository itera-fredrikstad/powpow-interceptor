import { useSyncExternalStore } from 'react';
import { getAppStateSnapshot, subscribeAppState } from './BackgroundStore';

export function useAppState() {
	const appState = useSyncExternalStore(subscribeAppState, getAppStateSnapshot);
	return { appState };
}

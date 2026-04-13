import type { AppState } from '../types/AppState';
import type { PowPowSettings } from '../types/PowPowSettings';
import type { RuntimeMessage } from '../types/RuntimeMessage';
import { DEFAULT_APP_STATE, DEFAULT_SETTINGS } from './constants';
import { logger } from './Logger';

type Listener = () => void;

let port: chrome.runtime.Port | null = null;
let settingsSnapshot: PowPowSettings = { ...DEFAULT_SETTINGS };
let appStateSnapshot: AppState = { ...DEFAULT_APP_STATE };

const settingsListeners = new Set<Listener>();
const appStateListeners = new Set<Listener>();

function notifySettingsListeners() {
	for (const listener of settingsListeners) {
		listener();
	}
}

function notifyAppStateListeners() {
	for (const listener of appStateListeners) {
		listener();
	}
}

function handleMessage(message: RuntimeMessage) {
	logger.debug('Received message:', message.type);
	switch (message.type) {
		case 'settingsResponse': {
			settingsSnapshot = { ...DEFAULT_SETTINGS, ...message.settings };
			notifySettingsListeners();
			break;
		}
		case 'appStateResponse': {
			appStateSnapshot = message.appState;
			notifyAppStateListeners();
			break;
		}
	}
}

function connect() {
	logger.debug('Connecting to background...');
	try {
		port = chrome.runtime.connect();
		logger.debug('Port connected');

		port.onMessage.addListener(handleMessage);

		port.onDisconnect.addListener(() => {
			port = null;
			logger.warn('Port disconnected, reconnecting...');
			setTimeout(connect, 500);
		});
	} catch (e) {
		logger.error('Failed to connect port:', e);
		setTimeout(connect, 1000);
	}
}

// ---------------------------------------------------------------------------
// Public API (used by useSyncExternalStore)
// ---------------------------------------------------------------------------

export function subscribeSettings(listener: Listener): () => void {
	settingsListeners.add(listener);
	return () => settingsListeners.delete(listener);
}

export function subscribeAppState(listener: Listener): () => void {
	appStateListeners.add(listener);
	return () => appStateListeners.delete(listener);
}

export function getSettingsSnapshot(): PowPowSettings {
	return settingsSnapshot;
}

export function getAppStateSnapshot(): AppState {
	return appStateSnapshot;
}

export function sendSettingsUpdate(updated: Partial<PowPowSettings>) {
	logger.debug('Sending settings update:', updated);
	// Optimistic local update
	settingsSnapshot = { ...settingsSnapshot, ...updated };
	notifySettingsListeners();

	port?.postMessage({
		type: 'settingsUpdate',
		settings: updated,
	} as RuntimeMessage);
}

// ---------------------------------------------------------------------------
// Auto-connect on module load
// ---------------------------------------------------------------------------

connect();

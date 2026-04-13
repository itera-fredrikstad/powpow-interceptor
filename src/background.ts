import { DEFAULT_SETTINGS } from './lib/constants';
import { logger } from './lib/Logger';
import { ManifestLoadState } from './lib/ManifestLoadState';
import type { AppState } from './types/AppState';
import type { Manifest } from './types/Manifest';
import type { ManifestWebFile } from './types/ManifestWebFile';
import type { ManifestWebTemplate } from './types/ManifestWebTemplate';
import type { PowPowSettings } from './types/PowPowSettings';
import type { RuntimeMessage } from './types/RuntimeMessage';

let settings: PowPowSettings = { ...DEFAULT_SETTINGS };
let manifest: Manifest | undefined;
let manifestLoadState: ManifestLoadState = ManifestLoadState.NotLoaded;
const webFileUrlMap = new Map<string, ManifestWebFile>();
const webTemplateMap = new Map<string, ManifestWebTemplate>();
const attachedTabs = new Set<number>();
const ports = new Set<chrome.runtime.Port>();

// Gate event handlers on initialization completing (MV3 service worker race fix)
let resolveInitReady!: () => void;
const initReady = new Promise<void>((r) => {
	resolveInitReady = r;
});

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

async function loadSettings(): Promise<PowPowSettings> {
	try {
		const data = await chrome.storage.local.get(['settings']);
		if ('settings' in data) {
			logger.debug('Settings loaded from storage');
			return data.settings as PowPowSettings;
		}
	} catch (e) {
		logger.error('Failed to load settings:', e);
	}
	logger.debug('Using default settings');
	return { ...DEFAULT_SETTINGS };
}

async function storeSettings() {
	try {
		await chrome.storage.local.set({ settings });
	} catch (e) {
		logger.error('Failed to save settings:', e);
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tabMatchesDomain(url: string): boolean {
	try {
		if (!settings.isExtensionEnabled || !settings.targetHostname) return false;
		return settings.targetHostname === new URL(url).hostname;
	} catch (e) {
		logger.error('Failed to match tab domain:', e);
		return false;
	}
}

function buildAppState(): AppState {
	return {
		manifestState: manifestLoadState,
		webFileCount: webFileUrlMap.size,
		webTemplateCount: webTemplateMap.size,
		attachedTabCount: attachedTabs.size,
	};
}

// ---------------------------------------------------------------------------
// Port dispatch
// ---------------------------------------------------------------------------

function dispatchAppStateUpdate(excludePorts?: chrome.runtime.Port[]) {
	const appState = buildAppState();
	for (const port of ports) {
		if (!excludePorts?.includes(port)) {
			try {
				port.postMessage({
					type: 'appStateResponse',
					appState,
				} as RuntimeMessage);
			} catch (e) {
				logger.error('Failed to dispatch app state update:', e);
			}
		}
	}
}

function dispatchSettingsUpdate(excludePorts?: chrome.runtime.Port[]) {
	for (const port of ports) {
		if (!excludePorts?.includes(port)) {
			try {
				port.postMessage({
					type: 'settingsResponse',
					settings,
				} as RuntimeMessage);
			} catch (e) {
				logger.error('Failed to dispatch settings update:', e);
			}
		}
	}
}

async function loadManifest(): Promise<boolean> {
	logger.debug('Loading manifest from dev server...');

	manifestLoadState = ManifestLoadState.Loading;
	webFileUrlMap.clear();
	webTemplateMap.clear();

	try {
		const res = await fetch(`http://localhost:${settings.devServerPort}/manifest`);

		if (!res.ok) {
			throw new Error(`Server responded with status ${res.status}`);
		}

		manifest = (await res.json()) as Manifest;

		manifestLoadState = ManifestLoadState.Loaded;

		for (const webFile of manifest.webFiles) {
			webFileUrlMap.set(webFile.runtimeUrl, webFile);
		}
		for (const webTemplate of manifest.webTemplates) {
			webTemplateMap.set(webTemplate.guid, webTemplate);
		}

		logger.debug(`Manifest loaded: ${webFileUrlMap.size} web files, ${webTemplateMap.size} web templates`);
		return true;
	} catch (err) {
		manifestLoadState = ManifestLoadState.ServerUnreachable;
		logger.error('Failed to fetch manifest:', err);
		return false;
	}
}

async function attachToTab(tabId: number) {
	if (attachedTabs.has(tabId)) return;
	try {
		await chrome.debugger.attach({ tabId }, '1.3');

		attachedTabs.add(tabId);

		await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
			patterns: [
				{ urlPattern: '*', resourceType: 'Document', requestStage: 'Response' },
				{ urlPattern: '*.js', resourceType: 'Script', requestStage: 'Request' },
				{ urlPattern: '*.css', resourceType: 'Stylesheet', requestStage: 'Request' },
			],
		});

		logger.debug(`Attached debugger to tab ${tabId}`);
	} catch (e) {
		logger.warn(`Failed to attach debugger to tab ${tabId}:`, e);
		attachedTabs.delete(tabId);
	}
}

async function detachFromTab(tabId: number) {
	if (!attachedTabs.has(tabId)) return;
	logger.debug(`Detaching debugger from tab ${tabId}`);
	try {
		await chrome.debugger.detach({ tabId });
	} catch {
		// Tab may already be closed
	}
	attachedTabs.delete(tabId);
}

async function detachAll() {
	for (const tabId of [...attachedTabs]) {
		await detachFromTab(tabId);
	}
}

async function attachToMatchingTabs() {
	const tabs = await chrome.tabs.query({});
	for (const tab of tabs) {
		if (tab.id && tab.url && tabMatchesDomain(tab.url)) {
			await attachToTab(tab.id);
		}
	}
}

async function fetchFromLocal(servePath: string): Promise<string | null> {
	try {
		const res = await fetch(`http://localhost:${settings.devServerPort}${servePath}`);
		if (!res.ok) return null;
		return await res.text();
	} catch {
		return null;
	}
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
	await initReady;
	const p = (params ?? {}) as Record<string, unknown>;
	if (method !== 'Fetch.requestPaused' || !source.tabId) return;
	const tabId = source.tabId;
	const requestId = p.requestId as string;
	const resourceType = p.resourceType as string;
	const requestUrl = p.request ? ((p.request as Record<string, unknown>).url as string) : '';

	try {
		if (resourceType === 'Document') {
			const responseHeaders = p.responseHeaders as Array<{ name: string; value: string }> | undefined;
			const responseCode = (p.responseStatusCode as number) ?? 200;
			await handleDocumentResponse(tabId, requestId, responseCode, responseHeaders ?? []);
		} else if (resourceType === 'Script' || resourceType === 'Stylesheet') {
			const handled = await handleWebFileRequest(tabId, requestId, requestUrl);
			if (!handled) {
				await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
			}
		} else {
			await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
		}
	} catch (e) {
		logger.warn('Error handling request:', e);
		try {
			await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', { requestId });
		} catch {
			// Request may have already been handled
		}
	}
});

async function handleDocumentResponse(tabId: number, requestId: string, responseCode: number, responseHeaders: Array<{ name: string; value: string }>) {
	if (webTemplateMap.size === 0) {
		await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', { requestId });
		return;
	}

	const bodyResult = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', { requestId })) as {
		body: string;
		base64Encoded: boolean;
	};

	// Decode to a proper Unicode string so string operations work correctly
	let body: string;
	if (bodyResult.base64Encoded) {
		const bytes = Uint8Array.from(atob(bodyResult.body), (c) => c.charCodeAt(0));
		body = new TextDecoder().decode(bytes);
	} else {
		body = bodyResult.body;
	}
	let modified = false;

	// Find <script ... data-webtemplate-id="GUID" ...>...</script> blocks
	const scriptPattern = /<script([^>]*\bdata-webtemplate-id\s*=\s*"([0-9a-fA-F-]+)"[^>]*)>([\s\S]*?)<\/script>/gi;
	const replacements: Array<{ fullMatch: string; attrs: string; guid: string; content: string }> = [];

	let match: RegExpExecArray | null = scriptPattern.exec(body);
	while (match !== null) {
		replacements.push({ fullMatch: match[0], attrs: match[1], guid: match[2], content: match[3] });
		match = scriptPattern.exec(body);
	}

	for (const r of replacements) {
		const template = webTemplateMap.get(r.guid);
		if (!template) continue;

		const replacement = await fetchFromLocal(template.servePath);
		if (replacement === null) continue;

		// Strip wrapping <script> tags from fetched content to avoid double-wrapping
		const stripped = replacement.replace(/^\s*<script[^>]*>([\s\S]*)<\/script>\s*$/i, '$1');

		// Use function replacement to avoid $-pattern interpretation in the replacement string
		body = body.replace(r.fullMatch, () => `<script${r.attrs}>${stripped}</script>`);
		logger.debug(`Replaced web template ${r.guid}`);
		modified = true;
	}

	if (modified) {
		// Encode Unicode string → UTF-8 bytes → base64
		const encodedBody = btoa(unescape(encodeURIComponent(body)));
		// Forward original headers but drop Content-Length (body size has changed)
		const filteredHeaders = responseHeaders.filter((h) => h.name.toLowerCase() !== 'content-length');
		await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
			requestId,
			responseCode,
			responseHeaders: filteredHeaders,
			body: encodedBody,
		});
	} else {
		await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', { requestId });
	}
}

async function handleWebFileRequest(tabId: number, requestId: string, url: string): Promise<boolean> {
	if (webFileUrlMap.size === 0) return false;

	let urlPath: string;
	try {
		urlPath = new URL(url).pathname;
	} catch {
		return false;
	}

	const webFile = webFileUrlMap.get(urlPath);
	if (!webFile) return false;

	const content = await fetchFromLocal(webFile.servePath);
	if (content === null) return false;

	const mimetype = urlPath.endsWith('.css') ? 'text/css' : 'application/javascript';
	logger.debug(`Intercepted web file: ${urlPath}`);
	const encodedBody = btoa(unescape(encodeURIComponent(content)));
	await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
		requestId,
		responseCode: 200,
		responseHeaders: [
			{ name: 'Content-Type', value: mimetype },
			{ name: 'X-PowPow-Intercepted', value: 'true' },
		],
		body: encodedBody,
	});
	return true;
}

chrome.debugger.onDetach.addListener((source) => {
	if (source.tabId) {
		attachedTabs.delete(source.tabId);
		dispatchAppStateUpdate();
	}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	await initReady;
	if (!settings.isExtensionEnabled) return;
	if (changeInfo.status !== 'loading' || !tab.url) return;

	if (tabMatchesDomain(tab.url)) {
		await attachToTab(tabId);
	} else if (attachedTabs.has(tabId)) {
		await detachFromTab(tabId);
	}

	dispatchAppStateUpdate();
});

chrome.tabs.onRemoved.addListener((tabId) => {
	attachedTabs.delete(tabId);
	dispatchAppStateUpdate();
});

// ---------------------------------------------------------------------------
// Apply settings (re-fetch manifest, re-attach tabs, broadcast)
// ---------------------------------------------------------------------------

async function applySettings() {
	await storeSettings();

	if (settings.isExtensionEnabled && settings.targetHostname) {
		await loadManifest();
		await detachAll();
		await attachToMatchingTabs();
	} else {
		await detachAll();
		manifest = undefined;
		manifestLoadState = ManifestLoadState.NotLoaded;
		webFileUrlMap.clear();
		webTemplateMap.clear();
	}

	dispatchAppStateUpdate();
}

// ---------------------------------------------------------------------------
// Port-based communication with popup
// ---------------------------------------------------------------------------

chrome.runtime.onConnect.addListener((port) => {
	logger.debug('Port connected from popup');
	ports.add(port);

	// Push current state once init is done (settings may still be loading)
	initReady.then(() => {
		if (!ports.has(port)) return;
		port.postMessage({
			type: 'settingsResponse',
			settings,
		} as RuntimeMessage);
		port.postMessage({
			type: 'appStateResponse',
			appState: buildAppState(),
		} as RuntimeMessage);
	});

	port.onMessage.addListener(async (message: RuntimeMessage) => {
		switch (message.type) {
			case 'settingsRequest': {
				port.postMessage({
					type: 'settingsResponse',
					settings,
				} as RuntimeMessage);
				break;
			}
			case 'settingsUpdate': {
				settings = { ...settings, ...message.settings };
				await applySettings();
				// Reply to sender (port may have disconnected during applySettings)
				if (ports.has(port)) {
					try {
						port.postMessage({
							type: 'settingsResponse',
							settings,
						} as RuntimeMessage);
					} catch (e) {
						logger.warn('Failed to reply with settings:', e);
					}
				}
				// Broadcast to other connected popups
				dispatchSettingsUpdate([port]);
				break;
			}
			case 'appStateRequest': {
				port.postMessage({
					type: 'appStateResponse',
					appState: buildAppState(),
				} as RuntimeMessage);
				break;
			}
			default:
				logger.warn('Unknown port message type:', message.type);
		}
	});

	port.onDisconnect.addListener(() => {
		logger.debug('Port disconnected from popup');
		ports.delete(port);
	});
});

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

(async () => {
	logger.debug('Initializing background service worker');
	settings = await loadSettings();

	if (settings.isExtensionEnabled && settings.targetHostname) {
		await loadManifest();
		await attachToMatchingTabs();
	}

	resolveInitReady();
})();

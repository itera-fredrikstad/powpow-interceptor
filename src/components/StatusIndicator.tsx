import { ManifestLoadState } from '../lib/ManifestLoadState';
import { useAppState } from '../lib/useAppState';
import { useSettings } from '../lib/useSettings';

export function StatusIndicator() {
	const { appState: { manifestState, webFileCount, webTemplateCount, attachedTabCount } } = useAppState();
	const { settings: { isExtensionEnabled } } = useSettings();

	return (
		<div className="flex gap-2 text-xs">
			{!isExtensionEnabled ? (
				<>
					<div className="w-2 h-2 m-1 rounded-full bg-white/20" />
					<div>Extension disabled</div>
				</>
			) : manifestState === ManifestLoadState.ServerUnreachable ? (
				<>
					<div className="w-2 h-2 m-1 rounded-full bg-red-500" />
					<div>Server not reachable</div>
				</>
			) : manifestState === ManifestLoadState.Loading ? (
				<>
					<div className="w-2 h-2 m-1 rounded-full bg-yellow-500 animate-pulse" />
					<div>Loading manifest...</div>
				</>
			) : manifestState === ManifestLoadState.Loaded ? (
				<>
					<div className="w-2 h-2 m-1 rounded-full bg-green-500" />
					<div className="flex flex-col gap-2">
						<div>
							Connected &mdash; {webFileCount} web file{webFileCount !== 1 ? 's' : ''}, {webTemplateCount} web template{webTemplateCount !== 1 ? 's' : ''}
						</div>
						{attachedTabCount > 0 && (
							<div>
								Intercepting {attachedTabCount} tab{attachedTabCount !== 1 ? 's' : ''}
							</div>
						)}
					</div>
				</>
			) : null}
		</div>
	);
}

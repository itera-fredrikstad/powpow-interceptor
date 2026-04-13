import { useSettings } from '../lib/useSettings';

export function GlobalToggle() {
	const { settings, updateSettings } = useSettings();
	return (
		<button
			type="button"
			onClick={() => updateSettings({ isExtensionEnabled: !settings.isExtensionEnabled })}
			className={['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', settings.isExtensionEnabled ? 'bg-green-500' : 'bg-neutral-600'].join(' ')}
			title={settings.isExtensionEnabled ? 'Disable all interceptions' : 'Enable all interceptions'}
		>
			<span className={['inline-block h-4 w-4 rounded-full bg-white transition-transform', settings.isExtensionEnabled ? 'translate-x-6' : 'translate-x-1'].join(' ')} />
		</button>
	);
}

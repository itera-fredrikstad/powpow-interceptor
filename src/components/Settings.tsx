import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../lib/useSettings';
import { isNumericString, isValidHostname, isValidPort } from '../lib/utils';

export function Settings() {
	const { settings, updateSettings } = useSettings();

	const [devServerPort, setDevServerPort] = useState(settings.devServerPort);
	const [devServerPortError, setDevServerPortError] = useState<string>();

	const [targetHostname, setTargetHostname] = useState(settings.targetHostname);
	const [targetHostnameError, setTargetHostnameError] = useState<string>();

	useEffect(() => {
		setDevServerPort(settings.devServerPort);
	}, [settings.devServerPort]);

	useEffect(() => {
		setTargetHostname(settings.targetHostname);
	}, [settings.targetHostname]);

	const commitPort = useCallback(() => {
		updateSettings({ devServerPort: devServerPort });
	}, [devServerPort, updateSettings]);

	const commitDomain = useCallback(() => {
		updateSettings({ targetHostname: targetHostname });
	}, [targetHostname, updateSettings]);

	return (
		<div className="flex flex-col gap-4 rounded bg-zinc-800 p-4 border border-zinc-700">
			<div className="flex flex-col gap-2">
				<label htmlFor="devServerPort" className="uppercase text-base">
					Dev server port
				</label>
				<div className="flex flex-row items-center">
					<div className="w-min text-zinc-400 bg-zinc-700 border border-zinc-700 rounded-s px-2 py-1 text-sm">http://localhost:</div>
					<input
						id="devServerPort"
						type="text"
						value={Number.isNaN(devServerPort) ? '' : devServerPort}
						onBeforeInput={(ev) => {
							if (!isNumericString(ev.data || '')) {
								ev.preventDefault();
							} else {
								const selectionLength = (ev.currentTarget.selectionEnd || 0) - (ev.currentTarget.selectionStart || 0);
								if (ev.currentTarget.value.length - selectionLength >= 5) {
									ev.preventDefault();
								}
							}
						}}
						onChange={(ev) => {
							setDevServerPort(Number.parseInt(ev.currentTarget.value, 10));
						}}
						onBlur={(ev) => {
							if (!isValidPort(devServerPort)) {
								const errorMessage = 'Please enter a valid port number between 1024 and 65535.';
								setDevServerPortError(errorMessage);
								ev.currentTarget.setCustomValidity(errorMessage);
							} else {
								setDevServerPortError('');
								ev.currentTarget.setCustomValidity('');
								commitPort();
							}
						}}
						className="w-full bg-zinc-900 border border-zinc-700 rounded-e px-2 py-1 text-sm"
					/>
				</div>
				{devServerPortError && (
					<div className="text-red-500 text-sm" role="alert">
						{devServerPortError}
					</div>
				)}
			</div>
			<div className="flex flex-col gap-2">
				<label htmlFor="targetHostname" className="text-base uppercase">
					Target portal hostname
				</label>
				<input
					id="targetHostname"
					type="text"
					value={targetHostname}
					onChange={(ev) => {
						setTargetHostname(ev.target.value);
					}}
					onBlur={(ev) => {
						if (!isValidHostname(targetHostname)) {
							const errorMessage = targetHostname.length === 0 ? 'Hostname cannot be empty.' : 'Please enter a valid hostname.';
							setTargetHostnameError(errorMessage);
							ev.currentTarget.setCustomValidity(errorMessage);
						} else {
							setTargetHostnameError('');
							ev.currentTarget.setCustomValidity('');
							commitDomain();
						}
					}}
					onInvalid={(ev) => {
						console.debug('now', ev);
					}}
					placeholder="myportal.powerappsportals.com"
					className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm invalid:border-red-500"
				/>
				{targetHostnameError && (
					<div className="text-red-500 text-sm" role="alert">
						{targetHostnameError}
					</div>
				)}
			</div>
		</div>
	);
}

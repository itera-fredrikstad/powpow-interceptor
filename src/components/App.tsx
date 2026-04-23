import { GlobalToggle } from './GlobalToggle';
import { LogoGitHub } from './LogoGitHub';
import { LogoPowPow } from './LogoPowPow';
import { Settings } from './Settings';
import { StatusIndicator } from './StatusIndicator';

export function App() {
	return (
		<>
			<header className="p-3 bg-linear-to-tr/oklch from-amber-800/50 to-zinc-800 border-b border-zinc-700 flex items-center justify-between">
				<LogoPowPow className="text-3xl" />
				<GlobalToggle />
			</header>

			<main className="p-3">
				<Settings />
			</main>

			<footer className="p-3 bg-linear-to-bl/oklch from-amber-800/50 to-zinc-800 border-t border-zinc-700 flex items-center gap-2">
				<StatusIndicator />
				<a href="https://github.com/itera-fredrikstad/powpow-interceptor" target="_blank" rel="noopener noreferrer" className="ms-auto text-lg">
					<LogoGitHub />
				</a>
			</footer>
		</>
	);
}

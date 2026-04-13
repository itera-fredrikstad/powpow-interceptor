class Logger {
	private _prefix = '';

	private _consoleDebugInternal = console.debug.bind(console);
	private _consoleLogInternal = console.log.bind(console);
	private _consoleInfoInternal = console.info.bind(console);
	private _consoleWarnInternal = console.warn.bind(console);
	private _consoleErrorInternal = console.error.bind(console);

	constructor(prefix: string) {
		this._prefix = prefix;
	}

	debug(...args: Parameters<typeof console.debug>) {
		this._consoleDebugInternal(this._prefix, ...args);
	}

	log(...args: Parameters<typeof console.log>) {
		this._consoleLogInternal(this._prefix, ...args);
	}

	info(...args: Parameters<typeof console.info>) {
		this._consoleInfoInternal(this._prefix, ...args);
	}

	warn(...args: Parameters<typeof console.warn>) {
		this._consoleWarnInternal(this._prefix, ...args);
	}

	error(...args: Parameters<typeof console.error>) {
		this._consoleErrorInternal(this._prefix, ...args);
	}
}

const logger = new Logger('[PowPow Interceptor]');

export { type Logger, logger };

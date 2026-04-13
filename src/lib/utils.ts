export function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

export function isValidHostname(hostname: string): boolean {
	const hostnameRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
	return hostnameRegex.test(hostname);
}

export function isNumericString(value: string): boolean {
	return /^[0-9]+$/.test(value);
}

export const ManifestLoadState = {
	ServerUnreachable: -1,
	NotLoaded: 0,
	Loading: 1,
	Loaded: 2,
} as const;

export type ManifestLoadState = (typeof ManifestLoadState)[keyof typeof ManifestLoadState];

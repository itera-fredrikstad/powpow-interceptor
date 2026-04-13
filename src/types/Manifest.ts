import type { ManifestWebFile } from './ManifestWebFile';
import type { ManifestWebTemplate } from './ManifestWebTemplate';

export interface Manifest {
	webFiles: ManifestWebFile[];
	webTemplates: ManifestWebTemplate[];
}

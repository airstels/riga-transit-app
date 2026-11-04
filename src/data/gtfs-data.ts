import type { Stop } from './stops';

// Empty until the official monthly Rīgas satiksme GTFS archive is imported.
export const officialStops: Stop[] = [];
export const gtfsMetadata = {
  source: null as string | null,
  importedAt: null as string | null,
  stopCount: 0,
  routeCount: 0,
  license: 'CC0 1.0',
};

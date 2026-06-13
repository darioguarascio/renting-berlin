/** Approximate center points for Berlin neighborhoods (map pins). */
export const NEIGHBORHOOD_CENTERS: Record<string, [number, number]> = {
  mitte: [52.520, 13.405],
  kreuzberg: [52.499, 13.418],
  neukolln: [52.482, 13.435],
  friedrichshain: [52.515, 13.454],
  'prenzlauer-berg': [52.538, 13.424],
  charlottenburg: [52.505, 13.303],
  schoneberg: [52.486, 13.344],
  tempelhof: [52.468, 13.385],
  wedding: [52.550, 13.366],
  pankow: [52.569, 13.401],
  lichtenberg: [52.520, 13.499],
  treptow: [52.493, 13.469],
  steglitz: [52.458, 13.322],
  zehlendorf: [52.434, 13.258],
  spandau: [52.535, 13.199],
  reinickendorf: [52.574, 13.321],
  marzahn: [52.545, 13.544],
  hellersdorf: [52.537, 13.607],
  koepenick: [52.442, 13.574],
};

const BERLIN_CENTER: [number, number] = [52.52, 13.405];

export function neighborhoodCenter(slug: string): [number, number] {
  return NEIGHBORHOOD_CENTERS[slug] ?? BERLIN_CENTER;
}

export function requestMapPosition(desiredNeighborhoods: string[]): [number, number] {
  if (desiredNeighborhoods.length === 0) return BERLIN_CENTER;
  const points = desiredNeighborhoods.map(neighborhoodCenter);
  const lat = points.reduce((sum, [la]) => sum + la, 0) / points.length;
  const lng = points.reduce((sum, [, ln]) => sum + ln, 0) / points.length;
  return [lat, lng];
}

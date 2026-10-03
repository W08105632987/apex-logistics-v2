import { Shipment } from '../types';

export type LatLng = [number, number];

/** True only for real-looking coordinates; [0, 0] is treated as "not set". */
export const isUsableCoordinate = (c: unknown): c is LatLng =>
  Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180 && !(c[0] === 0 && c[1] === 0);

/** A real geographic map is shown only when both route ends have usable coordinates. */
export const hasRealRoute = (s: Shipment) => isUsableCoordinate(s.originHub?.coordinates) && isUsableCoordinate(s.destinationHub?.coordinates);

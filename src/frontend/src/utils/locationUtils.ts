/**
 * Haversine formula — returns distance between two GPS coords in kilometers
 */
export function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filter any array of items that have lat/lng stored.
 * Returns items within `radiusKm`, with their computed distance attached.
 */
export function filterByRadius<T extends { lat?: number; lng?: number }>(
  items: T[],
  userLat: number,
  userLng: number,
  radiusKm: number,
): Array<T & { distanceKm: number }> {
  return items
    .filter((item) => item.lat !== undefined && item.lng !== undefined)
    .map((item) => ({
      ...item,
      distanceKm: getDistanceKm(userLat, userLng, item.lat!, item.lng!),
    }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Build a Google Maps Directions URL from user location to destination
 */
export function getGoogleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
}

export function buildReservationUrl(baseUrl) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('ref', 'ReserveMap');
    return url.toString();
  } catch {
    return baseUrl;
  }
}

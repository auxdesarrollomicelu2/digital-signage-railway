export function isVideoMime(mime) {
  return String(mime || '').toLowerCase().startsWith('video/');
}

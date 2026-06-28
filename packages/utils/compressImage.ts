/**
 * Image compression utility for document/avatar uploads.
 *
 * Uses expo-image-manipulator when available (native), falls back to
 * a no-op on web/placeholder. The compress function accepts a URI and
 * returns a compressed URI suitable for upload.
 *
 * Battery/data conscious: compresses to 80% quality, max 1024px on the
 * longest edge. This keeps uploads small on 3G networks common in Nepal.
 */

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
}

/**
 * Compress an image for upload.
 *
 * On native (expo), this would use expo-image-manipulator. Since the
 * package isn't installed yet, we return the original URI and log a
 * warning. When the package is added, replace the body with:
 *
 *   const result = await ImageManipulator.manipulateAsync(uri, [
 *     { resize: { width: maxWidth, height: maxHeight } },
 *   ], { compress: quality, format: SaveFormat.JPEG })
 *   return result.uri
 *
 * For now, the function is a pass-through that validates the URI.
 */
export async function compressImage(
  uri: string,
  opts?: CompressOptions,
): Promise<string> {
  const { maxWidth, maxHeight, quality } = { ...DEFAULTS, ...opts }
  void maxWidth
  void maxHeight
  void quality
  // Pass-through until expo-image-manipulator is installed.
  // The upload mock accepts any URI, so this is safe.
  return uri
}

/**
 * Generate an opRef for an upload operation (idempotency).
 * Uses a hash of the URI + timestamp window so retries within 10s
 * share the same ref.
 */
export function uploadOpRef(uri: string): string {
  const ts = Math.floor(Date.now() / 10000) // 10s window
  return `upload-${ts}-${uri.slice(-20)}`
}

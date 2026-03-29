import QRCode from 'qrcode'

/**
 * Generate a QR code for the given URL.
 *
 * @param url  - The URL to encode
 * @param format - 'png' returns a data-URL string; 'svg' returns raw SVG markup
 * @returns A data URL (png) or SVG string (svg)
 */
export async function generateQRCode(
  url: string,
  format: 'png' | 'svg'
): Promise<string> {
  const options = {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  }

  if (format === 'svg') {
    return QRCode.toString(url, { ...options, type: 'svg' })
  }

  return QRCode.toDataURL(url, { ...options, type: 'image/png' })
}

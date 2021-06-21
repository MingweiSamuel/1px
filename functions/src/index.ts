import * as functions from "firebase-functions";
import type { Writable } from "stream";

const colorHexRegex = /^\/([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i;

export const img = functions.https.onRequest((request, response) => {
  const match = colorHexRegex.exec(request.path);
  if (!match) {
    const msg =
`Not Found
Path: "${request.path}"
Expected: "/{6 digit hex code}"
Example: "/f29530"`;
    response
      .status(404)
      .type("text")
      .send(msg);
  }
  else if (request.path !== match[0].toLowerCase()) {
    response.redirect(301, request.path.toLowerCase());
  }
  else {
    if (4 !== match.length) {
      functions.logger.error(`Invalid regex match length: ${match.length}, url: ${request.url}.`);
      response.sendStatus(500);
    }
    else {
      const rgbBytes = match.slice(1).map(s => parseInt(s, 16)) as [number, number, number];
      response
        .setHeader("cache-control", "public, max-age=31536000")
        .type("bmp");
      writeDib(response, rgbBytes);
    }
  }
});

const DIB_PREFIX = Uint8Array.of(
  0x42, 0x4D,             // Signature 'BM'
  0x8e, 0x00, 0x00, 0x00, // Size: 142 bytes
  0x00, 0x00,             // Unused
  0x00, 0x00,             // Unused
  0x8a, 0x00, 0x00, 0x00, // Offset to image data

  0x7c, 0x00, 0x00, 0x00, // DIB header size (124 bytes)
  0x01, 0x00, 0x00, 0x00, // Width (4px)
  0x01, 0x00, 0x00, 0x00, // Height (2px)
  0x01, 0x00,             // Planes (1)
  0x20, 0x00,             // Bits per pixel (32)
  0x03, 0x00, 0x00, 0x00, // Format (bitfield = use bitfields | no compression)
  0x20, 0x00, 0x00, 0x00, // Image raw size (32 bytes)
  0x13, 0x0B, 0x00, 0x00, // Horizontal print resolution (2835 = 72dpi * 39.3701)
  0x13, 0x0B, 0x00, 0x00, // Vertical print resolution (2835 = 72dpi * 39.3701)
  0x00, 0x00, 0x00, 0x00, // Colors in palette (none)
  0x00, 0x00, 0x00, 0x00, // Important colors (0 = all)
  0x00, 0x00, 0xFF, 0x00, // R bitmask (00FF0000)
  0x00, 0xFF, 0x00, 0x00, // G bitmask (0000FF00)
  0xFF, 0x00, 0x00, 0x00, // B bitmask (000000FF)
  0x00, 0x00, 0x00, 0xFF, // A bitmask (FF000000)
  0x42, 0x47, 0x52, 0x73, // sRGB color space

  0x00, 0x00, 0x00, 0x00, // Unused R, G, B entries for color space
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,

  0x00, 0x00, 0x00, 0x00, // Unused Gamma X entry for color space
  0x00, 0x00, 0x00, 0x00, // Unused Gamma Y entry for color space
  0x00, 0x00, 0x00, 0x00, // Unused Gamma Z entry for color space

  0x00, 0x00, 0x00, 0x00, // Unknown
  0x00, 0x00, 0x00, 0x00, // Unknown
  0x00, 0x00, 0x00, 0x00, // Unknown
  0x00, 0x00, 0x00, 0x00, // Unknown

  // Image data here.
);

function writeDib(stream: Writable, rgbBytes: [number, number, number]) {
  stream.write(DIB_PREFIX);
  // Image data.
  stream.end(Uint8Array.of(rgbBytes[2], rgbBytes[1], rgbBytes[0], 0xFF));
}
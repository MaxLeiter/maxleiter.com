import { emitAsset } from '@framework/render/assets'

/**
 * The profile picture in the top bar: a drawn cartoon in the palette of the
 * channels island's 3D host. A hashed file rather than inline SVG, so the
 * ~1 KB is fetched once and cached instead of riding in every document.
 */
const AVATAR_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
  '<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa7d8"/><stop offset="1" stop-color="#173a57"/></linearGradient>' +
  '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<clipPath id="c"><circle cx="48" cy="48" r="48"/></clipPath></defs>' +
  '<g clip-path="url(#c)"><rect width="96" height="96" fill="url(#b)"/>' +
  '<ellipse cx="48" cy="100.8" rx="40.3" ry="30.7" fill="#e0603a"/>' +
  '<ellipse cx="48" cy="48" rx="25" ry="27.8" fill="#f0c4a0"/>' +
  '<path d="M20.2 34.6a27.8 19.2 0 0 1 55.6 0Z" fill="#3a2a22"/>' +
  '<ellipse cx="41.3" cy="28.8" rx="19.2" ry="9.6" transform="rotate(-22.9 41.3 28.8)" fill="#3a2a22"/>' +
  '<ellipse cx="39.4" cy="49.9" rx="2.9" ry="4.3" fill="#1a1a1a"/><ellipse cx="56.6" cy="49.9" rx="2.9" ry="4.3" fill="#1a1a1a"/>' +
  '<path d="M54.4 59.6a6.7 6.7 0 0 1-12.8 0" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round"/>' +
  '<ellipse cx="48" cy="9.6" rx="57.6" ry="40.3" fill="url(#g)"/></g></svg>'

export function Avatar({ className }: { className: string }) {
  return (
    <img
      className={className}
      src={emitAsset('avatar', 'svg', AVATAR_SVG)}
      alt=""
      width={44}
      height={44}
    />
  )
}

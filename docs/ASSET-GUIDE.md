# Apex Logistics V2 — Visual Assets Pack

This archive intentionally contains **only imagery and motion-graphic design assets**, plus a short asset guide. It does not contain the website application or backend.

## Imagery

| File | Suggested use | Alt-text starting point |
|---|---|---|
| `images/air-freight.webp` | Air freight service page / carousel | Cargo aircraft at an airport freight operation. |
| `images/ocean-freight.webp` | Ocean freight service page | Container ship in a commercial harbor. |
| `images/express-delivery.webp` | Express delivery service page | Express parcel handling at a logistics facility. |
| `images/smart-warehouse.webp` | Warehousing / fulfillment page | Modern warehouse and distribution operations. |
| `images/cold-chain-pharmaceutical-logistics.webp` | Cold-chain page | Temperature-controlled pharmaceutical logistics setting. |
| `images/customs-and-port-terminal.webp` | Customs / global network page | Commercial port terminal and freight infrastructure. |

These are the six existing WebP assets extracted from the current site project. The blueprint calls for 10–15 distinct image compositions; the remaining commissioned scenes are not included and should be generated or licensed separately. Review each image visually before production use and write final alt text based on the actual visible scene.

## Motion graphics

- `motion/global-logistics-network.svg` — dark, abstract network graphic for a global capabilities / network section. Animated pulses are illustrative, not a live route feed.
- `motion/shipment-tracking-route.svg` — tracking journey motif for empty states, demos, or section decoration. It does not represent a customer's actual shipment.
- `motion/parcel-scan-pulse.svg` — parcel scan/loading illustration for tracking or quote submission states.
- `motion/motion-system.css` — optional lightweight CSS motion tokens and transitions, including reduced-motion handling.

The SVG files use embedded SVG animation. If a target browser or content security policy disables SVG animation, use the same assets as static illustrations or replace motion with CSS. Do not use decorative animation to communicate live operational status unless driven by real API data.

## Visual system

- Core palette: deep navy `#07182D`, cyan `#22D3EE`, sky `#38BDF8`, white / slate neutrals.
- Motion: purposeful and restrained; route pulses, short entrance transitions, soft status pulses. Avoid parallax or fast looping on content-heavy screens.
- Accessibility: honour `prefers-reduced-motion`; provide meaningful alt text for informative images; mark purely decorative graphics `aria-hidden="true"` when integrated.
- Performance: WebP imagery is pre-optimized; size crops to actual use, lazy-load below-the-fold content, and supply width/height to avoid layout shifts.

## Not included

No site source, app components, backend, generated hero image set beyond the six current assets, video footage, real map tiles, or live tracking data is included.

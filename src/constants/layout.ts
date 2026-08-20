// Shared spacing so every Home screen section is separated by the same amount.
// Sections own the gap *below* them, which keeps the first section flush with
// the header and avoids stacked margins between neighbours.
export const SECTION_GAP = 20;

// Horizontal inset used by the Home screen cards and banners.
export const SCREEN_PADDING = 16;

// assets/logo.png is the horizontal DealNux lockup (brand mark + wordmark) the
// client supplied. Screens size it by width and derive the height from this
// ratio, so the artwork fills its box instead of letterboxing inside a square.
export const LOGO_ASPECT = 5.2;

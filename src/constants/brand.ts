// Single source of truth for brand copy, so the slogan and the copyright line
// stay identical to the website everywhere they appear in the app. The client
// asked for both to be consistent across every page, so screens should import
// from here rather than hard-coding the strings.

export const BRAND_NAME = 'DealNux'

// Official slogan — must match the website exactly.
export const BRAND_SLOGAN = 'DealNux - Shop Smarter. Save Bigger.'

// Short form, for places that already show the "DealNux" wordmark above it.
export const BRAND_TAGLINE = 'Shop Smarter. Save Bigger.'

// Same copyright line as the website footer.
export const COPYRIGHT_TEXT =
    'Copyright © 2026 Brightway Consult & HR/Recruiting Solutions LLC. All rights reserved.'

// Mission statement — must match the website's About Us page word for word.
export const BRAND_MISSION = 'To help people save money smarter every day.'

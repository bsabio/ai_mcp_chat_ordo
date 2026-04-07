/**
 * Shared scroll threshold constants.
 *
 * The scroll pin and the boundary lock must agree on what "at the bottom"
 * means.  Using different thresholds creates a dead zone where the boundary
 * lock prevents further scrolling while the scroll pin refuses to
 * auto-scroll.  Exporting from a single source eliminates this invariant
 * violation at compile time.
 *
 * 48 px accommodates approximately 2–3 lines of body text at the default
 * font size.  This absorbs the height growth from any single streaming
 * text-append cycle, which prevents the pin from breaking due to the
 * TOCTOU race between scrollTo() and the subsequent scrollHeight read.
 */
export const SCROLL_BOTTOM_THRESHOLD_PX = 48;

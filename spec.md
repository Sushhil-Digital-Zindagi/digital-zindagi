# Digital Zindagi — Version 41

## Current State
- Homepage has Rate Calculator (full width), News/Jobs/Image Resizer/AI Enhancer buttons in 2-col grid
- AuthContext uses localStorage session with no expiry set
- Jobs page links open in new tab (external browser)
- VideoGallery has click-to-play already but needs verification
- Admin has masterToggles section for News/Jobs/Image/AI/YT/FB/IG
- EarningDashboard component exists in Admin
- No Age Calculator or Percentage Calculator pages/routes

## Requested Changes (Diff)

### Add
- Age Calculator page (Years/Months/Days from DOB)
- Percentage Calculator page (marks/total, what% of, increase/decrease)
- Safe In-App WebView component for external job/admit card links
- Age Calc + Percentage Calc buttons on homepage (inside the top section with News/Jobs buttons)
- Daily Earning Dashboard (24h/7d/30d/6m/Lifetime) — already has base, ensure it's wired

### Modify
- Rate Calculator button: change from w-full to ~50% width (side by side layout)
- AuthContext: set 30-day session expiry, check on restore, never auto-logout unless manual
- JobsPage: all Apply/Admit Card links use SafeWebView in-app instead of target=_blank
- NewsPage: all Read More links use SafeWebView in-app
- VideoGallery: confirm no autoplay (already click-to-play, verify)
- Admin masterToggles: ensure all section toggles (News, Jobs, ImageTools, YT, FB, Insta) are present

### Remove
- Nothing removed

## Implementation Plan
1. Create `AgeCalculatorPage.tsx` with DOB input, live Years/Months/Days output
2. Create `PercentageCalculatorPage.tsx` with 3 modes: marks%, what%of, increase/decrease
3. Create `SafeWebView.tsx` component — iframe-based in-app browser with back button
4. Update `AuthContext.tsx` — add 30-day expiry timestamp to stored session
5. Update `HomePage.tsx` — Rate Calculator button at 50% width, add Age Calc + Percentage Calc buttons in the top grid
6. Update `JobsPage.tsx` and `NewsPage.tsx` — use SafeWebView instead of target=_blank
7. Update `App.tsx` — add routes for /age-calculator and /percentage-calculator
8. Verify VideoGallery has no autoplay
9. Build V41, deploy, push to GitHub

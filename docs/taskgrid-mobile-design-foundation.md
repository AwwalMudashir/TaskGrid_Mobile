# TaskGrid mobile design foundation

## Outcome

TaskGrid uses a restrained service-marketplace system: one clear primary action per screen, compact supporting actions, honest empty states, and visible trust and safety cues. The interface must stay specific to TaskGrid's actual client, worker, task, message, wallet, profile, verification, and emergency-contact workflows.

## Research synthesis

Contemporary service-marketplace references consistently prioritize fast task posting, browsable categories, trusted providers, clear booking state, payment confidence, and dual client/worker journeys.[1][2][3] A finance-oriented Figma kit reinforced the value of a defined type scale, spacing system, reusable components, variants, and light/dark tokens rather than styling each screen independently.[4]

These are visual references, not product requirements. TaskGrid therefore borrows their hierarchy and polish without importing unrelated promotions, subscriptions, maps, ratings, or services.

Platform guidance shaped the implementation more strongly than showcase aesthetics. Dark mode uses layered deep-navy surfaces rather than pure black, with moderated accents and clear elevation.[5] Both skins preserve readable contrast, while controls remain comfortably tappable and spaced.[6][7] Motion is brief and purposeful; entrance movement becomes static when Reduce Motion is enabled.[8]

## Foundation

- Brand: indigo `#5557E8`, with teal used sparingly for supportive/success moments.
- Light: cool canvas `#F5F7FB`, white surfaces, ink `#172033`, subtle gray-blue borders.
- Dark: canvas `#0B1020`, layered navy surfaces, softened indigo `#9A9BFF`.
- Type: Manrope for expressive headings; Inter for forms, body text, and data.
- Shape: 16 px controls, 22 px cards, 30 px feature panels. Pills are reserved for statuses and compact selectors.
- Motion: 320–360 ms fades with a 10 px vertical offset, staggered only for major sections.
- Navigation: five stable destinations—Home, Tasks, Messages, Wallet, Profile.

## Screen rules

1. Lead with the user's next real action.
2. Use one feature card at most above the fold.
3. Group related rows inside one surface; avoid a floating card for every setting.
4. Never display invented balances, transactions, messages, or completed work as live data.
5. Use role-aware language: clients create/manage tasks; workers browse/manage work.
6. Show verification and emergency-contact readiness where it affects task access.
7. Empty states explain what will appear and what real action unlocks it.
8. New screens must support both themes and Reduce Motion before being considered complete.

## Sources

[1] Behance, “HelpHub — Home Services Mobile App UX/UI Case Study,” 2025. https://www.behance.net/gallery/217375959/HelpHub-Home-Services-Mobile-App-UX-UI-Case-Study

[2] Behance, “On-Demand Home Services App UI,” 2026. https://www.behance.net/gallery/248671509/On-Demand-Home-Services-App-UI

[3] Behance, “HousePro — Housekeepers Mobile App.” https://www.behance.net/gallery/161871223/HousePro-Housekeepers-Mobile-App

[4] Figma Community Forum, “Mini Finance UI Kit for Figma.” https://forum.figma.com/showcase-your-work-14/introducing-mini-finance-ui-kit-for-figma-39716

[5] Google Design, “Material Design Dark Theme.” https://design.google/library/material-design-dark-theme

[6] Apple Human Interface Guidelines, “Accessibility.” https://developer.apple.com/design/human-interface-guidelines/accessibility

[7] Material Design, “Accessibility.” https://m1.material.io/usability/accessibility.html

[8] Apple Human Interface Guidelines, “Motion.” https://developer.apple.com/design/human-interface-guidelines/motion

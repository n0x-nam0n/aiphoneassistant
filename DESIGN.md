# Design

## Source of truth
Active, 2026-10-17. Restaurant desk and password setup. Evidence: live marketing homepage, index.html final theme, desk.html, desk.css and browser checks. No prior DESIGN.md.

## Brand
Warm, editorial and practical. Match the existing Hostess homepage; avoid unrelated blue dashboard themes.

## Product goals
Make event inquiries, callback tasks and call history distinguishable while keeping the site coherent. Success: users can identify each section and its purpose at a glance.

## Personas and jobs
Restaurant owners manage their location; the authorized master operator switches restaurants and follows up on requests.

## Information architecture
Desk: restaurant selector, summary, shared search/filter controls, event inquiries, callbacks, call history. Password setup is a separate page.

## Design principles
Distinct sections, familiar controls, explicit labels, restrained color. Colors reinforce rather than replace meaning.

## Visual language
Homepage cream #f8f5ec, paper #fbf8f0, ink #11151d, terracotta #c45d3c, sage #4c8959. Georgia display headings; DM Sans operational text; DM Mono labels. Events use terracotta, callbacks sage, history warm taupe. Light tinted headers and substantial left rules identify sections.

## Components
Reuse existing tables, filters, buttons and status selects. Section classes own accent/tint/border variables; desk.css owns tokens. Numbered headings and explicit status text accompany colors.

## Accessibility
Target WCAG AA contrast and keyboard access. Dark text on pale tints, visible focus indicators, semantic headings. Never communicate status by color alone.

## Responsive behavior
Preserve existing 1080px and 700px breakpoints. Stack headers on narrow screens; scroll tables within their sections without widening the page.

## Interaction states
Retain loading, filtered empty, error and success messages. Preserve data, selection and filter behavior when changing styles.

## Content voice
Plain labels: Event inquiries, Callbacks to make, Call log. Use numbered section labels for scanning.

## Implementation constraints
Static HTML/CSS/JavaScript. No new dependencies. Verify desktop/mobile rendering and existing search/export browser checks.

## Open questions
None blocking this scoped visual change.

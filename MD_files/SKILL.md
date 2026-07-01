---
name: design-system-between
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Between

## Mission
Deliver implementation-ready design-system guidance for Between that can be applied consistently across marketing site interfaces.

## Brand
- Product/brand: Between
- URL: https://between.indevs.in/
- Audience: buyers, teams, and decision-makers
- Product surface: marketing site

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=Inter`, `font.family.stack=Inter, system-ui, sans-serif`, `font.size.base=15px`, `font.weight.base=400`, `font.lineHeight.base=22.5px`
- Typography scale: `font.size.xs=12px`, `font.size.sm=13px`, `font.size.md=14px`, `font.size.lg=15px`, `font.size.xl=16px`, `font.size.2xl=17px`, `font.size.3xl=18px`, `font.size.4xl=19px`
- Color palette: `color.text.primary=oklch(0.21 0.02 264)`, `color.text.secondary=#5c5c5c`, `color.text.tertiary=#ffffff`, `color.text.inverse=#2d2d2d`, `color.surface.base=#000000`, `color.surface.strong=oklch(1 0 0)`, `color.border.default=oklch(0.92 0.005 250)`
- Spacing scale: `space.1=4px`, `space.2=12px`, `space.3=14px`, `space.4=16px`, `space.5=18px`, `space.6=20px`, `space.7=24px`, `space.8=28px`
- Radius/shadow/motion tokens: `radius.xs=4px`, `radius.sm=12px`, `radius.md=14px`, `radius.lg=32px`, `radius.xl=40px` | `shadow.1=rgba(0, 0, 0, 0.02) 0px 10px 30px 0px`, `shadow.2=rgba(0, 0, 0, 0.1) 0px 32px 80px 0px`, `shadow.3=rgba(59, 130, 246, 0.4) 0px 0px 20px 0px`, `shadow.4=rgba(0, 0, 0, 0.04) 0px 24px 64px 0px` | `motion.duration.instant=150ms`, `motion.duration.fast=200ms`, `motion.duration.normal=300ms`, `motion.duration.slow=400ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->

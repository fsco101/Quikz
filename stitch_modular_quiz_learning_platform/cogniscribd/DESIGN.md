---
name: CogniScribd
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#47464f'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#787680'
  outline-variant: '#c8c5d0'
  surface-tint: '#5b598c'
  primary: '#070235'
  on-primary: '#ffffff'
  primary-container: '#1e1b4b'
  on-primary-container: '#8683ba'
  inverse-primary: '#c4c1fb'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000f07'
  on-tertiary: '#ffffff'
  tertiary-container: '#002819'
  on-tertiary-container: '#009d6c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c1fb'
  on-primary-fixed: '#181445'
  on-primary-fixed-variant: '#444173'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system synthesizes deep academic rigor with high-retention interactive mechanics. Built for students, researchers, and lifelong learners, the aesthetic merges the focused, document-heavy clarity of a modern digital library with the kinetic feedback of game-based learning platforms.

### Aesthetic Persona
- **Scholarly & Structured:** Reliable document surfaces, precise tabular layouts, and clear typographic hierarchies honor research integrity.
- **Dynamic & Tactile:** Micro-interactions, vibrant status indicators, and distinct achievement tokens reward continuous study without trivializing the material.
- **Visual Stance:** A refined hybrid of modern corporate utility and high-energy interactive components—favoring crisp surfaces, structured container hierarchies, and deliberate bursts of vibrant feedback over gratuitous ornamentation.

## Colors

The palette balances authoritative deep indigos against high-chroma functional accents to convey both prestige and playfulness.

### Primary & Academic Core
- **Deep Indigo / Navy (`#1E1B4B`, `#312E81`):** Primary anchors for navigation bars, active document headers, and high-emphasis typography.
- **Surface & Tint Neutrals (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`):** Soft, low-strain paper-like backgrounds engineered for prolonged document review and distraction-free comprehension.

### Accents & Gamified Feedback
- **Electric Violet (`#6366F1`):** Applied to primary actions, interactive progress states, quiz selection highlights, and streak highlights.
- **Emerald Green (`#10B981`, `#059669`):** Indicates success, mastery tiers, passing quiz status, and completed study sprints.
- **Amber Gold (`#F59E0B`):** Denotes warnings, approaching deadlines, streaks at risk, and intermediate achievement ranks.
- **Coral Rose (`#EF4444`):** Flags incorrect quiz responses, expired verification locks, and critical system alerts.

### Surface Hierarchy
Background surfaces shift from neutral canvas (`#F8FAFC`) to elevated card surfaces (`#FFFFFF`), with tinted container states (`#EEF2FF`) used for active reading highlights and quiz question frames.

## Typography

The type system pairs **Plus Jakarta Sans** for headlines, gamified numbers, and control labels with **Inter** for document passages, questions, and long-form reference materials.

- **Plus Jakarta Sans:** Provides friendly geometry, distinct numeric forms for timers and scores, and commanding authority for section milestones.
- **Inter:** Ensures maximum legibility across dense annotations, dual-column reading layouts, and technical documentation panels.
- **Document Readability:** Body text defaults to `15px` on desktop and `16px` on reading viewports, with a strict `1.6` line-height ratio on long-form prose to reduce cognitive fatigue during extended study sessions.

## Layout & Spacing

The system implements a dual-mode layout engine: an adaptive 12-column grid for dashboards and study hubs, paired with a specialized split-view layout for concurrent reading and quiz evaluation.

### Breakpoints & Adaptability
- **Mobile (<768px):** Single-column stack. Document and quiz panels switch to bottom tabs or progressive sliding drawers. Section margin: `1rem`, gutter: `1rem`.
- **Tablet (768px - 1024px):** 8-column layout. Collapsible navigation with quick-toggle split views. Section margin: `1.5rem`, gutter: `1rem`.
- **Desktop (>1024px):** 12-column grid. Supports fixed-width reader views (65–75ch optimal reading measure) positioned adjacent to an interactive test/notes side-panel. Section margin: `2rem`, gutter: `1.5rem`.

### Rhythmic Grid
Vertical rhythm relies on an 8px base grid (`0.5rem`). Micro-components (badges, pills, inputs) use strict 4px padding adjustments (`space-xs`, `space-sm`).

## Elevation & Depth

Visual hierarchy combines clean structural borders with crisp, ambient drop shadows, preventing the interface from feeling flat while avoiding muddy multi-layered drop shadows.

### Elevation Levels
- **Level 0 (Flat / Canvas):** Neutral background (`#F8FAFC`). No shadow. Delimited by a 1px border (`#E2E8F0`).
- **Level 1 (Cards & Library Tiles):** Crisp card base with subtle ambient lift: `0 1px 3px rgba(30, 27, 75, 0.05), 0 1px 2px rgba(30, 27, 75, 0.03)` wrapped in a 1px stroke (`#E2E8F0`).
- **Level 2 (Quiz Option Tiles & Active Floating Bars):** Enhanced interactive presence: `0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -2px rgba(30, 27, 75, 0.06)`.
- **Level 3 (Modals, Timers & Gamification Overlays):** Strong focal lift: `0 20px 25px -5px rgba(30, 27, 75, 0.15), 0 8px 10px -6px rgba(30, 27, 75, 0.1)`.

### Tactile Edge
Active quiz choice cards employ an offset 3D tactile state: a solid 2px bottom border reinforcement in a darker tone of the element's primary color, delivering physical press feedback upon selection.

## Shapes

The design uses a balanced `roundedness: 2` (base radius `0.5rem` / `8px`) to reconcile academic precision with approachable, game-driven friendliness.

- **Base Radius (`0.5rem`):** Primary inputs, data table cells, action buttons, and small cards.
- **Large Radius (`1rem`):** Document viewer wrappers, quiz choice panels, and modal containers.
- **Pill Radius (`9999px`):** Gamified badges, level meters, live score tags, countdown timers, and interactive chips.

## Components

### Buttons
- **Primary Action (Electric Violet):** Solid `#6366F1` background, white label, `0.5rem` radius, with a subtle darker bottom accent (`#4F46E5`, 2px offset) that compresses down `1px` on `:active` for tactile responsiveness.
- **Academic Secondary:** Transparent background with a 1.5px border in `#312E81`, transitioning to `#EEF2FF` on hover.
- **Quiz Answer Blocks:** Large surface cards with a left-aligned letter badge (A, B, C, D) housed in a distinct square pill. Transitions instantly to `#10B981` (correct) or `#EF4444` (incorrect) upon trigger.

### Document Reader Panels
- Split-screen layout module with an elevated navigation bar for typography scaling, page flipping, and highlighting tools.
- Paper surface (`#FFFFFF`) framed within an `#E2E8F0` border, featuring a persistent marginal track for pinned quiz triggers and contextual flashcards.

### Gamified Badges & Streaks
- Compact pill-shaped modules containing high-contrast status icons.
- Streak counters feature Ember/Amber (`#F59E0B`) gradient fills with high-emphasis bold numerals.
- Mastery badges feature an SVG laurels ring enclosing an Emerald `#10B981` checkmark or trophy icon.

### Progress Locks & Gated Content
- Gated chapters or advanced quiz modules feature an opaque surface overlay (`rgba(248, 250, 252, 0.85)`) backed by a centered badge containing a deep navy lock icon.
- A fractional progress meter (e.g., "Score 80% on Module 2 to Unlock") is rendered directly below the lock in bold label text.

### Data Tables & Filter Bars
- Academic performance tables feature a distinct `#F8FAFC` header row, uppercase `label-sm` column titles, and clear `1px` borders (`#E2E8F0`).
- Integrated filter bars use multi-select pill chips that toggle between neutral outline and filled `#312E81` active states.

### Checkboxes & Radios
- Square (`checkbox`) and circular (`radio`) components rendered with a 2px stroke in `#64748B`.
- On selection, components snap into `#6366F1` or `#10B981` with an inner white checkmark or dot, accompanied by an animated scale bounce.
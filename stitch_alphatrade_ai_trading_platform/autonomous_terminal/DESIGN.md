---
name: Autonomous Terminal
colors:
  surface: '#0f131b'
  surface-dim: '#0f131b'
  surface-bright: '#353941'
  surface-container-lowest: '#0a0e15'
  surface-container-low: '#181c23'
  surface-container: '#1c2027'
  surface-container-high: '#262a32'
  surface-container-highest: '#31353d'
  on-surface: '#dfe2ed'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dfe2ed'
  inverse-on-surface: '#2d3038'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff5451'
  on-tertiary-container: '#5c0008'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0f131b'
  on-background: '#dfe2ed'
  surface-variant: '#31353d'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.02em
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
  label-caps:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-base: 16px
  space-lg: 20px
  space-xl: 24px
  space-2xl: 32px
  gutter-terminal: 8px
  margin-edge: 12px
---

## Brand & Style

This design system establishes an institutional-grade, mission-critical execution environment for quantitative fund managers, algorithmic traders, and risk officers. The aesthetic rejects retail crypto tropes, gamified incentives, and decorative neon in favor of extreme analytical clarity, sovereign control, and uncompromising precision.

The design movement combines **Tactical Minimalism** with **Sub-surface Glassmorphism**:
- Obsidian, light-absorbent backdrops engineered for 14-hour continuous terminal monitoring without retinal fatigue.
- Optical hierarchy driven by data density, monospaced tabular figures, and sub-pixel structural delineation.
- Functional chromatic assignments where color is reserved exclusively for state telemetry, financial delta, directional posture, and machine intelligence confidence intervals.
- Mechanical, frictionless interactions providing immediate visual feedback for latency monitoring, automated order routing, and circuit-breaker activations.

## Colors

The palette operates under an absolute functional hierarchy in pure dark mode. Surfaces rely on ultra-deep oceanic charcoals that preserve foreground luminance contrast while suppressing visual vibration.

### Surface and Structure Tokens
- **Canvas Base (`#090D14`)**: Root application frame, canvas backdrop, and detached viewport margins.
- **Surface Layer 1 (`#0E1420`)**: Primary structural panels, modular dock panes, and chart containers.
- **Surface Layer 2 (`#141C2E`)**: Elevated cards, toolbars, modal sheets, and nested analytical drawers.
- **Surface Interactive (`#1E293B`)**: Hover states, active table rows, and selected segment switches.
- **Border Structural (`rgba(255, 255, 255, 0.07)`)**: Default 1px structural division lines.
- **Border Focus (`rgba(99, 102, 241, 0.40)`)**: Interactive focus rings and active AI runtime indicators.

### Semantic Telemetry Tokens
- **System Intelligence (`#6366F1` / `#8B5CF6`)**: Dedicated to algorithmic confidence metrics, autonomous agent states, neural telemetry, and primary call-to-action primitives.
- **Delta Positive (`#10B981` / `#059669`)**: Profit-and-loss surges, long positioning, verified order fills, and healthy latency pulses (<15ms).
- **Delta Negative / Circuit Breaker (`#EF4444` / `#DC2626`)**: Drawdown warnings, short exposure, stop-out triggers, risk breaches, and hard kill-switches.
- **Attention / Threshold Warning (`#F59E0B`)**: High slippage warnings, mempool congestion, trailing-stop thresholds, and pending API key expirations.

### Monochromatic Text & Data Contrast
- **Text Vital (`#F8FAFC`)**: High-priority real-time counters, primary values, and tickers.
- **Text Standard (`#94A3B8`)**: UI field labels, table headers, and navigation items.
- **Text De-emphasized (`#475569`)**: Inactive metrics, timestamp footers, and grid axis tick marks.

## Typography

The typographic hierarchy enforces clear functional separation: **Geist** manages structural navigation, panel commands, and narrative analytics; **JetBrains Mono** governs all quantitative, dynamic, and computational telemetry.

### Numerical and Quantitative Guidelines
- All prices, order quantities, portfolio weights, latencies, wallet hashes, and timestamps must use `label-numeric-*` classes with explicit tabular figure alignment (`font-variant-numeric: tabular-nums lining-nums`).
- Table column headers display in `label-caps` with uppercase transformation and letter spacing to anchor scannability across dense data matrices.
- Dynamic data fields must retain uniform line boxes to prevent optical layout shifts during microsecond data refreshes.

## Layout & Spacing

The terminal is architected around an edge-to-edge, dynamic multi-pane dock system designed for 100% viewport utilization without standard consumer-facing page margins.

### Dynamic Viewport Layout Rules
- **Desktop / Multi-Monitor (1440px+)**: Modular 24-column CSS grid system operating with `8px` gutters. Panels are resizable, collapsible, and dockable. Margin padding across viewport borders remains locked to `12px` to maximize actionable workspace.
- **Tablet / Secondary Viewport (768px - 1439px)**: Reflows into a segmented horizontal split view; secondary telemetry (e.g., live logs, deep order books) collapses into tabbed drawers.
- **Mobile Handheld (320px - 767px)**: Linear stack layout prioritizing current balance, active position liquidation sliders, high-priority risk alerts, and emergency kill-switches. Non-critical telemetry panels shift behind swipeable bottom sheets.

### Density Rhythm
- Dense controls (order entry, execution rows, micro tickers) standardize on `space-xs` (4px) and `space-sm` (8px) interior paddings to preserve maximum visual data per vertical scan line.
- Major panel containers maintain an inner inset of `space-md` (12px) to `space-base` (16px).

## Elevation & Depth

Visual hierarchy is maintained without heavy directional drop shadows, which introduce optical noise in high-density environments. Depth is established through **Surface Stratification**, **Sub-pixel Borders**, and **Controlled Backing Blurs**.

### Hierarchy of Layers
1. **Level 0 (Floor Canvas - `#090D14`)**: Passive base environment behind split panels.
2. **Level 1 (Dock Panes - `#0E1420`)**: Standard workspace containers. Framed with an inner `1px solid rgba(255, 255, 255, 0.07)` border. No drop shadows.
3. **Level 2 (Interactive Modules & Floats - `#141C2E`)**: Dropdown menus, popover tooltips, and flyout selectors. Uses `backdrop-filter: blur(12px)` with background opacity `rgba(20, 28, 46, 0.85)` and an ambient shadow: `0 8px 32px -4px rgba(0, 0, 0, 0.60)`.
4. **Level 3 (System Modals & Critical Overrides)**: Background fill `#141C2E` framed with a high-contrast accent ring (`rgba(99, 102, 241, 0.25)` or `rgba(239, 68, 68, 0.30)` for danger contexts) and a centered occlusion glow: `0 0 48px rgba(0, 0, 0, 0.85)`.

## Shapes

The design system employs a compact, industrial corner geometry (`roundedness: 1`). Radii are kept small to preserve clean linear alignments, reinforce mechanical rigor, and optimize pixel boundaries in high-density grid intersections.

- **Base Elements (Buttons, Inputs, Badges, Tabs)**: `4px` (`0.25rem`).
- **Surface Panels & Docks**: `6px` to `8px` (`0.375rem` - `0.5rem`).
- **Telemetry Indicators (Pulse Nodes, Micro Dots)**: Fully rounded (`9999px`) circles confined to a strict `4px` to `8px` square footprint.
- Absolute exclusion of soft pill-shaped consumer buttons or excessive organic radii.

## Components

### Action Controls (Buttons)
- **Primary / Intelligence**: Solid `#6366F1` background, `#FFFFFF` text, `4px` radius. On hover: `#4F46E5`. Focus: 2px offset ring with `rgba(99, 102, 241, 0.50)`.
- **Terminal Execution (Long)**: Background `#10B981`, `#042F1A` bold text. On hover: `#059669`.
- **Terminal Execution (Short)**: Background `#EF4444`, `#450A0A` bold text. On hover: `#DC2626`.
- **Kill-Switch (Emergency)**: Distinct outline with high-contrast state. Background `rgba(239, 68, 68, 0.12)`, border `1px solid #EF4444`, text `#EF4444`. Requires continuous press or double confirmation; activates full terminal lockdown.

### Micro Status Badges & Chips
- Monospaced typography (`label-numeric-sm` or `label-caps`), compact vertical padding (`2px 6px`), `4px` radius.
- **AI Running**: Deep indigo background (`rgba(99, 102, 241, 0.15)`), border `1px solid rgba(99, 102, 241, 0.35)`, text `#818CF8`, leading `6px` glowing emerald or violet ping node.
- **Exposure / Delta**: Positive numbers prefix `+` with green tint; negative numbers prefix `-` with red tint.

### Data Tables (Terminal Grid)
- Row height: `28px` (compact) to `34px` (standard).
- Alternating subtle stripe or single sub-pixel divider `1px solid rgba(255, 255, 255, 0.04)`.
- Row hover: `#141C2E` transition speed `50ms`.
- Numeric data columns must be right-aligned with fixed tabular layouts. Text descriptions remain left-aligned.

### Input Fields & Selectors
- Background `#090D14`, border `1px solid rgba(255, 255, 255, 0.12)`, height `32px`.
- Embedded currency/unit decorators (e.g., `USDT`, `GWEI`) rendered in `JetBrains Mono` at `#64748B`.
- Active focus state: `border-color: #6366F1`, zero layout displacement.

### Risk Gauges & Algorithmic Confidence Meters
- Horizontal segmented progress meters with `2px` gaps between threshold cells instead of continuous rounded bars.
- Confidence readings display real-time numeric percentage markers (`98.4% CONFIDENCE`) alongside color shifts: Violet (>85%), Amber (60-84%), Red (<60%).
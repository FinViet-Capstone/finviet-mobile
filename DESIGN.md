# Design System: FinViet Mobile
**Project ID:** 17315896584671483303

## 1. Visual Theme & Atmosphere

Dark, dense, and tactically organized. The interface communicates financial control through layered tonal surfaces — deep slate purples and near-black backgrounds give a sense of depth without heavy shadows. The "Category Request - Threaded & Tactical" screen is a utility-first view: it presents a collapsible category hierarchy alongside an inline request form, all within the same scrollable canvas. The mood is focused and professional, with purple as the trust anchor and orange/green as semantic signals for discretionary and savings buckets respectively.

## 2. Color Palette & Roles

- **Deep Void (#15121b)** — Base background; used for the page canvas and lowest surface layer.
- **Midnight Surface (#1d1a23)** — Cards and list containers; one step above the background.
- **Raised Container (#211e27)** — Elevated cards and form fields; mid-layer surface.
- **High Container (#2c2832)** — Active or focused input fields, selected states.
- **Rim Surface (#37333d)** — Borders, dividers, and highest-elevation containers.
- **Primary Lavender (#d0bcff)** — Primary CTAs, active icons, "Thiết yếu (Needs)" bucket accent, progress fills.
- **Burnt Orange (#ffb690 / #ec6a06)** — "Mong muốn (Wants)" bucket accent; discretionary spending signal.
- **Emerald Green (#4edea3 / #00a572)** — "Tiết kiệm (Savings)" bucket accent; positive cash flow and goal completion.
- **Soft Lilac Text (#e7e0ed)** — Primary on-surface text; headings and values.
- **Muted Lavender (#cbc3d7)** — Secondary text, descriptions, labels, placeholder copy.
- **Outline Gray (#958ea0)** — Borders, dividers, and inactive icon strokes.
- **Subtle Divide (#494454)** — Fine-line separators between list items.
- **Alert Red (#ffb4ab / #93000a)** — Error states, over-budget warnings.

## 3. Typography Rules

All type uses **Inter** for its neutral legibility on mobile. **JetBrains Mono** appears only on AI-generated labels and technical tags.

- **Screen title / Section headers:** Inter 20–24px, weight 600, line-height 28–32px. Color: Soft Lilac (#e7e0ed).
- **Category row labels:** Inter 16px, weight 400–500, line-height 24px.
- **Budget percentages (50%, 30%, 20%):** Inter 14px, weight 600; colored per bucket (lavender / orange / green).
- **Form labels ("Tên danh mục", "Loại"):** Inter 14px, weight 500, Muted Lavender (#cbc3d7).
- **Input values:** Inter 16px, weight 400, Soft Lilac (#e7e0ed).
- **Disclaimer / caption text:** Inter 12px, weight 400, Muted Lavender (#cbc3d7).
- **AI badges:** JetBrains Mono 12px, weight 600, letter-spacing +0.05em.
- Vietnamese diacritics need line-height ≥ 1.5× font-size to avoid clipping.

## 4. Component Stylings

**Buttons:**
- Primary CTA ("Gửi yêu cầu"): Full-width, pill-shaped (border-radius 9999px) or generously rounded (1rem), Primary Lavender fill (#d0bcff), deep on-primary text (#3c0091), bold weight.
- Ghost / Secondary ("Huỷ"): Same shape, transparent fill, Primary Lavender border 1px, lavender text.
- Icon buttons (add, settings): 40×40px circular tap target, no background, icon in Muted Lavender; active state uses Primary Lavender.

**Cards / List Containers:**
- Corner radius: 1rem (rounded-lg) for cards; 0.5rem (rounded-md) for nested rows.
- Background: Midnight Surface (#1d1a23) or Raised Container (#211e27).
- No heavy drop shadows — separation is achieved with a 1px border using Subtle Divide (#494454) at ~20% opacity.
- Expandable rows use an animated chevron (expand_more / expand_less icon) right-aligned.

**Category Tree Rows:**
- Drag handle icon (drag_indicator) on the left; 24px, Outline Gray.
- Category icon (circular, 32×32px) with bucket-colored background tint.
- Label text + sub-item count, right-aligned amount in Soft Lilac.
- Indent level 2 sub-rows by 24px.
- "Add Sub-category" row: dashed border, primary lavender, centered "+" icon.

**Form Inputs:**
- Background: Raised Container (#211e27); border 1px Outline Gray (#958ea0).
- Focused state border upgrades to Primary Lavender (#d0bcff).
- Corner radius: 0.75rem (rounded-md).
- Radio button groups for type (Chi tiêu / Thu nhập) and bucket (Thiết yếu / Mong muốn / Tiết kiệm): each option is a pill chip — selected state fills with the bucket accent color.
- Optional notes field includes a circular info icon (ⓘ) in Muted Lavender at the label trailing edge.

**Bucket Accent Chips:**
- Pill-shaped (border-radius full), 28–32px height, 12–14px Inter text.
- Needs: lavender fill; Wants: orange fill; Savings: green fill.
- Unselected: transparent fill, 1px border in the accent color.

## 5. Layout Principles

- **Container margin:** 16px (1rem) horizontal padding on all screens.
- **Stack spacing:** 8px (stack-sm) between tight items, 16px (stack-md) between sections, 24px (stack-lg) between major regions.
- **Vertical rhythm:** Base-8 grid; all spacing values are multiples of 4px or 8px.
- **Section headers:** Left-aligned label + right-aligned action icon, separated by a horizontal divider (Subtle Divide, 1px).
- **Form layout:** Label above input, full-width inputs stacked vertically with 12px gap.
- **Bottom safe area:** 32px (2rem) reserved for gesture navigation insets.
- **Scrollable canvas:** The screen is a single vertical scroll — the category tree and request form coexist in one scrollable list, no tabs or sub-navigation.
- **Bottom nav bar:** Fixed 5-tab bar (Home, Budget, + FAB, Wallets, Settings); active tab uses Primary Lavender icon + dot indicator.

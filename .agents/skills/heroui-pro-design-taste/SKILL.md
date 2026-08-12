---
name: heroui-pro-design-taste
description: "Design taste profile for the HeroUI design system. 78 design principles across 10 categories (spacing, typography, color, cards, forms, buttons, icons, navigation, accessibility) learned from iterative human feedback. Applies across all HeroUI packages: @heroui/react, @heroui-pro/react, @heroui/native, @heroui-pro/native. Use when generating UI, reviewing design quality, or improving visual polish."
metadata:
  author: heroui
  version: "1.0.0"
---

# HeroUI Design Taste

Design taste profile for the HeroUI design system. These 78 principles across 10 categories represent generalized design taste learned from iterative human feedback. They apply across the entire HeroUI ecosystem: `@heroui/react`, `@heroui-pro/react`, `@heroui/native`, `@heroui-pro/native`.

**Before using any component, always look up its API using the MCP tools.** A single Pro MCP (`heroui-pro` for web, `heroui-native-pro` for native) covers both OSS and Pro packages — you do NOT need separate OSS MCPs installed. Never guess component names, props, or patterns.

---

## Design Philosophy

- **Semantic over visual**: Use `variant="primary"` not `className="bg-blue-500"`
- **Generous whitespace**: `gap-4`, `gap-6`, `p-6`, `p-8`
- **Consistent spacing**: 4px/8px grid
- **Subtle depth**: Use surface tokens with built-in shadows for elevated cards
- **Typography hierarchy**: Clear headings, muted descriptions
- **Accessible by default**: Semantic elements, proper ARIA, Tooltips on icon-only buttons
- **No layout shift**: Conditional elements use floating/overlay positioning
- **Optical alignment**: Large display text aligns by visual center, not strict baseline
- **Minimalism**: When in doubt, remove the decorative element. Less is more.
- **Prefer built-in components** over custom implementations for standard UI patterns

---

## Design Principles (78 across 10 categories)

### General

- Use default component sizes and omit size props when they match the default; only upsize when explicitly requested.
- Avoid duplicate visual representations of the same data — show only the single most effective representation (e.g., stars OR a number, not both; a timer OR a progress bar, not both) and remove redundant labels, companion icons, or information already conveyed by the primary content area.
- Avoid over-styling framework-provided components; rely on their default appearance unless there is a clear, intentional reason to customize. Prefer the design system's native/built-in components over custom implementations for standard UI patterns.
- Keep supplementary footer content and trust signals minimal — one icon plus one short text line is enough. Remove redundant logos, badges, or icons that add clutter without new information.
- Minimize wrapper elements around groups of small components (chips, tags, badges). Remove unnecessary container divs when items render cleanly without them.

### Spacing & Layout

- Apply moderate, balanced padding on cards — avoid both cramped and overly loose interiors. Strip unnecessary bottom padding and padding-y from inner flex rows to keep vertical rhythm tight. Add small padding only where content would otherwise appear cramped against a neighboring divider or edge. Do not double up on spacing — if a parent container already provides padding, child wrappers should not add redundant padding in the same direction. Let the container own the padding rather than individual list or menu items, to maintain consistent alignment with container edges.
- Dashboard and admin main content areas should have generous top padding (pt-8 or more) so page headers have breathing room — never start content flush against the top edge.
- Scrollable containers must have overflow enabled and a defined max-height so content is actually scrollable. Scroll-indicator components must only wrap actually scrollable content. Prefer overflow-visible on non-scrolling containers to reveal child element shadows and outlines naturally; add inner padding only when overflow-visible alone is insufficient.
- In stat or metric displays, align the primary value and supporting text to the start, with supplementary visuals (charts, sparklines) anchored to the opposite end.
- Prefer compact padding in transient overlay surfaces (popovers, tooltips, dropdowns) — lean toward p-2 or p-3 rather than p-4 or higher. Size modals to their content with constrained max-widths (e.g., max-w-md, max-w-lg); avoid defaulting to large or full-width modals.
- For horizontally overflowing element rows (chips, tags, thumbnails), render items inline on wide viewports and enable horizontal scrolling only when the viewport is too narrow to display them all.
- Sibling cards in a grid must maintain consistent internal padding and content alignment — names, prices, and sections should start at the same vertical position across all cards regardless of featured or highlighted state. Sibling items of the same type must be styled uniformly — never mix icon-bearing and icon-less items, apply inconsistent visual treatments, or allow content variation to produce different dimensions.
- Featured or wide content elements should span the full grid width and be positioned outside the main grid columns rather than forced inline.
- Sections or containers should never appear taller or larger than their content warrants — audit for excess padding, margins, or fixed heights and keep vertical sizing tight to content.
- Page-level containers should have a constrained max-width to maintain comfortable reading lines and visual balance on large viewports — avoid layouts that stretch edge-to-edge on wide screens.
- Multi-column content sections within a page should be center-aligned relative to the overall page layout, not indented or offset from the main content flow.
- Ensure consistent alignment of children within flex and layout containers — explicitly set alignment (items-start, items-center, etc.) rather than relying on implicit stretch behavior.
- When a close button or floating action overlaps content inside a drawer or modal, add sufficient top padding to the content area to prevent overlap.
- Overlay elements (badges, chips, pills) on interactive triggers must use absolute positioning so they don't affect the trigger's intrinsic dimensions or layout flow. Nudge them to avoid obscuring the trigger label, and internally center their text content.
- Inline elements such as chips, badges, and tags should never stretch to fill their parent's full width; they must be sized to fit their content to preserve their semantic role as compact, bounded indicators.
- Secondary or supplementary visualizations should be positioned out of the primary content flow using absolute positioning anchored to a corner, preventing them from disrupting the main layout grid.

### Typography

- Apply optical alignment for large display text (hero numbers, prices, temperatures) — align by visual center with adjacent smaller elements using leading-none and subtle manual nudges rather than strict CSS baseline alignment.
- Inter-element dividers (colons, dots, slashes) in composite displays must be vertically centered relative to the primary content only, not the full segment including sub-labels.
- Apply tabular-nums (or equivalent monospaced-figure styling) on all numeric display values — prices, stats, counts — to ensure consistent character-width alignment in lists and tables.
- Use short, Title Case labels for section headings. Never use ALL CAPS/uppercase or unnecessarily verbose heading text.
- Descriptive or supplementary text within cards and content blocks should be concise — cap at 2-3 lines maximum to prevent content bloat and maintain scannability.
- Numeric labels inside bounded shapes (progress indicators, badges, avatars) must use constrained text sizes to prevent overflow — scale typography to fit the container.

### Color & Theming

- Use neutral surface-level background tokens (e.g., bg-surface-secondary) for stat pills, metric containers, and small info cards; keep backgrounds neutral and let only icons or accent elements carry color. Use Chip components with semantic color and soft variant for status display.
- Add partial transparency (e.g., 70% opacity) to subtitle or secondary text placed over gradient or colored backgrounds so it blends naturally rather than appearing as a hard opaque element.
- When floating elements (chips, badges, close buttons) are layered over images or gradient backgrounds, apply a semi-transparent background and/or backdrop-blur to ensure legibility. When UI elements sit on complex backgrounds where boundaries are unclear, add a subtle semi-transparent border to improve definition.
- Text on elevated or distinctly-backgrounded surfaces must use high-contrast foreground tokens to ensure sufficient contrast and visual coherence with the surface.
- Use semantically appropriate color tokens for status indicators: success/accent for positive states, danger for errors, warning only for genuine caution — never misuse semantic colors for unrelated concepts.

### Cards & Surfaces

- Never stack redundant shadows — if a component has a built-in shadow token, do not add additional shadow classes unless explicitly requested.
- Images inside cards should use rounded corners following the formula: Outer Radius = Inner Radius + Padding, and include a subtle 1px semi-transparent border overlay (rgba black in light mode, rgba white in dark mode) for definition. Soften image treatments (slightly larger border radius, reduced outline opacity) for a polished, less mechanical look.
- Card layouts featuring media should lead with a large hero image at the top rather than small or inline thumbnails, creating a strong visual anchor. For browsing contexts, prefer gallery/carousel images at thumbnail or medium size, keeping visual weight balanced with surrounding content.
- When a card section (gradient, image, colored band) must extend to the container edges, remove card-level padding (p-0 overflow-hidden) and apply padding individually to each inner section. When a modal or overlay contains a full-bleed image, remove all container padding and let the image fill the bounds with object-cover.
- Never place progress bars, meters, or colored strips along card edges using absolute positioning — place progress indicators inside the card content area as normal flow elements.
- Card and container border-radius must not clip inner content (images, outlines, borders). Align border-radius values between outer card and inner elements, and use overflow-hidden deliberately, not by default. Prefer the design system's Card or surface component over manually applied border-radius utilities.
- Use surface-level background tokens (surface, surface-secondary, surface-tertiary) to create visual hierarchy — more important content on primary surfaces, de-emphasized content on subdued secondary surfaces with reduced or no shadow. Never nest a surface-level component (card, accordion, surface-variant) inside another surface-level container — avoid doubling up backgrounds or visual depth layers.
- Card content and child elements must be visually contained within their parent card boundaries; nothing should overflow outside the card's visible edges unless intentionally using absolute positioning with overflow-visible for decorative highlights.
- Avoid applying outline or ring styles to images when they are already nested inside a card or container surface; reserve image outlines for standalone contexts where the image lacks a parent surface.
- Minimize the use of borders throughout a layout; only apply borders where they carry essential structural meaning, and remove decorative or habitual borders that add visual noise without aiding comprehension.

### Forms & Inputs

- Use secondary/subdued input variants for form fields placed inside elevated surfaces (cards, modals, drawers, popovers) to maintain proper visual contrast against the container background.
- Avoid full-width sizing on inline controls (number fields, tab bars) — constrain them to content-width or a fixed max-width. Constrained-width inputs should have both a minimum width (to prevent truncation) and a maximum width (to prevent over-expansion).
- When a form control has custom adornments on one side (chips, tags, icons), move standard indicators (chevrons, arrows) to the opposite side to avoid visual crowding.
- Switch/toggle controls should be placed at the trailing end of their row.

### Buttons & Actions

- Prefer text-only buttons when a clean, minimal appearance is desired; add icons to buttons only when they provide genuine informational value beyond the label text. Avoid decorative or redundant icons next to self-explanatory text.
- Include a secondary/escape action (e.g., Skip, Cancel, Dismiss) below or beside the primary action in card and modal footers to always provide an exit path.
- Use detached/independent toggle button groups for small binary or ternary mode switches (e.g., unit toggles, view mode selectors) for a lighter, more refined appearance. Complex view selectors (e.g., multi-mode pickers) should use dropdown menus with submenus rather than toggle button groups.
- Use outline/bordered/ghost button variants for secondary and non-primary actions; use semantic soft variants for destructive actions; reserve solid/filled variants exclusively for primary CTAs. Destructive or secondary actions should use visually subordinate button variants to clearly differentiate them from the primary action.
- Trigger buttons that carry badges or indicators should use slightly larger icon sizes to accommodate the badge without feeling cramped. Icon-only and badge-trigger buttons must meet minimum touch-target size and visual weight.
- Ensure button variant changes (outline vs filled) do not introduce layout shifts — use consistent sizing, padding, and border-width so all variants occupy identical space.
- Prefer icon-only buttons for secondary or supplementary actions (e.g., wishlist, share) rather than labeled buttons, keeping the UI compact. Position them adjacent to the primary CTA and use outline variants to establish clear hierarchy. When a badge is attached to a button, use an outline variant so the badge reads as adjacent to the icon rather than floating away from a filled surface.
- Wrap dropdown triggers in a ghost/unstyled button rather than using a bare trigger component. Omit trailing chevron icons unless the dropdown affordance would otherwise be invisible.
- CTA buttons should be placed on a dedicated line below their associated descriptive content, not inline or beside it, to maintain clear visual separation between information and action. CTA labels should be minimal and non-redundant — remove words already implied by surrounding context.
- Interactive trigger elements such as user menu avatars or compact selectors should have generous vertical padding and modest horizontal padding to feel comfortable and tappable without appearing cramped.

### Icons & Decoration

- Use separators sparingly and only where they carry semantic meaning (e.g., an 'OR' divider between distinct method groups, or above a summary/total row). Elsewhere, use spacing utilities (gap, margin, padding) to create visual grouping. Separators should sit flush with content — strip extraneous margin and padding so spacing is controlled by the parent layout, not the divider itself. In horizontal toolbars and inline layouts, separators must use vertical orientation with a fixed height inside flex-centered containers. Prefer semantic separator components over raw border utilities. Decorative dividers and separators must be precisely centered within their parent container both visually and in DOM structure.
- Illustrative and status icons should use semantically meaningful colors (e.g., warning for caution, primary for info, danger for critical) — never leave them as plain default foreground color. Icons in feature or attribute lists should use a muted, subdued color while accompanying text uses standard foreground color. Use the theme's semantic accent/primary color tokens for emphasis on featured or highlighted elements — never arbitrary or ad-hoc named colors.
- Never use emojis in headings, labels, or titles — use a proper icon library if a visual indicator is needed.

### Navigation & Structure

- Limit visible options in groups of similar actions — show only the most common option by default with a progressive disclosure control ('See more', 'Other options') to reveal the rest. Use accordions or progressive disclosure to collapse secondary content sections and reduce page length, but keep high-value content (reviews, social proof) as persistent visible sections.
- Bulk-action and contextual toolbars should be rendered as floating pill-shaped bars (fixed/sticky, bottom-center, with overlay background and shadow) — never inline above or below content, to avoid layout shift. When centering fixed-position floating elements in layouts with a sidebar or offset panel, calculate the horizontal offset relative to the main content area, not the full viewport.
- Sidebar navigation should use spacing and small text section labels to group nav items — not horizontal separator lines or heavy border dividers between groups. Never use dividers or border separators to visually separate bottom-anchored user menus from the rest of a sidebar; rely on spacing and layout hierarchy instead.
- Prefer tabs or segmented controls for filtering within popovers and panels, and for toggling between parallel content views, instead of separator-divided sections or radio groups.
- Use dropdown menus for user identity/avatar elements in navigation bars so they are always interactive and surface common account actions.
- On small and medium viewports, replace persistent sidebars with a hamburger/toggle button that opens a drawer or overlay panel.
- Vertical ordering of UI elements should follow a logical hierarchy: primary actions and identity first, then secondary content, then supplementary details. Place summary or overview content (progress dashboards, aggregate stats) at the top of the layout before detail or drill-down sections, following a general-to-specific information hierarchy.
- In detail or product layouts, order controls and information by decision priority: variant selectors first, then quantity/sizing, then pricing, then feature/spec lists. Accordions and collapsible sections go after primary interactive controls.
- Toolbar item ordering should follow a logical hierarchy: identity/context elements first, then view/mode controls, then temporal navigation, then actions — trailing items aligned to the end.
- Active filter states (e.g., applied filter chips) should be rendered as persistent visible elements near the filter controls, never replacing or hiding the controls themselves.
- Sidebars should span the full viewport height with the main content filling remaining width via flex layout — sidebar and content should be siblings, not nested. Sidebar backgrounds should match the page background with a subtle border on the dividing edge rather than using a contrasting surface color. Sidebar item heights should match the design system's standard interactive component height to maintain vertical rhythm and consistency.
- Selected items in navigation containers should use a surface-level background token combined with a subtle shadow for clear active state differentiation, while non-selected items use a neutral default background on hover — reserve elevated backgrounds exclusively for the active state.
- Remove underlines from breadcrumb links; breadcrumbs rely on structural context for affordance and do not need underline decoration.
- User identity elements (avatar, email) belong in the sidebar bottom section, not in the header toolbar. App branding (logo, app name) belongs in the sidebar, not repeated in the header — headers should contain only contextual controls and actions.

### Accessibility

- Use aria-label with placeholder text instead of visible labels on form fields when a minimal, clean aesthetic is desired (e.g., compact auth forms, inline card forms).
- Icon-only action buttons must always be wrapped in a Tooltip describing the action for accessibility and discoverability.
- Avoid hover transition animations on high-frequency interactive elements (sidebar links, nav items) — static hover-state changes (color, background) are preferred to prevent the UI from feeling sluggish.
- Apply the system's interactive-cursor CSS variable (e.g., cursor-[var(--cursor-interactive)]) to all custom interactive elements so cursor behavior respects the user's global preference.
- Informational or display-only list items should have no hover states — reserve hover feedback exclusively for actually interactive elements.

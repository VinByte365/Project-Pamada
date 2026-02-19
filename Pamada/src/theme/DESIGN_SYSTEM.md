# Pamada Mobile UI System

## Design Tokens

### Color Roles
- `palette.primary.start` `#6EDC8C`
- `palette.primary.end` `#3ECF8E`
- `palette.accent.action` `#FF9F43`
- `palette.background.base` `#EAF7F3` (light)
- `palette.surface.light` `#FFFFFF`
- `palette.surface.soft` `#F4F7F6`
- `palette.text.primary` `#1F2933`
- `palette.text.secondary` `#6B7280`
- `palette.status.watering` `#60A5FA`
- `palette.status.warning` `#F59E0B`
- `palette.status.success` `#22C55E`

### Spacing (8pt System)
- `4 / 8 / 12 / 16 / 24 / 32 / 48`

### Radius
- Card: `20`
- Button: `16`
- Floating: `24`

### Elevation
- Surface: `shadows.surface`
- Floating: `shadows.floating`
- Modal: `shadows.modal`

### Motion
- Button press: `120ms`
- Card lift: `180ms`
- Progress ring: `800ms`
- Gradient shift loop: `8000ms`

## Theme Modes
- Light and dark palettes are enabled with `useAppTheme()` using `useColorScheme()`.
- Navigation and status bar now react to active mode.

## Component Library
- `src/components/ui/ElevatedCard.js`
- `src/components/ui/ProgressRing.js`
- `src/components/ui/PillFilterChip.js`
- `src/components/ui/FloatingActionButton.js`
- `src/components/ui/StatusBadge.js`
- `src/components/ui/WeatherWidget.js`
- `src/components/ui/PlantPreviewTile.js`
- `src/components/ui/ScanFrameOverlay.js`

## Screen Implementations

### Dashboard (`HomeScreen`)
- Date and greeting hierarchy
- Weather widget with animated gradient cloud drift
- Segmented task filters
- Animated progress rings
- Smart task queue and category cards
- Floating scan FAB

### Plant Library (`HistoryScreen`)
- 2-column adaptive plant grid
- Pill filter controls
- Plant tile with status and urgency badge
- Daily care summary card

### Scanner (`ScanScreen`)
- Frosted top label and controls
- Pulsing scan frame and animated reticle
- Live confidence indicator text
- Improved analysis bottom sheet hierarchy

## Accessibility Constraints
- Touch targets >= 44px for controls/chips/buttons
- Semantic labels for scanner actions and nav actions
- Status badges use icon + text, not color alone
- Text contrast mapped through semantic foreground/background roles

## Exportability
- UI compiles for Android bundle via Expo export.
- Assets remain in Expo-managed pipeline and are exportable using Expo build/export workflows.

# CowCalc V2 Architecture

## Overview
CowCalc V2 is a refactored, production-ready version of the alliance war game planner. The goal is to make the codebase **readable, scalable, maintainable, and accessible** while preserving all existing features and adding new ones.

## Core Principles
1. **Separation of Concerns** - Business logic, state management, UI, and utilities are cleanly separated
2. **Component Composition** - Large monolithic components are broken into smaller, focused, reusable components
3. **Single Responsibility** - Each module/component has one primary purpose
4. **Data-Driven Design** - Configuration and data flow are explicit and easy to understand
5. **Type Safety** - Use JSDoc or consider TypeScript for better IDE support and fewer bugs
6. **Accessibility First** - ARIA labels, semantic HTML, keyboard navigation from the start
7. **Performance** - Memoization, lazy loading, efficient re-renders

---

## Directory Structure

```
src/
├── components/          # React components (views, UI)
│   ├── App.jsx         # Root component & orchestration
│   ├── Layout/         # Layout & structural components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── MainSection.jsx
│   ├── Toolbar/        # Top toolbar buttons & controls
│   │   ├── ToolbarButtons.jsx
│   │   └── ExportModal.jsx
│   ├── PlanEditor/     # Plan editing & multi-country blocks
│   │   ├── PlanEditor.jsx
│   │   ├── CountryBlock/
│   │   │   ├── CountryCard.jsx
│   │   │   ├── CountrySelector.jsx
│   │   │   └── CartSummary.jsx
│   │   ├── ItemSelector/
│   │   │   ├── ItemSelector.jsx  # Type, Name, Tier selection UI
│   │   │   ├── UnitSelector.jsx
│   │   │   └── BuildingSelector.jsx
│   │   └── CartView/
│   │       ├── CartTable.jsx     # List of queued items
│   │       ├── CartRow.jsx       # Single cart item row
│   │       └── CostBreakdown.jsx # Cost visualization
│   ├── Common/         # Reusable UI elements
│   │   ├── Modal.jsx
│   │   ├── Select.jsx  # Custom styled select
│   │   ├── Input.jsx   # Input with sanitization
│   │   ├── Button.jsx
│   │   └── Tabs.jsx
│   └── Theme/          # Theme toggle, dark/light mode
│       └── ThemeToggle.jsx
│
├── hooks/              # Custom React hooks
│   ├── useBlockState.js        # Manages a single country block
│   ├── useGlobalData.js        # Fetches & caches global game data
│   ├── useResearchStatus.js    # Research unlock logic
│   ├── useProductionCalc.js    # Production calculations
│   ├── useCostCalculation.js   # Cost aggregation
│   └── useLocalStorage.js      # Plan save/load
│
├── services/           # Business logic & data processing
│   ├── dataLoader.js         # Fetch & parse JSON data
│   ├── costCalculator.js     # Production & research cost logic
│   ├── productionPlanner.js  # Build timing & feasibility
│   ├── discordExporter.js    # Export formatter for Discord
│   ├── planSerializer.js     # Save/load/compact plan format
│   └── unitUpgradeEngine.js  # Tier & upgrade prerequisites
│
├── store/              # Global state (if complex, consider Zustand)
│   ├── planStore.js    # Plan state & actions
│   ├── uiStore.js      # UI state (modals, tabs, sidebar)
│   └── dataStore.js    # Global game data cache
│
├── utils/              # Utility functions
│   ├── formatters.js   # Number formatting, abbreviations
│   ├── validators.js   # Input validation
│   ├── sorting.js      # Sort units, buildings by canonical order
│   ├── constants.js    # UNIT_ORDER, BUILDING_ORDER, FACTION data
│   ├── a11y.js         # Accessibility helpers
│   └── math.js         # Calculation helpers
│
├── styles/             # CSS
│   ├── App.css         # Main styles (with CSS variables for theme)
│   ├── components.css  # Component-specific styles
│   ├── theme.css       # Light/dark theme definitions
│   └── a11y.css        # Accessibility styles (focus, contrast)
│
├── App.jsx             # Root component
├── main.jsx            # Entry point
└── index.css           # Global styles

public/
├── data/               # Game data (JSON)
│   ├── Game_Stats_Allies.json
│   ├── Game_Stats_Axis.json
│   ├── Game_Stats_Commie.json
│   └── Game_Stats_Pan.json
├── maps/               # Game maps (JSON)
│   └── *.json
└── ...
```

---

## Data Flow

### 1. Initialization
1. App.jsx loads global game data (buildings, research, factions) via `useGlobalData()`
2. Plan is loaded from localStorage or starts empty
3. Each country block gets its faction's unit data loaded on selection

### 2. User Input Flow
- User selects **Type** (Unit/Building/Upgrade) → **Item Name** → **Tier**
- ItemSelector validates unlock status and availability
- User clicks "Add" → item is added to cart via `addToCart()`
- Cart is re-sorted and state updates

### 3. Calculation Flow
- When cart changes, `useCostCalculation()` computes:
  - Production costs (money, manpower, food, steel, fuel)
  - Research costs and prerequisites
  - Production timelines
  - Feasibility
- Results are memoized to avoid unnecessary recalculations

### 4. Export Flow
- User clicks "Export to Discord" → lazy-compute export data
- discordExporter.js formats data into Discord-friendly chunks
- Modal displays with copy buttons

### 5. Save Flow
- On any plan change, auto-save to localStorage via `useLocalStorage()`
- planSerializer compresses plan into compact format

---

## State Management Strategy

### Local Component State (useState)
- Single-item selection form (selectedType, selectedName, selectedTier, count)
- Modal visibility (isExportOpen, isImportOpen)
- Theme preference

### Block-Level State (useBlockState hook)
- selectedCountryIdx, unitData, cart, capitalsTaken, discordId
- Encapsulated block operations (addItem, removeItem, updateCart)

### Global State (Context API or Zustand)
- **PlanStore**: selectedMap, days, blocks[], planMetadata
- **UIStore**: theme, modals (open/close), sidebar state
- **DataStore**: buildings[], research[], factions{}

### Async Data (useGlobalData hook)
- Game data loaded on app mount, cached globally
- Faction-specific unit data lazy-loaded when country selected

---

## Component Hierarchy (Simplified)

```
<App>
  ├── <ThemeToggle />
  ├── <Header>
  │   ├── <Title />
  │   └── <ToolbarButtons />
  │       ├── Import
  │       ├── Export to Discord
  │       ├── Clear Plan
  │       └── Save/Load
  ├── <MainContainer>
  │   ├── <PlanEditor>
  │   │   ├── <MapSelector />
  │   │   ├── <DaysInput />
  │   │   ├── <CountryBlockList>
  │   │   │   ├── <CountryCard>
  │   │   │   │   ├── <CountrySelector />
  │   │   │   │   ├── <DiscordIdInput />
  │   │   │   │   ├── <ItemSelector />
  │   │   │   │   ├── <CartView>
  │   │   │   │   │   ├── <CartTable>
  │   │   │   │   │   │   └── <CartRow /> (x N)
  │   │   │   │   │   └── <CostBreakdown />
  │   │   │   │   └── <CountryStats />
  │   │   │   └── <CountryCard /> (x M)
  │   │   └── <AddCountryButton />
  │   └── <Sidebar>
  │       ├── <PlanSummary />
  │       ├── <TotalCosts />
  │       ├── <FeasibilityChecker />
  │       ├── <QuickStats />
  │       └── <SavedPlans />
  └── <ExportModal /> (outside main flow, lazy-loaded)
```

---

## Key Improvements Over V1

### 1. **Better Code Organization**
   - **V1**: 1500+ lines in App.jsx, monolithic component
   - **V2**: Broken into ~20 focused components, each 50-200 lines max

### 2. **Separation of Concerns**
   - **V1**: UI logic mixed with cost calculations, data loading, etc.
   - **V2**: Services handle all business logic, components are pure views

### 3. **Reusability**
   - **V1**: Custom select, modal, input logic repeated across components
   - **V2**: Common UI components (Select, Modal, Input, Button) with consistent API

### 4. **Testability**
   - **V1**: Hard to test business logic without mounting the full component
   - **V2**: Services are pure functions, easy to unit test

### 5. **Performance**
   - **V1**: Full re-render on minor state change; expensive calculations on every render
   - **V2**: Memoized components, useMemo for calculations, lazy-loaded data

### 6. **Accessibility**
   - **V1**: Limited ARIA labels, keyboard navigation incomplete
   - **V2**: Full ARIA support, semantic HTML, keyboard-first design

### 7. **Maintainability**
   - **V1**: New contributors need time to understand the full component
   - **V2**: Clear file structure, consistent patterns, self-documenting code

### 8. **Extensibility**
   - **V1**: Hard to add new features (e.g., undo/redo, batch operations, filters)
   - **V2**: Modular structure makes additions painless

---

## Performance Optimizations

### Memoization
```javascript
// Components that don't change often are memoized
const CountryCard = React.memo(CountryCard, (prevProps, nextProps) => {
  // Custom comparison to skip re-renders
  return isEqual(prevProps, nextProps);
});
```

### Lazy Loading
```javascript
// Export modal data computed only when modal opens
useEffect(() => {
  if (discordExportOpen) {
    setExportData(buildDiscordPlanExport(...));
  }
}, [discordExportOpen]);
```

### CSS Containment
```css
.expensive-component {
  contain: layout style paint;
  will-change: contents;
}
```

---

## Accessibility Features

### Semantic HTML
- Use `<button>`, `<label>`, `<section>` instead of `<div>` + styling
- Use `<main>`, `<nav>`, `<header>` for landmarks

### ARIA Labels
```jsx
<button aria-label="Add item to cart" aria-describedby="add-help">+</button>
<div id="add-help">Add the selected unit or building to the production queue</div>
```

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys in selects and lists
- Escape to close modals

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for small text, 3:1 for large)
- Don't rely on color alone; use icons, labels, patterns

### Focus Indicators
- Clear, visible focus ring on all focusable elements
- Avoid `outline: none` without replacement

---

## Scalability Considerations

### Adding New Features
1. **New calculation type** (e.g., troop feasibility): Add service + hook + component
2. **New export format**: Add exporter service, reuse Modal component
3. **New input field**: Create in Common/Input, use across components
4. **New tab/view**: Create new component, add to routing

### Adding New Game Data
1. Update public/data/ with new faction or unit stats
2. dataLoader.js automatically picks it up
3. No code changes needed

### Adding New Game Mechanics
1. Create new service (e.g., `resourceTrading.js`)
2. Create corresponding hook (e.g., `useResourceTrading()`)
3. Integrate into relevant components

---

## Testing Strategy

### Unit Tests (Services)
- costCalculator.js: Test cost aggregation logic
- productionPlanner.js: Test build time calculations
- unitUpgradeEngine.js: Test prerequisite resolution

### Integration Tests (Hooks)
- useBlockState: Test block operations
- useCostCalculation: Test full cost pipeline

### Component Tests
- CountryCard: Test rendering with various states
- ItemSelector: Test user interactions and validation

### E2E Tests
- Full plan creation, modification, export

---

## Migration Path from V1

1. Keep V1 codebase as fallback
2. Deploy V2 alongside (feature flag)
3. Provide user feedback channel for bugs
4. Fix issues reported, iterate quickly
5. Full cutover once stable

---

## Future Roadmap

### Phase 1 (Current)
- ✅ Refactored architecture
- ✅ Improved UI/UX
- ✅ Full accessibility
- ✅ Better error handling

### Phase 2 (Next)
- [ ] Undo/redo support
- [ ] Batch operations (add 10 units at once)
- [ ] Plan templates & presets
- [ ] Time-based production visualization
- [ ] Mobile-responsive redesign

### Phase 3 (Future)
- [ ] Backend sync (accounts, cloud saves)
- [ ] Multiplayer editing (real-time collaboration)
- [ ] Advanced analytics & planning tools
- [ ] Mobile app (React Native)

---

## Dependencies

Current:
- React 19.2
- Vite 8

Recommended additions (if adopting):
- Zustand (state management, lightweight)
- React Query (async data fetching)
- TypeScript (type safety)
- Vitest (testing)
- ESLint Airbnb (linting)

---

## Conclusion

CowCalc V2 is designed to be **production-ready, maintainable, and scalable**. Every decision prioritizes code clarity, performance, and user experience. The modular architecture allows rapid iteration and feature additions without sacrificing stability.

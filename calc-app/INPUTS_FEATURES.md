# CowCalc V2 - Inputs & Features Documentation

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Input Fields](#input-fields)
3. [Feature Overview](#feature-overview)
4. [Calculations](#calculations)
5. [Data Models](#data-models)
6. [Usage Guide](#usage-guide)

---

## Core Concepts

### Game Context
CowCalc is a planning tool for **Call of WAR**, a browser-based strategy game. It helps alliances plan unit and building production for optimal resource allocation and war strategy.

### Key Entities

#### Factions
Four factions, each with unique units, costs, and bonuses:
- **Ally**: 0.8x unit upgrade cost multiplier
- **Axis**
- **Commintern**
- **Pan-Asian**

#### Units
Military units with multiple tiers (1-5+). Each tier:
- Increases combat strength
- Increases production cost
- Requires research unlock (tied to game day)
- Takes longer to produce at higher tiers

Examples: Infantry, Medium Tank, Strategic Bomber, Submarine

#### Buildings
Production infrastructure. Two categories:

**Productive Buildings** (affect production speed):
- Barracks, Tank Plant, Aircraft Factory, Naval Base, etc.
- Higher tier = faster unit production

**Buff Buildings** (provide bonuses):
- Industry (produces Steel, 50/100/200% at L1/L2/L3)
- Recruiting Station (produces Manpower, 50/100/200%)
- Increase the specified resource production automatically

**Utility Buildings**:
- Capitol, Infrastructure, Fortifications, Bunkers

#### Resources
Five resources used in production and research:
- **Money (M)**: Primary cost for everything
- **Manpower (P)**: Military personnel
- **Food (F)**: Sustains population
- **Steel (S)**: Weapons, armor, infrastructure
- **Fuel (U)**: Aircraft, vehicles, naval units

#### Research
Unlocks higher unit tiers by game day. Example:
- Infantry T1: Unlocked Day 1
- Infantry T2: Unlocked Day 4 (requires Research)
- Infantry T3: Unlocked Day 10

Each faction has its own research timeline.

#### Production Day
A 24-hour in-game cycle. Game mechanics reset daily. Current day = (days passed) + 1.

Example: "3 days passed" = Day 4

---

## Input Fields

### Plan-Level Inputs

#### Map Selection
- **Type**: Dropdown select
- **Purpose**: Choose which game map the plan applies to
- **Values**: List of .json map files from `public/maps/`
- **Validation**: Must be a valid map file
- **UI Location**: Top of plan editor
- **Accessible**: Yes, labeled, keyboard navigable

#### Days Passed
- **Type**: Numeric input (non-negative integer)
- **Purpose**: Tracks current game timeline (affects research unlocks, production time)
- **Range**: 0 - 1000
- **Default**: 1
- **Validation**: Must be >= 0, non-decimal
- **Effect**: Higher days = more units unlock, but less production time
- **Formula**: Current Day = Days Passed + 1
- **UI Location**: Plan header
- **Accessible**: Yes, with label and input validation feedback

---

### Country Block-Level Inputs

Each country block represents one nation's production queue.

#### Country Selection
- **Type**: Dropdown (select from map's nation list)
- **Purpose**: Assign this block to a specific country
- **Values**: Nations from selected map (e.g., "United States (Ally)", "Germany (Axis)")
- **Validation**: Must match map and have a known faction
- **Effect**: Populates available units, sets faction-specific costs/bonuses
- **UI Location**: Top of country card
- **Accessible**: Yes, labeled, shows faction in parentheses

#### Discord User ID
- **Type**: Text input (numeric only)
- **Purpose**: Tag the player in Discord export
- **Format**: 18-digit Discord snowflake ID (e.g., `123456789012345678`)
- **Validation**: Must be numeric, optional (can be empty)
- **Effect**: In Discord export, plan is prefixed with `<@USER_ID>` mention
- **UI Location**: Country card header
- **Accessible**: Yes, with inputMode="numeric"

#### Capitals Taken
- **Type**: Numeric input (non-negative integer)
- **Purpose**: Tracks number of enemy capitals captured (affects manpower production)
- **Range**: 0 - unlimited
- **Default**: 0
- **Validation**: Must be integer, >= 0
- **Effect**: May affect in-game bonuses (implementation-specific)
- **UI Location**: Country card header
- **Accessible**: Yes, labeled, keyboard navigable

---

### Item Selector Inputs

Users add items (units, buildings) to production queue via the Item Selector.

#### Category (Type)
- **Type**: Radio/Tab select
- **Values**: "Unit" | "Building" | "Upgrade Only"
- **Default**: "Unit"
- **Purpose**: Choose what kind of item to add
- **Effect**: Filters available items, changes UI layout
- **Dependent**: SelectName, SelectTier
- **UI Location**: Item selector top
- **Accessible**: Yes, with clear labels

#### Item Name
- **Type**: Dropdown select
- **Purpose**: Choose which unit or building to add
- **Values**: Filtered by:
  - Category (Unit vs Building)
  - Faction (for units)
  - Excluded items (e.g., "Transport Ship" not available)
- **Sorting**: 
  - Units: Canonical UNIT_ORDER
  - Buildings: BUILDING_ORDER
- **Validation**: Must be in available list, not excluded
- **Effect**: Populates available tiers
- **Abbreviations**: Long names abbreviated in display
  - "Motorized Infantry" → "Mot Infantry"
  - "Strategic Bomber" → "Strat Bomber"
  - "SP Rocket Artillery" → "SPRA"
- **UI Location**: Item selector, center column
- **Accessible**: Yes, custom styled select with overlay

#### Item Tier (Level)
- **Type**: Dropdown select
- **Purpose**: Choose production tier for the item
- **Values**: 1 - 5+ (depending on item)
- **Validation**: 
  - Must be >= 1
  - For units: must be research-unlocked by current day (Days Passed + 1)
  - Disabled options show unlock day: "3 (Unlocks D8)"
- **Effect**: Sets unit/building strength and cost
- **Default**: Lowest unlocked tier for units, tier 1 for buildings
- **UI Location**: Item selector, right of name
- **Accessible**: Yes, with unlock status in option labels

#### Count (Quantity)
- **Type**: Numeric input (positive integer)
- **Purpose**: How many units/buildings to add
- **Range**: 1 - unlimited (practical: 1-10,000)
- **Default**: "1"
- **Validation**: Must be positive integer, non-zero
- **Effect**: Multiplies costs, affects production timeline
- **UI Location**: Item selector, right side
- **Accessible**: Yes, with label and sanitized input

#### Buff Target (For Industry/Recruiting Station)
- **Type**: Dropdown select
- **Purpose**: Choose which resource the buff building produces
- **Values**: "Steel" (Industry) | "Manpower" (Recruiting Station)
- **Default**: Auto-set based on building type
- **Validation**: Must match building type
- **Effect**: Determines which resource gets boosted in calculations
- **UI Location**: Item selector, visible only for buff buildings
- **Accessible**: Yes, conditional visibility

#### Province Location (For Recruiting Station)
- **Type**: Dropdown select
- **Purpose**: Choose where to place the recruiting station
- **Values**: "Core City" | other province types (game-specific)
- **Default**: "Core City"
- **Validation**: Must be valid province type
- **Effect**: May affect recruiting efficiency (game-specific)
- **UI Location**: Item selector, visible only for Recruiting Stations
- **Accessible**: Yes, conditional visibility

#### Upgrade Mode (For "Upgrade Only")
- **Type**: Numeric dropdowns (From → To)
- **Purpose**: Specify unit tier upgrade path
- **Values**: 
  - From: 1 - 4 (unlocked tiers)
  - To: (From + 1) - max tier
- **Validation**: 
  - Both tiers must be research-unlocked
  - To must be > From
  - Disabled options show unlock day
- **Effect**: Adds upgrade item to cart at 0.5x cost
- **UI Location**: Item selector, when "Upgrade Only" selected
- **Accessible**: Yes, with clear From → To arrow indicator

---

## Feature Overview

### 1. Production Planning
**Purpose**: Queue units and buildings for production

**Inputs**:
- Country, Item Type, Item Name, Tier, Count
- (Optional) Buff Target, Province Location

**Outputs**:
- Cart entry showing item, count, tier, costs
- Production timeline (hours per unit, completion date)
- Building requirement (e.g., "Requires Tank Plant")

**Algorithm**:
1. User selects item and clicks "Add"
2. System validates unlock status and availability
3. If item exists in cart with same tier/buff/province, increase count
4. Otherwise, add as new cart entry
5. Cart is re-sorted by canonical order
6. Costs are recalculated

---

### 2. Cost Calculation
**Purpose**: Compute total resource requirements for the plan

**Inputs**:
- Cart (queued items)
- Country faction
- Days (for research prerequisites)

**Costs Computed**:
- **Production Costs**: Resources to build each item
- **Research Costs**: Resources to unlock higher tiers
- **Faction Adjustments**: Ally gets 0.8x unit upgrade cost

**Examples**:

```
Infantry T1 x10
├─ Production: 1,000 Money × 10 = 10,000 Money
├─ Other: 500 Manpower, 200 Steel per unit
└─ Total: 10,000 Money, 5,000 Manpower, 2,000 Steel

Medium Tank T2 x5 + Upgrade (T1→T2)
├─ Tank Production: 5,000 Money × 5 = 25,000 Money
├─ Upgrade Costs: 2,000 Money × 0.5 (50% multiplier) = 1,000 Money per upgrade
└─ Total: 25,000 + 5,000 = 30,000 Money (with research added)
```

---

### 3. Production Timeline
**Purpose**: Calculate how long units take to produce based on available buildings

**Inputs**:
- Cart item
- Building entries (production facilities)
- Days passed (affects available production time)

**Outputs**:
- Hours per unit
- Max units producible in available time
- Completion time (hours, days)
- Units per day

**Algorithm**:

```
Base Production Hours = Unit's "Min Build Time (hrs)" field

Available Production Days = Current Day - Research Unlock Day
(e.g., Day 5 - Day 2 = 3 days = 72 hours of production)

Production Rate = Sum of (Building Count / Hours Per Unit per Building)

For each building:
  Effective Level = min(Building Tier, Unit's Optimal Production Requirement)
  Hours Per Unit per Building = Base Hours × 2^(OptimalLevel - EffectiveLevel)
  Rate += Building Count / Hours Per Unit per Building

Max Units = Production Rate × Available Hours

Completion Time = Requested Count / Production Rate (hours)
```

**Example**:
```
Infantry T1:
- Base: 1 hour per unit
- Optimal: Level 3 Barracks
- Available: 2x Barracks L2, 1x Barracks L3 = 3 total

Building Rate Calculation:
- Barracks L2: Effective Level = min(2, 3) = 2
  Hours = 1 × 2^(3-2) = 2 hours per unit
  Rate = 2 / 2 = 1 unit/hour
- Barracks L2: Same, 1 unit/hour
- Barracks L3: Effective Level = 3
  Hours = 1 × 2^(3-3) = 1 hour per unit
  Rate = 1 / 1 = 1 unit/hour

Total Rate = 1 + 1 + 1 = 3 units/hour
Available Time = 5 days = 120 hours
Max Units = 120 × 3 = 360 units
```

---

### 4. Research Unlock & Prerequisites
**Purpose**: Ensure units can only be built after research completes

**Inputs**:
- Unit tier
- Country faction
- Current game day

**Outputs**:
- Unlock day
- Disabled/enabled status in UI
- Research costs in cart

**Data**: From `globalData.researchData` (JSON)

**Example**:
```
Infantry Tier 1: Day 1 (always available)
Infantry Tier 2: Day 4 (requires 4 days of research)
Infantry Tier 3: Day 10

If Days Passed = 5 (Current Day = 6):
- Tier 1: ✓ Unlocked
- Tier 2: ✓ Unlocked (6 >= 4)
- Tier 3: ✗ Locked (6 < 10) → "Unlocks D10"
```

**Prerequisites**:
Certain units require earlier units to be researched:
```
Mechanized Infantry requires:
- Motorized Infantry T1+

Heavy Tank requires:
- Light Tank T1+
- Medium Tank T1+

Nuclear Rocket requires:
- Flying Bomb T1+
- Atomic Bomb T3+
- Rocket T4+
```

When calculating research costs, system automatically includes prerequisites.

---

### 5. Building Buff Production
**Purpose**: Industry & Recruiting Stations boost resource production

**Building Types**:

**Industry** (Steel boost):
- L1: +50% Steel
- L2: +100% Steel
- L3: +200% Steel

**Recruiting Station** (Manpower boost):
- L1: +50% Manpower
- L2: +100% Manpower
- L3: +200% Manpower

**Mechanic**:
- Add Industry building to queue
- In cart, specify "Buff Target: Steel"
- Game applies production boost for the specified resource
- CowCalc tracks this for feasibility calculation

---

### 6. Cart Management
**Purpose**: View, modify, and remove queued items

**Features**:

**View**:
- Table/list showing all queued items
- Columns: Item, Tier, Count, Building Required, Production Time, Costs

**Edit**:
- Click count cell to change quantity
- Click tier cell to upgrade/downgrade
- For units: add upgrade tier (e.g., T1 → T2)

**Remove**:
- "Remove" button per row
- Clears item from queue

**Sorting**:
Buildings first (Industry, Recruiting Station, others)
Then Units (by UNIT_ORDER)
Within category, by building requirement, then tier

---

### 7. Cost Breakdown
**Purpose**: Show resource costs in visual, easy-to-read format

**Displays**:

**Per-Item Costs**:
- Production costs (resources to build)
- Research costs (if unit needs research)
- Total per item

**Subtotals**:
- By country block
- By cost type (production vs research)

**Grand Total**:
- All resources for entire plan across all countries

**Format**: `🪙 10,000  👥 5,000  🌾 2,000  ⚙️ 500  ⛽ 100`

---

### 8. Discord Export
**Purpose**: Share plan with alliance via Discord

**Features**:

**Format**:
```markdown
# CowCalc Build Plan - Map Name

## Country 1: <@DiscordID> United States (Ally)
### Buildings
- Barracks L3 x2
- Tank Plant L2 x1
  - What: Production

### Units
- Infantry L2 x100
  - Base: Barracks
- Medium Tank L1 x50
  - Base: Tank Plant
  - Upgrade: L2

### Costs
Total: 🪙 500,000  👥 200,000  🌾 50,000  ⚙️ 100,000  ⛽ 25,000

## Country 2: ...
```

**Chunking**:
- Discord has 2,000 character message limit
- Plan is split into multiple messages if needed
- Warning shown if export couldn't fit

**UI**:
- Modal showing export preview
- "Copy" button per message chunk
- Easy paste to Discord

---

### 9. Plan Save & Load
**Purpose**: Persist plans across browser sessions

**Features**:

**Auto-Save**:
- Every change automatically saves to localStorage
- Compressed format (compact plan schema)

**Manual Save**:
- "Save Plan" button (optional name)
- Exports plan as .json file

**Load**:
- "Load Plan" button
- File picker to choose saved plan
- Reconstructs full state

**Data Persisted**:
- Selected map
- Days passed
- All country blocks (countries, carts, discord IDs)

---

### 10. Feasibility Checker
**Purpose**: Warn if plan is impossible given game constraints

**Checks**:
1. Missing buildings for unit production
2. Unit tiers that aren't researched yet
3. Prerequisite units not queued
4. Resource requirements exceed capacity

**Output**:
- Green ✓ (feasible) or Red ✗ (issues)
- Tooltip explaining each issue

---

## Calculations

### Cost Calculation (Detailed)

```javascript
// Per item (with examples):

const production_cost = {
  M: 1000,    // Money
  P: 200,     // Manpower
  F: 100,     // Food
  S: 500,     // Steel
  U: 50,      // Fuel
};

// Adjusted for count:
production_cost.M *= count;  // 1000 × 50 = 50,000

// If unit, add research costs:
research_cost = {
  M: 500,
  P: 100,
  F: 50,
  S: 200,
  U: 25,
};

// If Ally faction, apply 0.8x multiplier to upgrades:
research_cost.M *= 0.8;  // 500 × 0.8 = 400

// Total per item:
total_cost = production_cost + research_cost;
// { M: 50,400, P: 100,100, F: 100,050, S: 50,200, U: 50,025 }
```

---

## Data Models

### Plan Schema

```javascript
{
  _version: 3,
  format: 'compact',
  selectedMap: 'World_at_War_classic.json',
  days: 5,
  blocks: [
    {
      id: 1234567890,
      selectedCountryIdx: 12,  // Index in mapData.parsedRows
      capitalsTaken: 3,
      discordId: '123456789012345678',
      cart: [
        {
          type: 'Unit' | 'Building' | 'UpgradeOnly',
          name: 'Infantry',
          tier: 2,
          count: 100,
          upgradeTo: 3 | null,
          buffTarget: 'Steel' | 'Manpower' | null,
          provinceType: 'Core City' | null,
          fromTier: 1 | null,   // UpgradeOnly only
          toTier: 3 | null,      // UpgradeOnly only
        },
        // ... more items
      ],
    },
    // ... more blocks
  ],
}
```

### Cart Item (Runtime)

```javascript
{
  type: 'Unit' | 'Building' | 'UpgradeOnly',
  obj: { Name, Tier, 'building required', ... }, // Full unit/building object
  count: 50,
  
  // For units:
  upgradeTo: 3 | undefined,
  
  // For buildings:
  buffTarget: 'Steel' | 'Manpower' | null,
  buffValue: 200,  // % boost
  provinceType: 'Core City' | null,
  
  // For UpgradeOnly:
  prevObj: { ... },  // Tier to upgrade from
  fromTier: 1,
  toTier: 3,
}
```

---

## Usage Guide

### Basic Workflow: Planning 100 Infantry

1. **Setup**
   - Select map (e.g., "World at War")
   - Set days to "3"
   - Select country: "United States (Ally)"

2. **Add Unit**
   - Type: "Unit"
   - Name: "Infantry"
   - Tier: "2" (if unlocked)
   - Count: "100"
   - Click "Add"

3. **View Costs**
   - Cart shows: "Infantry L2 x100"
   - Production costs: Money, Manpower, Food, Steel, Fuel
   - Research costs (if tier needs research)

4. **Check Production Time**
   - Need Barracks (building required)
   - If "2x Barracks L2" in cart, shows max units and completion time

5. **Export**
   - Click "Export to Discord"
   - Copy message
   - Paste in Discord alliance channel

---

## Keyboard Shortcuts (Accessibility)

| Key | Action |
|-----|--------|
| Tab | Navigate between controls |
| Shift+Tab | Navigate backwards |
| Enter | Click button, select option |
| Space | Toggle checkbox, activate button |
| Escape | Close modal |
| Arrow Up/Down | Navigate select options |
| Alt+E | Export to Discord |
| Alt+S | Save plan |
| Alt+L | Load plan |

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Unit not unlocked" | Tier requires later game day | Wait or increase days |
| "No building available" | Required building not in queue | Add building to cart |
| "Missing prerequisites" | Earlier unit tier not queued | Add prerequisite unit |
| "Invalid map" | Selected map doesn't exist | Choose valid map |
| "Corrupted save file" | Save file format issue | Clear localStorage, start fresh |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Tier** | Unit/building level (1-5+); higher = stronger, more expensive |
| **Research** | Technology unlock; tied to game day |
| **Production** | Crafting units/buildings; takes hours, requires buildings & resources |
| **Buff** | Bonus to resource production (Industry, Recruiting Station) |
| **Cart** | Queue of items to produce |
| **Block** | Single country's production plan |
| **Faction** | National group (Ally, Axis, Commintern, Pan-Asian) |
| **Feasibility** | Whether a plan is possible given game constraints |


# CowCalc Core Logic Specification

## Overview
This document specifies the **game mechanics, calculations, and business rules** for the CowCalc system. It defines what can be calculated independently of UI, suitable for backend implementation, CLI tools, or any other interface.

---

## 1. Game Constants & Configuration

### Factions
```
Ally       → Unit Upgrade Cost Multiplier: 0.8
Axis       → Unit Upgrade Cost Multiplier: 1.0
Commintern → Unit Upgrade Cost Multiplier: 1.0
Pan-Asian  → Unit Upgrade Cost Multiplier: 1.0
```

### Resource Types
```
M (Money)     - Primary cost for all production
P (Manpower)  - Military personnel
F (Food)      - Population sustenance
S (Steel)     - Weapons, armor, infrastructure
U (Fuel)      - Aircraft, vehicles, naval units
```

Each item (unit/building) has costs defined as:
```
{
  Money: <float>,
  Manpower: <float>,
  Food: <float>,
  Steel: <float>,
  Fuel: <float>
}
```

### Item Types
```
Unit          - Military unit (Infantry, Tank, Bomber, etc.)
Building      - Production facility (Barracks, Tank Plant, etc.)
UpgradeOnly   - Pure upgrade (no new item, just tier progression)
```

### Building Categories
```
Production Buildings:
  - Barracks, Ordnance Foundry, Tank Plant, Aircraft Factory, Secret Lab
  - Naval Base, Airstrip
  - Affect: Unit production speed

Buff Buildings:
  - Industry (Steel production)
  - Recruiting Station (Manpower production)
  - Affect: Resource generation

Utility Buildings:
  - Capitol, Infrastructure, Fortifications, Bunkers
  - No direct effect on production
```

---

## 2. Core Mechanics

### 2.1 Timeline & Days
**Definition**: Game is divided into 24-hour cycles called "days"

**Current Day Calculation**:
```
currentDay = daysPassed + 1

Example:
  currentDay always equals daysPassed + 1.
```

### 2.2 Research & Unlocks
**Definition**: Each unit tier becomes available on a specific game day per faction

**Data**: Research table maps:
```
(unitName, faction, tier) → unlockDay

Example:
  Use the exact unlockDay stored for the requested (unitName, faction, tier) row in the research table.
```

**Unlock Logic**:
```
function isUnitTierUnlocked(unit, tier, faction, currentDay):
  unlockDay = researchTable[(unit, tier, faction)]
  return currentDay >= unlockDay
```

**Daily cost source**:
```text
public/data/Research_DailyCosts.json
```

This file is generated from the live game upkeep export and is the grouped source for daily research costs, by unit, faction, and tier.

### 2.3 Unit Production Requirements
**Every unit has**:
```
{
  Name: <string>,
  Tier: <int>,
  'building required': <string>,      // e.g., "Barracks"
  'Min Build Time (hrs)': <float>,    // base production time
  optimalproductionrequirement: <int>, // optimal building tier
  Money: <float>,
  Manpower: <float>,
  Food: <float>,
  Steel: <float>,
  Fuel: <float>
}
```

### 2.4 Building Production
**Production Buildings** (Barracks, Tank Plant, etc.):
- Tier affects **production speed** (higher tier = faster)
- Required to produce units
- No quantity limit in queue

**Buff Buildings** (Industry, Recruiting Station):
- Increase resource generation by percentage
- Use the exact values from `public/data/Building_Stats.json`
- Industry boosts `Steel` via `Resource Boost (%)`
- Recruiting Station boosts `Manpower` via `Manpower Boost (%)`
- CowCalc should not invent new percentages; it must read the JSON data directly

---

## 2.5 Real-Time Resource Generation & Morale

### 2.5.1 Base Province Production
CowCalc must use the province production rows in `public/data/Province_Stats.json` directly.

| Province Type | Base Resource (100% Morale) | Base Manpower (100% Morale) | Scaling Mechanic |
| --- | ---: | ---: | --- |
| Core City | 6000.0 | 600.0 | Proportional to Morale (e.g. 70% resource at 70% morale) |
| Core Resource Rural | 1500.0 | 150.0 | Proportional to Morale |
| Normal Core Rural | 0.0 | 450.0 | Proportional to Morale |

### 2.5.2 Real-Time Production Model
The game’s production is modeled as continuous, but CowCalc derives it from the province base rows and the current morale state. Do not invent a fixed hourly income table here.

```
effectiveProduction = baseProduction × (morale / 100)
```

For morale-sensitive planning, CowCalc should use the exact province type from the map data and the exact base values above.

### 2.5.3 Buff Buildings and Resource Boosts
The exact buff values must come from `public/data/Building_Stats.json`:

| Building | Tier | Build Time (hrs) | Boost % |
| --- | ---: | ---: | ---: |
| Industry | 1 | 8.0 | 13% |
| Industry | 2 | 14.0 | 28% |
| Industry | 3 | 20.0 | 50% |
| Industry | 4 | 26.0 | 80% |
| Industry | 5 | 32.0 | 120% |
| Recruiting Station | 1 | 6.0 | 35% |
| Recruiting Station | 2 | 12.0 | 100% |
| Recruiting Station | 3 | 18.0 | 200% |

### 2.5.4 Morale System
Morale is handled as a percentage and the existing code interpolates daily income from a 70% baseline upward.

```
dailyMorale = min(100, 70 + dayChangePct + capitalPct)
moraleDelta = dailyMorale - 70

incomeAtMorale = incomeAt70 + moraleDelta × (incomeAt100 - incomeAt70) / 30
```

This means CowCalc should preserve the code’s linear interpolation approach instead of substituting an invented resource-per-hour table.

### 2.5.5 Planning Considerations
CowCalc should read the JSON sources directly and calculate totals from those values only:

```
1. Read province type from map data
2. Read base production from Province_Stats.json
3. Read building boost values from Building_Stats.json
4. Apply morale interpolation used by the code
5. Sum total income for the selected days
```

If a value is not explicitly present in the JSON or the code, it should be treated as unknown rather than guessed.

---

## 3. Cost Calculation System

### 3.1 Production Cost
**For Units**:
```
productionCost = unit.costs × count

Example:
  Use the selected unit row from the faction data and multiply each resource column by the requested count.
```

**For Buildings**:
```
For production buildings (not buff):
  productionCost = buildingTier1.costs + buildingTier2.costs + ... + buildingTier[N].costs

For buff buildings (Industry, Recruiting Station):
  ONLY count costs up to when maxHours expires
  buildCost = 0
  hoursSpent = 0
  for tier in 1..targetTier:
    if hoursSpent >= maxHours:
      break
    buildCost += tierCosts
    hoursSpent += tier.buildTime
```

**Example (Industry)**:
```
Use the actual Industry rows from Building_Stats.json, sum their costs in order, and stop once the max-hours window is reached.
```

### 3.2 Unit Upgrades
**Upgrade Cost**:
```
When unit is upgraded from tier T1 to tier T2:
  costTier = (T2 - T1 === 1) ? T2 : (T2 - 1)
  upgradeCost = unitData[costTier].costs × 0.5 × factionMultiplier × count

Example:
  Use the tier selected by the costTier rule, then multiply that row by 0.5 and the faction multiplier.
```

### 3.3 Research Cost
**Research is the cost to unlock a unit tier**:
```
totalResearchCost = 0
maxTiers = applyPrerequisites(selectedUnits)

for each (unitName, maxTier) in maxTiers:
  for tier in 1..maxTier:
    researchItem = researchTable[(unitName, tier, faction)]
    if researchItem exists and tier was not yet researched:
      totalResearchCost += researchItem.costs × factionMultiplier
```

**Example**:
```
Queue:
  - Selected units that trigger prerequisite closure

MaxTiers after prerequisites:
  Includes every required prerequisite tier from the research table.

Research costs:
  Sum the matching research rows for all required tiers and apply the faction multiplier where the code does so.
```

### 3.4 Total Cost Aggregation
```
totalCost = productionCosts + upgradeCosts + researchCosts

For multi-block plan:
  globalTotal = sum(blockCosts) for all blocks
```

---

## 4. Production Timeline Calculation

### 4.1 Base Production Time
**Each unit has**:
```
Min Build Time (hrs) = baseTime
```

**Effect of building tier**:
```
hoursPerUnit = baseTime × 2^(optimalLevel - effectiveLevel)

where:
  optimalLevel = unit.optimalproductionrequirement
  effectiveLevel = min(buildingTier, optimalLevel)

Example:
  Use the selected unit's baseTime and optimalproductionrequirement, then clamp the building tier to the optimal tier before calculating hoursPerUnit.
```

### 4.2 Production Rate Calculation
**With multiple buildings**:
```
productionRatePerHour = sum of (buildingCount / hoursPerUnit)

For each building entry:
  buildingTier = entry.tier
  buildingCount = entry.count
  effectiveLevel = min(buildingTier, unit.optimalLevel)
  hoursPerUnit = baseTime × 2^(optimalLevel - effectiveLevel)
  rate += buildingCount / hoursPerUnit
```

**Example**:
```
Sum the contribution of each matching building entry using the same hoursPerUnit rule above.
```

### 4.3 Available Production Time
```
unlockDay = researchTable[(unit, tier, faction)]
currentDay = daysPassed + 1
producibleDays = max(0, currentDay - unlockDay)
totalHours = producibleDays × 24

Example:
  producibleDays is the number of days between currentDay and unlockDay, clamped at zero.
```

### 4.4 Max Units & Completion Time
```
maxUnitsByDay = totalHours × productionRatePerHour
requestedUnits = queue item count
cappedUnits = min(requestedUnits, maxUnitsByDay)
completionHours = requestedUnits / productionRatePerHour
```

**Example (continued from 4.3)**:
```
Completion is the requested quantity divided by the computed production rate, then clamped by the available hours window.
```

---

## 5. Unit Upgrade Prerequisites

**Hard-coded prerequisite rules**:
```
Motorized Infantry requires Infantry T1+
Mechanized Infantry requires Motorized Infantry T1+
Commandos requires Motorized Infantry T1+
Paratroopers requires Motorized Infantry T1+

SP Artillery requires Artillery T1+
SP Anti Air requires Anti Air T1+
SP Rocket Artillery requires Rocket Artillery T1+

Medium Tank requires Light Tank T1+
Tank Destroyer requires Light Tank T1+
Heavy Tank requires Medium Tank T1+

Rocket requires Flying Bomb T1+
Rocket Fighter requires Flying Bomb T1+

Nuclear Bomber requires Atomic Bomb T1+
Nuclear Rocket requires Atomic Bomb T3+ AND Rocket T4+ AND Flying Bomb T1+
```

**Algorithm**:
```
function applyPrerequisites(selectedUnits):
  maxTiers = selectedUnits as map { unitName → maxTier }
  
  repeat until no changes:
    for each prerequisite rule:
      if rule.dependent is in maxTiers:
        for each rule.required in prerequisites:
          if required.tier > maxTiers[required.unit]:
            maxTiers[required.unit] = required.tier
  
  return maxTiers

Example:
  Start from the selected units, then repeatedly add every prerequisite unit/tier until the set no longer changes.
```

---

## 6. Feasibility & Validation

### 6.1 Required Building Check
```
For each unit in queue:
  requiredBuilding = unit['building required']
  if requiredBuilding is not in queue:
    ISSUE: missing building
```

### 6.2 Research Unlock Check
```
For each unit in queue:
  unlockDay = researchTable[(unit, tier, faction)]
  if currentDay < unlockDay:
    ISSUE: unit not unlocked until day {unlockDay}
```

### 6.3 Prerequisite Chain Check
```
For each unit in queue:
  prerequisites = applyPrerequisites({unit: tier})
  for each required unit:
    if required unit not in queue at required tier:
      ISSUE: missing prerequisite
```

### 6.4 Buff Building Validity
```
For each buff building in queue:
  if Industry:
    buffTarget must be 'Steel'
  if Recruiting Station:
    buffTarget must be 'Manpower'
```

---

## 7. Cart & Queue Management

### 7.1 Adding Items
```
function addToCart(cart, item, count):
  # Check if item already exists (same tier, buff target, province)
  existing = cart.find(c =>
    c.type === item.type AND
    c.obj.Name === item.obj.Name AND
    c.obj.Tier === item.obj.Tier AND
    (for buildings: c.buffTarget === item.buffTarget AND c.provinceType === item.provinceType)
  )
  
  if existing:
    existing.count += count
  else:
    Queue:
    - Selected units that trigger prerequisite closure
```

    Includes every required prerequisite tier from the research table.
  cart.splice(index, 1)
  return cart
    Sum the matching research rows for all required tiers and apply the faction multiplier where the code does so.

Within category:
  By building requirement name (canonical order)
  → by tier (ascending)
  → by original insertion order
```

---

## 8. Data Models

### Plan
```
{
  selectedMap: string,         // Map filename
  days: integer,               // Days passed
  blocks: Block[]              // Country blocks
}
```

### Block
```
{
  id: unique identifier,
  selectedCountryIdx: integer,    // Index in map's country list
  capitalsTaken: integer,         // Number of capitals captured
  discordId: string,              // Discord user ID for mention
  unitData: Unit[],               // Faction-specific units (loaded dynamically)
  cart: CartItem[]                // Queue of items to produce
}
```

### CartItem
```
{
  type: 'Unit' | 'Building' | 'UpgradeOnly',
  obj: Unit | Building,           // Full object data
  count: integer,
  
  // For units:
  upgradeTo?: integer,            // Tier to upgrade to
  
  // For buildings:
  buffTarget?: string,            // 'Steel' | 'Manpower'
  buffValue?: float,              // % boost
  provinceType?: string,          // 'Core City' | etc.
  
  // For UpgradeOnly:
  prevObj?: Unit,                 // Unit object at fromTier (for cost)
  fromTier?: integer,
  toTier?: integer
}
```

### Cost Bucket
```
{
  M: float,  // Money
  P: float,  // Manpower
  F: float,  // Food
  S: float,  // Steel
  U: float   // Fuel
}
```

---

## 9. Serialization Format

### Compact Plan (for storage/transmission)
```
{
  _version: 2,
  _format: 'v2',
  selectedMap: string,
  days: integer,
  blocks: [
    {
      id: unique id,
      selectedCountryIdx: integer,
      capitalsTaken: integer,
      discordId: string,
      cart: [
        {
          type: string,
          name: string,
          tier: integer,
          count: integer,
          upgradeTo: integer | null,
          buffTarget: string | null,
          provinceType: string | null,
          fromTier: integer | null,
          toTier: integer | null
        }
      ]
    }
  ]
}
```

---

## 10. Discord Export Format

```
# CowCalc Build Plan - {MapName}

## Country {N}: {DiscordMention} {Nation} ({Faction})

### Buildings
- {Name} L{Tier} x{Count}
  - Boost: {BuffType}
  - Location: {ProvinceType}

### Units
- {Name} L{Tier} x{Count}
  - Requires: {BuildingName}
  - Upgrade: L{Tier}

### Unit Upgrades
- {Name}
  - L{FromTier} → L{ToTier} x{Count}

### Costs
💰{Money} | 👥{Manpower} | 🌾{Food} | ⚙️{Steel} | ⛽{Fuel}
```

**Message Limit**: 2000 characters per Discord message. If plan exceeds, split into multiple chunks.

---

## 11. Edge Cases & Constraints

### Unit Production Rules
- Transport Ship **cannot be upgraded** (no upgrade path)
- Excluded items **never appear** in selection: Aircraft Transport, Transport Convoy, Flame Tank, Amphibious Tank, Marines, Fallout Lvl 1/2, Nuclear Fallout
- If building tier exceeds optimal level, no additional benefit
- Production with 0 buildings: 0 units can be produced

### Research Rules
- Tier 1 of any unit is always available (unlockDay = 1)
- Prerequisites form a DAG (no cycles)
- Research cost applies **once per plan** (not per unit count)

### Building Rules
- Buff buildings only apply their boost if included in queue
- Buff percentages are additive (if 2×Industry L1, +100% Steel total)
- Building can be queued multiple times (count field)

### Faction Rules
- Ally: 0.8× multiplier on **upgrade costs only** (not production)
- Other factions: 1.0× multiplier

### Time Rules
- Production cannot go backward in time
- If research unlock is in the future, unit counts as 0 producible (not negative)
- MaxHours is based on producible days only

---

## 12. Algorithm Summary

### Main Calculation Flow
```
1. User creates plan with blocks
2. For each block:
   a. Validate country selection
   b. Load faction unit data
   c. For each cart item:
      i. Check research unlock
      ii. Apply prerequisites
      iii. Calculate production cost
      iv. Calculate upgrade cost
      v. Calculate production timeline
      vi. Calculate feasibility
   d. Aggregate block costs
3. Export as needed (Discord, JSON, etc.)
```

### Performance Considerations
- **Cache research data** on load (don't recompute)
- **Memoize prerequisite application** (same input = same output)
- **Lazy-load** faction unit data (only when needed)
- **Debounce** cost recalculation (only on cart change)

---

## 13. Extension Points

### Adding New Mechanics
**New unit tier unlock rule**:
- Add entry to research table
- No code changes needed

**New building buff type**:
- Add building object with boost %
- Add to buff building category
- Cost calculation unchanged

**New resource type**:
- Add to Resource enum
- Add field to all cost objects
- Calculations auto-adapt

**New faction**:
- Add faction + multiplier to config
- Add faction data file
- No logic changes needed

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **Tier** | Unit/building level (1-5+); higher = stronger, more expensive |
| **Research** | Technology unlock; tied to game day |
| **Production** | Crafting units/buildings; takes hours, requires buildings & resources |
| **Buff** | Bonus to resource production |
| **Cart** | Queue of items to produce |
| **Block** | Single country's production plan |
| **Faction** | National group (Ally, Axis, Commintern, Pan-Asian) |
| **Optimal Level** | Building tier where unit gets full production bonus |
| **Effective Level** | min(building tier, optimal tier) |
| **Producible Days** | currentDay - unlockDay (days available for production) |
| **Prerequisite** | Earlier unit tier that must be researched first |


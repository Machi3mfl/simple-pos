# Activity Diagram: Stock Movement and Catalog Onboarding

```mermaid
flowchart TD
  A([Start]) --> B{Process type}

  B -->|Guided onboarding| C[Open product onboarding wizard]
  C --> D[Enter minimum fields\nname/category/price/stock]
  D --> E{Image provided?}
  E -->|No| F[Assign category placeholder]
  E -->|Yes| G[Keep provided image]
  F --> H[Validate product data]
  G --> H
  H --> I{Valid data?}
  I -->|No| J[Show validation errors]
  J --> D
  I -->|Yes| K[Create/activate product]
  K --> L{Run bulk price update now?}
  L -->|No| Z([End])
  L -->|Yes| M[Select scope: all/category/selection]
  M --> N[Choose mode: percentage/fixed_amount]
  N --> O[Enter value and generate preview]
  O --> P{Any invalid resulting price?}
  P -->|Yes| Q[Block apply and show invalid items]
  Q --> N
  P -->|No| R[Confirm apply]
  R --> S[Apply batch atomically + write audit summary]
  S --> Z

  B -->|Stock movement| T[Select product + movement type]
  T --> U[Enter quantity]
  U --> V{movementType == inbound?}
  V -->|Yes| W[Require unitCost]
  W --> X{unitCost valid (>0)?}
  X -->|No| Y[Show validation error]
  Y --> W
  X -->|Yes| AA[Persist movement]
  V -->|No| AA
  AA --> AB[Recalculate stock and weighted-average cost basis]
  AB --> Z
```

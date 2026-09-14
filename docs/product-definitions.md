# Product Definitions

## Product truth

### What counts as a "new business"
- **Filed business:** A legal filing was submitted and appears in official Secretary of State records.
- **Active business:** The filing shows active/good-standing status in official records.
- **Operating business:** There is evidence the business is actively operating at a physical location (distinct from registered agent records).

For Nexus, the default "new business" feed is **newly filed businesses**, with separate confidence signals for active and operating status.

### What counts as an "operating location"
- A place where the business appears to serve customers, produce goods, or run operations.
- Must be stored separately from registered-agent or legal-service addresses.
- Can include storefront, office, warehouse, or service-area anchor location.

### What counts as a "verified business"
A business is considered verified when evidence exists from:
1. A valid government filing (source record retained), and
2. At least one usable location record with confidence score, and
3. A recent `last_seen` timestamp from ingestion.

Verification is evidence-based and may be partial (legal identity verified while operating status remains lower confidence).

## Initial go-to-market choices

### First geography
- **Kansas (KS)** as the first primary source state.
- Initial launch lens: Kansas businesses relevant to the Kansas City regional ecosystem.

### Primary customer segment
- **Local community operators** (chambers, neighborhood organizations, business districts, ecosystem builders) that need trustworthy visibility into new business formation and local engagement opportunities.

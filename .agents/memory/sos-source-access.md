---
name: SOS source access
description: Constraints and source-selection guidance for Kansas and Missouri SOS business data.
---

The Kansas and Missouri Secretary of State public search pages are interactive search forms and may reject automated requests, so they are not reliable unattended feed endpoints. The refresh pipeline should keep source URLs configurable and use a clearly labeled SOS-backed directory or export that returns a bounded HTML/JSON result set.

**Why:** An unattended daily job must receive machine-readable rows; treating an interactive or anti-bot page as a feed creates false success or repeated source failures.

**How to apply:** Preserve defensive parsing, stable source IDs, response-size/time limits, and persisted source health whenever changing the live feed URLs. Prefer direct state exports if the states make them available later.
# Repository License Decision

Status: COPYRIGHT HOLDER REQUIRES OWNER INPUT. No root LICENSE exists and none has been created. The repository has no explicit author/copyright identity; education details and a machine username are not an appropriate basis for inventing a copyright holder.

## Option A: MIT

Recommended for this personal Portfolio Prototype, subject to naming the correct rights holder. Standard MIT permits use, copying, modification, distribution, sublicensing and commercial software reuse, with copyright and permission notices retained and the standard warranty disclaimer. The Round 2.5 request conditionally authorizes creation after compatibility and authorship checks; compatibility is satisfied for the inspected bundled material, but authorship is still missing.

The existing [Lucide notice](../../src/vendor/lucide.LICENSE) contains ISC permission and MIT terms for Feather-derived icons. Both are compatible with distributing the author's code under MIT while preserving these notices. Lucide/Feather code remains under its respective license; a root MIT file must not erase or replace third-party attribution. No additional bundled third-party code with conflicting terms was identified in the inspected source/vendor inventory and package metadata. Playwright used for local verification is an external dependency, not bundled in this release.

## Option B: No License

Retain copyright by default and provide no general open-source permission to reuse, modify or commercially redistribute the author's code. A public GitHub repository can still be viewed and used through platform functions under applicable platform terms; public visibility alone is not a general MIT-like license. Third-party components retain their own grants regardless of the repository-level choice.

## Scope and Next Input

Neither option constitutes medical software certification, clinical validation, hospital authorization, medical-data authorization or regulatory approval. Software licensing does not authorize use of patient or hospital data.

Provide the exact public copyright holder name or established pseudonym for a standard MIT LICENSE (year 2026), or explicitly choose No License. The latter should be recorded as an intentional choice, not silently inferred from the currently missing file. Until this input arrives, licensing is unresolved and the public release remains on hold.

## Final License Decision

Round 2.6, 2026-09-11. The preceding sections preserve the Round 2.5 historical decision; this section records the current decision.

Decision: MIT License.

Reason:
- suitable for a personal portfolio / open-source demonstration project
- compatible with the reviewed Lucide ISC and Feather MIT notices
- does not impose unnecessary redistribution restrictions
- makes the intended reuse status explicit for GitHub visitors

Copyright holder: Owner Input Required.

Copyright holder was not inferable from repository metadata and must be replaced by the owner before public publication.

The package has no author field; README gives educational background but no author name. git config user.name and user.email returned no configured values. Existing third-party copyright holders identify their respective components, not this project's author.

The root [LICENSE](../../LICENSE) now contains standard MIT terms with the explicitly authorized placeholder: Copyright (c) 2026 [Copyright Holder]. If the copyright holder is still not explicitly identified from repository metadata, the owner must replace the placeholder before public publication. Current status: MANUAL PUBLICATION HOLD, solely for this remaining authorship entry.

Third-party notices: Existing third-party notices remain unchanged. No medical disclaimer or additional restriction was inserted into the MIT text. This software license does not constitute medical certification, clinical validation, hospital authorization, medical-data authorization or regulatory approval.

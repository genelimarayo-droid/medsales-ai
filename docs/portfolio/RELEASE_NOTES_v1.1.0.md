# MedSales AI V1.1.0

**Release notes draft · Not published**

## Overview

This release is a portfolio prototype. MedSales AI is an AI Medical Device Sales Copilot focused on evidence-driven sales review. V1.1 runs locally for one user with Mock AI and manual confirmation; it is not production medical software.

## What Is Included

Frozen source, preserved tests and simulated fixtures, local static server, README, product case study, Demo script and nine actual desktop/mobile UI screenshots.

## Core Capabilities

Customer information extraction and review, customer understanding, hypotheses, visit preparation, isolated roleplay, independent visit records, debrief, opportunity evidence checks, action confirmation and version history.

## Evidence-Driven Workflow

Input → Information/candidate Evidence → human semantic confirmation → validated Evidence → hypothesis and opportunity evaluation → action review → version snapshot. Customer statements, sales judgments and AI inference are distinguished.

## Human Confirmation

Human acceptance of a record does not automatically confirm its semantic meaning. Relevant assertions, direction and source must be reviewed; actions require acceptance before saving.

## Opportunity Stage

Stages 0–6 reflect implemented evidence gates, not close probability or a universal hospital procurement model. Pain alone is not a purchase project. Stage 4 requires the project and procurement conditions described in the README.

## Contradiction Handling

In the SIMULATED Demo, a procurement-start correction invalidates prior support. With other project conditions intact, current Stage 4 becomes Stage 3. This is recalculation, not a cosmetic UI change.

## Version History

V1/V2/V3 are independent program snapshots. Current invalidation does not rewrite historical V2. Refresh persistence is browser-local, not a secure audit database.

## Roleplay

Finite, rule-driven customer scenarios; response duration and failure frequency remain distinct. Scoring uses manually reviewed behavior Evidence. Virtual customer answers are not automatically imported into formal customer evidence.

## Portfolio Documentation

Eight documents cover positioning, architecture, workflow, Evidence, decisions, limitations, comparison and an approximately eight-minute presentation plan. The timing is a rehearsal target, not measured novice task completion.

## Known Limitations

Mock AI, local single-user storage, manual structured review, limited language coverage, no live LLM/hospital/CRM connection, no production sensitive-data protections. Legacy browser scripts contain local path dependencies pending owner resolution before public upload.

## Testing Status

At freeze: current 30/30 PASS; browser flow, V1→V2→V3, contradiction, Stage 4→3, historical protection, multi-project, mobile and Console/network checks PASS. Historical collection: 80 items, 51 PASS, 29 legacy-contract FAIL. The 29 tests have not been modified or deleted. No CI passing claim.

## Security Scope

Only simulated material is intended. Packaging scans are bounded checks, not certification. No remote creation, commit, tag or push was performed. License decision and path-exposure resolution remain manual publication prerequisites.

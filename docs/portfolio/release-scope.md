# Release Scope · v1.1.0

Target: frozen V1.1 Portfolio Prototype. This document describes the proposed GitHub content, not an already published release.

## Included

- `src/`: unchanged application, static icon and bundled Lucide license.
- `tests/`: unchanged current tests, legacy tests and simulated fixtures; no failing tests removed.
- `README.md`, `package.json`, `server.mjs`, `.gitignore`, `CHANGELOG.md`.
- `docs/portfolio/`: eight case-study documents, Demo script, nine genuine screenshots, provenance and release materials.

## Excluded

Dependencies, local environment/secrets, logs, browser profiles, temporary build output, IDE files, local `work/` tools and raw `outputs/` audit history. Public freeze results are summarized in [freeze-verification.md](freeze-verification.md), so public README links do not depend on ignored output.

No real customer/patient/hospital procurement records, API keys or credentials are intended for this release. Package version already equals `1.1.0`; `private: true` is retained and concerns npm publication, not GitHub repository visibility.

## Publication Hold

Four unchanged `tests/browser-*.cjs` files contain developer-home absolute paths to Playwright, and platform-specific Chrome paths. They are retained because this round forbids changing tests. They are not tokens, but expose local account/path metadata and impair portability. **BLOCKED: requires test change or explicit owner decision about public exposure.** Do not exclude the tests merely to make the scan pass.

## License

LICENSE DECISION PENDING. No repository-wide license was chosen on the owner's behalf. MIT can be considered by the owner; it permits software reuse including commercial use, but does not grant medical certification, patient-data rights or regulatory approval. The bundled third-party license is preserved separately and does not license the author's whole repository.

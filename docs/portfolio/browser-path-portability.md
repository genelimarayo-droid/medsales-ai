# Browser Test Path Portability · Round 2.5

Only dependency/browser paths in four legacy browser tests changed. Assertions, selectors, data, scenarios, headless settings, URLs and output locations are unchanged. Run commands from the repository root.

| Variable | Default when unset or empty | Override |
|---|---|---|
| MEDSALES_RUNTIME | node_modules under process.cwd() | Absolute directory containing the playwright package, not the package itself |
| CHROME_PATH | Playwright's installed Chromium | Absolute Chrome/Chromium executable path |

Prerequisites: Node.js, a separately available Playwright package, and a compatible installed browser. These changes do not install dependencies or download browsers. If project-local Playwright and its Chromium are installed, leave both variables unset. Missing dependencies or browser executables produce an error, not a passing test.

Windows PowerShell example, when Playwright is installed in the project and Chrome uses its standard system installation:

```powershell
$env:MEDSALES_RUNTIME=(Resolve-Path './node_modules').Path
$env:CHROME_PATH=Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'
Test-Path (Join-Path $env:MEDSALES_RUNTIME 'playwright')
Test-Path $env:CHROME_PATH
node tests/browser-v1_1.cjs
node tests/browser-round3.cjs
node tests/browser-round4.cjs
node tests/browser-round5.cjs
```

Both Test-Path results must be true for that configuration. For another installation, set the corresponding environment variable to its actual location; do not assume the sample path exists. Spaces are handled by PowerShell variables and Node path APIs. Environment variables set this way apply to the current PowerShell process and its child processes.

In another terminal, run node server.mjs. Tests retain their existing URL, loopback port 4173. If a server already occupies it, confirm it serves this frozen project's source before testing; do not silently test another service or change test URLs. Browser contexts are fresh, so they do not use the normal browser's saved customer data. Tests retain existing outputs under the ignored outputs directory.

Round 2.5 explicitly configured the pre-existing local Playwright and the same system Chrome used by the original scripts. The first command configuration incorrectly selected a node_modules directory adjacent to the runtime bin directory; it failed with MODULE_NOT_FOUND. Correcting only the shell environment located the installed dependency. All four then launched; three failed legacy scoring assertions, and Round 5 passed. No dependency was installed and no assertion was modified.

The unset-variable Chromium fallback is standard Playwright discovery, but was not exercised in this machine's final runs. It may use a different browser version from an explicitly configured Chrome; specify CHROME_PATH when reproducing a particular environment. See the [current report](MedSales_AI_V1_1_GitHub_Public_Safety_Fix_Report.md).

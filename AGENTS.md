# AGENTS.md

## Mission

TableFlow is the official product for a 90-day challenge to generate **USD 10,000 in revenue** by building and selling a browser extension.

## Priority order

1. Get paying users as quickly as possible.
2. Keep the extension installable, reliable, and easy to demonstrate.
3. Improve activation, conversion, and retention before adding more features.
4. Avoid duplicate projects, duplicate repositories, and speculative rewrites.

## Product rules

- This repository is the single source of truth for TableFlow.
- The current MVP scans tables on the active page, previews data, and exports CSV, JSON, or Markdown.
- Processing must remain local in the browser unless a backend is explicitly approved.
- Do not add accounts, databases, AI APIs, analytics, subscriptions, or paid infrastructure unless they directly support a validated customer need.
- Do not purchase services or publish to a browser store without the owner's explicit confirmation.
- Do not polish low-impact details while installation, onboarding, payment, or customer acquisition is blocked.

## Engineering rules

- Prefer small, reversible changes.
- Keep Manifest V3 compatibility.
- Do not request browser permissions that are not required.
- Never commit secrets, API keys, private customer data, or payment credentials.
- Update README files when installation or behavior changes.
- Test the extension manually on at least one simple HTML table before marking a release ready.

## Definition of done

A change is done only when it is understandable to a non-technical owner, installable from the repository, and connected to a clear user or revenue outcome.

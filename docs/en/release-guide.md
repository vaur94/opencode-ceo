# Release Guide

## Current Release Status

- npm package: not published yet
- GitHub release: not created yet
- release workflow: configured in `.github/workflows/release.yml`

## Before The First Release

Make sure all of the following are true:

- `bun run ci:verify` passes locally
- `main` is green on GitHub
- `CHANGELOG.md` reflects the release contents
- `package.json` version is correct
- `NPM_TOKEN` is configured in GitHub Actions secrets

## Release Process

1. update version and changelog if needed
2. push the release-ready branch through the normal PR flow
3. tag the release with `v*` such as `v0.1.0`
4. let `.github/workflows/release.yml` publish to npm
5. create or confirm the GitHub release notes

## What This Repository Already Has

- release workflow wiring
- package verification in CI
- changelog file
- protected main branch

## What Is Still Manual

- deciding the first public version
- creating the first release tag
- ensuring npm credentials are present

## Related Docs

- [Usage Guide](./usage-guide.md)
- [Governance and Branch Policy](./governance-guide.md)
- [Changelog](../../CHANGELOG.md)

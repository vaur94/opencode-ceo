# Governance and Branch Policy

## Branch Protection On `main`

The repository is configured to keep `main` controlled:

- required checks: `quality`, `tests`, `package`
- linear history enabled
- force-push disabled
- conversation resolution required
- admin enforcement enabled

## Practical Merge Policy

- open a PR for changes targeting `main`
- keep PRs focused and reviewable
- do not merge while required checks are red
- resolve open review conversations before merge

## Automation That Supports Governance

- CI workflow in `.github/workflows/ci.yml`
- release workflow in `.github/workflows/release.yml`
- Dependabot in `.github/dependabot.yml`
- PR template in `.github/PULL_REQUEST_TEMPLATE.md`

## Current Limits

- the first public release has not been created yet
- npm publication has not happened yet

## Related Docs

- [Pull Request Guide](./pull-request-guide.md)
- [Release Guide](./release-guide.md)
- [Security](../../SECURITY.md)

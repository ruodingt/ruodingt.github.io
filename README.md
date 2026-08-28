# ruodingt.github.io

This is a Jekyll site. A `Taskfile.yml` (go-task) wraps the common commands:

```
task install   # bundle install
task serve     # bundle exec jekyll serve --livereload, http://localhost:4000
task build     # bundle exec jekyll build -> _site/
task clean     # remove _site/ and Jekyll's cache dirs
```

Without `task`, the equivalent Bundler commands work directly, e.g.:

```
bundle exec jekyll serve
```

## Automated pull request reviews

`.github/workflows/codex-review.yml` reviews each non-draft pull request opened by
the repository owner and submits either an approval or a change request from a
`github-actions[bot]`. The policy is intentionally approval-first: only a verified,
material defect should produce `REQUEST_CHANGES`.

Repository configuration required by the workflow:

- A trusted, persistent Linux x64 self-hosted runner with the `codex-review` label,
  `codex` and `jq` installed, and no untrusted workloads. Do not attach this label
  to a general-purpose runner.
- Variable `CODEX_REVIEW_HOME`: an absolute path on that runner reserved for this
  workflow, such as `/opt/codex-review`. Its refreshed authentication cache must
  persist between jobs.
- Secret `CODEX_AUTH_JSON`: the complete contents of `~/.codex/auth.json` after a
  local `codex login` using ChatGPT subscription authentication. This bootstraps
  the runner only when its persistent auth file is missing; never paste a lone
  access token or commit this file.
- In **Settings → Actions → General → Workflow permissions**, enable **Allow
  GitHub Actions to create and approve pull requests**. The workflow grants its
  short-lived `GITHUB_TOKEN` only read access to contents and write access to pull
  requests, so the submitted review is attributed to `github-actions[bot]` rather
  than the repository owner.

Personal subscription authentication in CI is an advanced OpenAI-supported pattern
for trusted private automation. Because this repository is public, the workflow is
deliberately restricted to owner-authored pull requests and will skip all external
contributors. The serialized job reuses one persistent auth cache so Codex can
refresh it safely. If broader pull-request coverage is needed, use an OpenAI API key
with `openai/codex-action` instead of exposing personal subscription credentials.

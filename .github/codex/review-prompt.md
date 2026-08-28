# Pull request review

Review the pull request represented by the checked-out merge commit. Inspect the
diff against the first parent and read enough surrounding code to determine whether
the change introduces a real defect.

Your default verdict is `APPROVE`. Use `REQUEST_CHANGES` only when you identify at
least one key issue: a specific, reproducible problem that can cause incorrect
behavior, a security vulnerability, data loss, a broken build or deployment, or a
material regression. Do not request changes for style preferences, speculative
risks, minor maintainability concerns, optional improvements, or missing tests when
the implementation itself is sound.

Before choosing `REQUEST_CHANGES`, verify the issue from the repository contents and
explain the triggering conditions and impact. If uncertainty remains, approve and
mention the concern as non-blocking only when it is useful.

Return only the JSON object required by the supplied output schema:

- `verdict`: `APPROVE` or `REQUEST_CHANGES`.
- `body`: concise Markdown suitable for a GitHub pull request review. For blocking
  issues, identify the file and relevant location and explain the concrete failure.
  For approval, briefly summarize what was checked; include non-blocking suggestions
  only when they add clear value.

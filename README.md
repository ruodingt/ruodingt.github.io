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

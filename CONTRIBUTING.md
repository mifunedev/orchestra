# Contributing to Orchestra

🎉 **Thanks for helping make Orchestra better!**  
We follow the Developer Certificate of Origin (DCO) &mdash; every commit
must be signed off with the `-s` flag (`git commit -s -m "message"`).

## Ground rules

| What            | How                                                    |
| --------------- | ------------------------------------------------------ |
| Code style      | `pre-commit run --all-files` must pass.                |
| Commit sign-off | Adds `Signed-off-by: Your Name <email>` automatically. |
| Pull requests   | Target `main`, follow PR template, link issues.        |
| Tests           | `make test` must be green; CI blocks otherwise.        |
| Review SLA      | Maintainers reply within **5 working days**.           |

### Quick start

```bash
git clone https://github.com/mifunedev/orchestra
cd orchestra
make setup      # installs Poetry / Node / etc.
git checkout -b my-feature
# hack away...
git commit -s -a -m "feat: amazing improvement"
git push --set-upstream origin my-feature
```

# Navigator Consulting

Corporate website for Navigator Consulting Mozambique.

## Pages

- Home
- About
- Services
- Methodology
- Contact

## Local preview

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Validation

```bash
python scripts/validate_site.py
node --check js/main.js
```

## Deployment

The live site is published from the `gh-pages` branch. On Windows, run:

```powershell
.\scripts\deploy.ps1
```

The script validates the website, checks JavaScript syntax, pushes `main`, and updates the Pages branch.

An automated GitHub Pages workflow is also included for use when GitHub Actions is enabled on the account.


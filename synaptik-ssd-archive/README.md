# Synaptik SSD 2022 Wayback Recovery

This package contains raw and locally rewritten captures for the conference pages under `synaptik.ru/ssd2022`.

## Best inputs for an LLM

1. `LLM_HANDOFF.md` - concise Russian brief with exact archive facts and reconstruction notes.
2. `site/20221005042650-ssd2022/index.html` - latest recovered main page, rewritten to local assets where available.
3. `site/20221005055115-ssd2022-pamyatka/index.html` - latest recovered memo page.
4. `source-html/*.raw.html` - raw Wayback `id_` HTML without toolbar rewriting.
5. `manifest.json` - exact CDX records, asset download status, and source archive URLs.

## Captures

- SSD 2022 main page, 2022-08-16: https://web.archive.org/web/20220816061157id_/https://synaptik.ru/ssd2022/ -> `site/20220816061157-ssd2022/index.html`
- SSD 2022 main page, 2022-10-05: https://web.archive.org/web/20221005042650id_/https://synaptik.ru/ssd2022/ -> `site/20221005042650-ssd2022/index.html`
- SSD 2022 memo page, 2022-08-16: https://web.archive.org/web/20220816061030id_/https://synaptik.ru/ssd2022_pamyatka/ -> `site/20220816061030-ssd2022-pamyatka/index.html`
- SSD 2022 memo page, 2022-10-05: https://web.archive.org/web/20221005055115id_/https://synaptik.ru/ssd2022_pamyatka/ -> `site/20221005055115-ssd2022-pamyatka/index.html`

## Asset Status

- Downloaded assets: 31
- Missing assets: 54
- Asset bytes: 1127836

Important: some page-specific CSS and many `/img/25...` images were referenced by HTML but were not present in Wayback CDX and returned 404 from both Wayback and the live domain. These missing files are listed in `manifest.json`.

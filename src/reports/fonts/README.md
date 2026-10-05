# Offline name glyphs

The report uses Noto Sans for its Spanish text. Unmodified GNU Unifont 17.0.05
provides fallback glyphs for user-entered names outside that Latin subset;
this is not a language selector or a translation catalogue.

Sources:
- [BMP font](https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont-17.0.05.otf)
- [Upper-plane font](https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont_upper-17.0.05.otf)
- [License](https://unifoundry.com/LICENSE.txt), copied as `LICENSE-Unifont.txt`.

The fonts are dual licensed under SIL Open Font License 1.1 and GPL 2 or later
with a font-embedding exception. The bundled files are unchanged. They add about
11 MB to the server assets, in exchange for offline name coverage. PDFKit embeds
only the glyph subsets used in each generated document. Next.js traces both
files explicitly; no runtime font downloads are needed.

SHA-256:

```text
85701ab9b1e251ee16f4df00b13f22eac311d72b7dab427a7d975fe7f5064702  unifont-17.0.05.otf
f4fd6d5d752726d384feef175bb780c9f29382cd4941c9e1e6990d7c3822a090  unifont_upper-17.0.05.otf
```

# Multilingual Proverb Explorer
### Extracting structured language data from Wikiquote

A browser application that retrieves proverbs from English Wikiquote's language-specific pages, parses their wikitext, and displays a randomly selected proverb with its language, transliteration, and English translation or equivalent where available.

**Original repository commits:** October 2016 · **Author:** Sascha Coridun  
**Stack:** JavaScript, jQuery 3.1.0, HTML, CSS, MediaWiki API

The original implementation was written without AI coding assistance. This README was refreshed with AI assistance in November 2026; the original JavaScript and commit history are preserved.

## Project overview

The project combines a small web interface with a custom text-processing pipeline. Its central challenge is extracting consistent quote objects from loosely structured, multilingual wikitext.

- Discover pages in Wikiquote's `Proverbs_by_language` category.
- Retrieve page content through the MediaWiki API.
- Extract proverb text, translations, equivalents, and transliterations.
- Normalize selected wiki markup and HTML entities.
- Display a random proverb and change the interface colors on request.
- Provide links to the historical Twitter sharing and Google Translate interfaces.

Translations displayed by the app are extracted from Wikiquote. The Google Translate button opens an external service; the application does not generate translations itself.

## How it works

`Category pages → revision text → list-item filtering → markup normalization → quote objects → browser UI`

The application retrieves category members and divides their IDs into three revision requests. It splits page text into top-level list entries, filters nested fields, removes supported markup, and constructs JavaScript objects.

For most languages, entries must include a recognizable English translation or equivalent. The parser also contains language-specific handling, including Chinese ruby notation and special treatment for English and Kannada entries.

The interface is rendered entirely in the browser. There is no application backend, database, build step, or API key.

## Run locally

With Python 3 installed, start a static server from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [http://localhost:8000](http://localhost:8000). Internet access is needed for Wikiquote requests and externally hosted assets.

**Current status:** historical prototype. The source was reviewed during this documentation refresh, but a successful live API/browser run has not been verified. Serving the files locally does not guarantee that the original external integrations still work.

## Design decisions and limitations

- **JSONP requests:** the original jQuery implementation uses JSONP for cross-origin API access.
- **Heuristic parsing:** regular expressions target the page conventions encountered in 2016. Changed markup and unsupported structures may cause missing or incorrect entries.
- **Fixed request partitioning:** three batches are used rather than dynamic batching and full category pagination. Growth in the category can exceed the original request assumptions.
- **External dependencies:** API response structures, CDN availability, and sharing/translation URL formats can change.
- **Error handling:** the historical implementation lacks robust recovery for failed requests or an empty result set.
- **Attribution in the interface:** quote objects retain page IDs, but the displayed interface does not provide a per-proverb source link. A revived version should expose that provenance.

The repository's [original to-do list](todo.txt) records additional unfinished interface and parsing work.

## Repository guide

| Path | Purpose |
| --- | --- |
| [index.html](index.html) | Page structure and loaded dependencies |
| [script.js](script.js) | Active API, parsing, and interaction code |
| [script1.js](script1.js) | Additional historical script; not loaded by `index.html` |
| [style.css](style.css) | Interface styling |
| [todo.txt](todo.txt) | Original development notes |

## Authorship and history

My contribution is the retrieval/parsing pipeline and web interface. Proverb content and translations come from Wikiquote contributors; jQuery, fonts, and bundled image assets are third-party materials.

- [Original source snapshot](https://github.com/SaschaC/wikiquoteMachine/tree/e8ac4c5a95dc99a969b325eb305fd585366412a6)
- [Development history](https://github.com/SaschaC/wikiquoteMachine/commits/master/)
- [Wikiquote source category](https://en.wikiquote.org/wiki/Category:Proverbs_by_language)

Consult the source pages and relevant third-party terms before reusing content or assets. This documentation refresh does not introduce a software license.


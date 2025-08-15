# NaN•Web DB systen instructions

Every data is a database.

## DB class and document structure

Just connect available data to manage it as it is own.

```js
import DB from "@nan0web/db-fetch"; // extension of abstract "@nan0web/db"
const db = new DB({ host: "https://en.wikipedia.org" });
const page = await db.get("/wiki/Main_Page");
```

Structured data is much easier to become an information.

Root directory global content `_.yaml`

```yaml
title: My Website
$content:
  - Header
  - Content
  - Contacts
  - Footer
$langs:
  - title: English
    locale: en-US
    href: /en/
  - title: Ukrainian
    locale: uk-UA
    href: /uk/
```

Contacts page container `contacts.yaml`:

```yaml
main:
  company:
    address: 1st avenue 17
    tel: +1234567890
```

English version global content `en/_.yaml`

```yaml
$baseHref: /en/
$content:
  - Header
  - Content
  - FreeConsultancy
  - Contacts
  - Footer
tags:
  - database
  - @nan0web/db
desc: Welcome on my website where I share my data that is convertable into information
```

Contacts page `en/laconic.yaml`

```yaml
$content:
  - Content
  - Footer
```

Contacts page `en/contacts.yaml`

```yaml
$ref: laconic
title: My contacts
desc: Contact me when you have questions or propositions
contact:
  $ref: /contacts#main/company
tags:
  - $keep: true
  - contact
  - information
```

For such simple structure we already have some features:

The result for `await db.get("en/contacts")` is combined from hierarcy + globals, + every parent global content

```yaml
$baseHref: /en/
$content:
  - Content
  - Footer
$langs:
  - title: English
    locale: en-US
    href: /en/
  - title: Ukrainian
    locale: uk-UA
    href: /uk/
title: My contacts
desc: Contact me when you have questions or propositions
contact:
  address: 1st avenue 17
  tel: +1234567890
tags:
  - database
  - @nan0web/db
  - contact
  - information
```

If you need only a specific file use `await db.loadDocument("en/contacts")` or `await db.loadDocument("en/_")`

Core relations and functions available for basic database:

1. `Inheritance` — of parent and current directories global content that is saved by uri `/.*\/?_$/`, in file system it could be `_.nano` (`@nan0web/db-fs`) or `_.json` (`@nan0web/db-browser`) or how they are set up, for `@nan0web/db-redis` or `@nan0web/db-mongo` extensions make no sense, but only for data documents, binary documents must loaded, saved as normal CRUD operations.
1. `Scoping` — of variables on directory and all subdirectories levels by storing the documents in `/.*\/?_\/.*/`
1. `Extention` - of other document by defining `$ref: [uri]` property in top level of document.
1. `Referencing` - to other elements by defining `$ref: [uri]` property in any part of document or as value `someKey: "$ref:location.json#memorized/value"` (`uri = "location.json#memorized/value"`), besides top level, otherwise it is called `extension`.

All `[uri]` are relative to current document, so will be resolved from current directory when requesting data.

## Directory class

Directories are not mandatory for databases, but they are present by default.

Every directory can have it's own document that is shared withing all the children data documents with `Inheritance` function. By default it is underscore `_` and with possible extensions, so for the file system database it might be `_.json`, `_.yaml`, `_.yml`, `_.nano`, `_.csv`. In case of redis or mongodb or similar database storages there might be no extensions, so directory data will be stored like `_` or `en/_`. Also for such databases it is possible to have `Directory.File = "/"` but it is not tested yet.

The data can be stored by different loaders and savers that defines by overwritten `loadDocument()` and `saveDocument()`.

```js
class Directory {
	static FILE = "_";
	static INDEX = "index";
	static DATA_EXTNAMES = [".json", ".yaml", ".yml", ".nano", ".csv"];
}
```

## DirectoryIndex class

Instance of the directory index is automatically amending `entries: string[]` That is just names of available nodes (documents and directories), for instance:

```json
{
	"$directory": {
		"maxEntriesOnLoad": 33,
		"entriesColumns": ["name", "mtimeMs.36", "size.36"]
	},
	"entries": [
		["about.json", "mecvlwg9", "8c"],
		["news/index.json", "mecvlwg9", "8c"],
		["products/index.json", "mecvlwg9", "8c"]
	]
}
```

Possible to store indexes in different formats (rows, text, object, array):

```json
{
	"$directory": {
		"maxEntriesOnLoad": 33,
		"entriesAs": "rows",
		"entriesColumns": ["name", "mtimeMs.36", "size.36"]
	},
	"entries": [
		"about.json mecvlwg9 8c",
		"news/index.json mecvlwg9 8c",
		"products/index.json mecvlwg9 8c"
	]
}
```

Possible to store by reference:

```json
{
	"$directory": {
		"maxEntriesOnLoad": 33,
		"entriesAs": "text",
		"entriesColumns": ["name", "mtimeMs.36", "size.36"]
	},
	"entries": "$ref:index.txt"
}
```

```txt
about.json mecvlwg9 8c
news/index.json mecvlwg9 8c
products/index.json mecvlwg9 8c
```

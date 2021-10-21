## What is features2doc?

Forking project [features2](https://bitbucket.org/deovan/features2/).

features2doc is a simple script that **creates HTML and PDF based documentation from Cucumber features**. 
Note that the documentation is **generated from the source Cucumber feature files, and NOT from the test results** (there
are plenty of other tools that can do that).

Use features2 when you want to **create a nice looking requirements specification**, that you can email to your customer.
You can focus on editing the actual feature files and let features2 make the features presentable to your customers.

---
## Usage

yarn run create -i "path-to-features-folder or feature-file" -o "path-output-files" -l "language used in feature files" -p "Your Product Name" -d  "Your Product Description"

### Real world usage

Have a look at the available switches:

```
-i, --input-dir [path]              Read feature files from path. This is required.
-l, --lang [en|string]              Language used in feature files (default: en, more)
-o, --output-file [path]            Send output to folder relative path. This is required.
-a, --author [string]               The author name used in header (default: John Doe)
-b, --break-before-word [string]    Create a line break before every occurrence of this word in the background (default: null)
-d, --product-description [string]  The description of your product used in header (default: My Product Description)')
-g, --generate-pdf [false|true]     Is generate PDF file(default: true)
-h, --help                          Output usage information
-p, --product-name [string]         The name of your product used in headline and header (default: My Product Name)
-t, --templates-dir [path]          Read the template files from path (default: default/templates)
-w, --tags [array]                  Filters the final output to this categories/tag
-m, --date-format [string]          date mask for document date in moment lib format (default: LL)
-V, --version                       Output the version number
-x, --debug                         Output extra debugging

```
---

## Languages Support

You can add more languages in the *translation.json* file under your 2 digit language code. Copy from EN language and modify items following the same syntax in order to support your language.

---
## Template files details

*logo.png* your organization logo or anything you want to put
*doc_template.html* is the main document
*header_template.html* the header for the .pdf pages
*footer_template.html* the footer for the .pdf pages
*cover_template.html* has the document cover
*resume_template.html* prints the table of content
*feature_template.html* has the detailed info of each feature
*style.css* some css tricks
*bulma.css* bulma css support

---
## Categories and tagging support included

In order to categorize your features, you can add categories and tags to your features.
Comments (#like_comment) before de *Feature:* line will be a *Category* in features2doc. Each comment line will be a Category.
Gherkin execution tags (@like_tag) will be treated as *tags* inside *categories*. If no categories found in .feature, tags will be trated as Category.



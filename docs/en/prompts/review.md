# Review Prompts

[🇧🇷 Leia em Português](../../pt-br/prompts/reviews.md)  |  [← Back to Index](../index.md)

---

Prompts for code review, quality analysis, and upgrades.

## Security review

```
Do a full code review of local_meuplugin focused on security:
check for missing capability checks, unescaped output,
unvalidated form parameters, and direct SQL queries.
```

## Coding standards

```
Review local_meuplugin for Moodle coding standard compliance.
Focus on: namespace conventions, method visibility, PHPDoc
completeness, and naming patterns.
```

## Database review

```
Review the database interactions in local_meuplugin.
Check for missing indexes, inefficient queries, and places
where get_records_sql is used instead of get_records.
```

## Performance analysis

```
Analyze local_meuplugin for performance issues:
- N+1 query patterns (loops with get_record inside)
- Missing $DB->get_in_or_equal() for IN queries
- Unindexed columns used in WHERE clauses
- Missing cache layer for expensive queries
```

## PHPDoc generation

```
Load local_meuplugin and generate a PHPDoc block for every
public function and method that is currently missing one.
Use the function signatures and context to write accurate
@param, @return, and @throws tags.
```

## DB upgrade

```
The plugin local_meuplugin needs a DB upgrade:
1. Add column "status" (tinyint, default 0) to local_meuplugin_data
2. Add an index on (userid, status) to local_meuplugin_data
3. Rename column "old_value" to "previous_value" in local_meuplugin_logs

Load the current schema and generate:
1. The upgrade step in db/upgrade.php (detect current version)
2. The updated db/install.xml
3. The updated $plugin->version in version.php
```

## PHPUnit tests

```
Generate a PHPUnit test class for \local_meuplugin\util\data_processor.
Load the plugin context, then generate tests for every public method
using Moodle's advanced_testcase base class.
Include setUp/tearDown, fixtures, and at least 2 test cases per method.
```

## Using the review_plugin prompt

```
review_plugin
  plugin="local/meuplugin"
  focus="security"
```

Focus options: `all` · `security` · `performance` · `standards` · `database` · `apis`

Available as `/review_plugin` slash command in Gemini Code Assist Agent mode.

## Maintaining Context Between Review Sessions

Full reviews may span multiple sessions. To resume a review where you left off:

```
Load the context for local_myplugin.
I'm continuing the security review started yesterday.
Already reviewed: lib.php, db/install.xml, and index.php.
Next: review classes/external/ and classes/task/.
```

Or ask the assistant to save progress:

```
Update CLAUDE.md recording the progress of the local_myplugin review:
files already reviewed and issues found.
```

**Gemini CLI** — to resume the exact session:

```bash
/chat save review-local-myplugin
# Next session:
/chat resume review-local-myplugin
```


---

[← Back to Index](../index.md)

🌐 [Português](../../pt-br/prompts/reviews.md) | **English**
🏠 [Home](../index.md)

# Review Prompts (Code Review)

These prompts are designed to perform technical audits, quality analysis, and assist in upgrade processes of existing plugins.

---

## 🔒 Security Review

Use this prompt to find common vulnerabilities in Moodle.

**Example Prompt:**

> "Perform a complete code review of the plugin `local_myplugin` with a focus on security: check for missing capability checks (`has_capability`), unescaped output (`s()` or `format_text`), unvalidated form parameters, and direct SQL queries."

---

## 📏 Code Standards and Quality

Ensure your plugin would pass a Moodle Plugins Directory check.

**Example Prompt:**

> "Review `local_myplugin` for compliance with the Moodle coding standard. Focus on: namespaces, method visibility, PHPDoc completeness, and naming conventions (Frankenstyle)."

---

## 🗄️ Database Optimization

Avoid database performance bottlenecks.

**Example Prompt:**

> "Review database interactions in `local_myplugin`. Check for missing indexes, inefficient queries, and places where `get_records_sql` is unnecessarily used instead of `get_records`."

---

## ⚡ Version Upgrade (Example: Database)

Automate the creation of upgrade scripts.

**Example Prompt:**

> "The plugin `local_myplugin` needs an upgrade:
>
> 1. Add column 'status' (tinyint, default 0) to `local_myplugin_data`.
> 2. Add an index on (userid, status).
>    Generate the upgrade step in `db/upgrade.php`, the updated `db/install.xml`, and the new `$plugin->version`."

---

## 🧪 PHPUnit Test Generation

Ideal for ensuring code stability.

**Example Prompt:**

> "Generate a PHPUnit test class for `\local_myplugin\util\data_processor`. Use Moodle’s `advanced_testcase` base class and include at least 2 test cases per method."

---

## 🛠️ Using the `review_plugin` Tool

In Gemini Agent mode or Claude, you can be direct:

```bash
review_plugin
  plugin="local/myplugin"
  focus="security"
```

Focus options: all, security, performance, standards, database, apis.

[← Back to Index](../index.md)

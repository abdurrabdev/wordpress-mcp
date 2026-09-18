# Xhunta WordPress MCP

Production-oriented FastAPI MCP gateway for WordPress and WooCommerce.

## What it provides

- WordPress pages and posts
- Media library and media metadata
- WooCommerce products and categories
- Yoast SEO meta operations where the WordPress REST API exposes the relevant meta
- Site inspection
- Multiple WordPress site profiles
- Browser admin dashboard
- Site switching
- Connection testing
- Activity logging
- Safe defaults: create operations default to draft
- No destructive delete tools exposed to MCP clients

## Architecture

AI client -> MCP -> active WordPress site

Gemini, Claude, Cursor and GitHub Copilot do not need to know the WordPress username/application password. They only connect to the MCP server.

## Local setup

Python 3.11+ recommended.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set:

```env
APP_ENV=production
APP_SECRET_KEY=replace_with_a_long_random_secret
WP_BASE_URL=https://xhunta.com
WP_USERNAME=...
WP_APP_PASSWORD=...
MCP_AUTH_TOKEN=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
```

Run:

```bash
uvicorn main:app --reload --port 8000
```

Open:

- `/admin`
- `/health`
- MCP SSE endpoint: `/mcp`

## FastAPI Cloud

Deploy the repository as a FastAPI application. Configure all secrets as platform environment variables.

Do not commit `.env`.

## Site switching

The first configured site is bootstrapped from `.env`.

After startup, use:

`/admin/sites`

to add, edit, test and activate WordPress sites.

The active site is the target used by MCP tools.

## Authentication

The admin dashboard uses a separate admin password.

The application itself protects `/mcp` with `Authorization: Bearer <MCP_AUTH_TOKEN>`. Do not send WordPress credentials to AI clients.

AI clients should store the MCP token in their own secret/credential configuration. Never commit the token to Git.

If you put an additional proxy/API gateway in front of FastAPI Cloud, it may enforce the same or stronger authentication.

## Yoast SEO

Yoast SEO fields are stored as WordPress post meta. The exact fields exposed through REST depend on Yoast/version and REST meta registration.

Use:

- `yoast_get_seo`
- `yoast_update_seo`

The tool reports the meta keys actually exposed by the site and surfaces REST errors rather than claiming a change succeeded.

## Important production note

SQLite is fine for a simple single-instance deployment only if its file is on persistent storage. If FastAPI Cloud instances are ephemeral or horizontally scaled, use persistent storage/PostgreSQL for the site profiles and logs.

## MCP clients

Configure clients with the deployed MCP URL, for example:

`https://YOUR-MCP-DOMAIN/mcp`

Client authentication is handled by the client/platform according to its MCP configuration. Keep `MCP_AUTH_TOKEN` server-side and do not confuse it with the WordPress Application Password.

## Recommended AI workflow

Ask an agent to:

1. Inspect the site.
2. Find the exact page/product/category.
3. Read the current content.
4. Propose or apply a targeted change.
5. Preserve existing Gutenberg/Kadence markup unless explicitly asked to rebuild it.
6. Verify the API response.

This avoids replacing the entire site when only one section needs modification.

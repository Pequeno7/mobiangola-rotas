<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## MobiAngola project rules

- The routing engine in `src/lib/routing/` stays pure (no database, UI or network imports) so the web app, the public API and tests share one implementation.
- The web app and `/api/public/v1/*` both load data through `src/lib/network.ts`; add new data fields there first.
- Public API responses use Portuguese snake_case keys and are versioned under `/v1`; breaking changes go to a new version because the external Android (Kivy) client depends on them.
- Never fabricate transit data: missing times/fares stay `null` and demo or unverified data carries explicit flags (`is_demo`, `verified`) that the UI must surface.
- Leaflet is imported dynamically inside `TransitMap` effects because it touches `window`; map colors come from CSS classes using design tokens, not inline colors.
- Admin writes are gated by RLS with `has_role(auth.uid(), 'admin')`; roles live only in `user_roles`.

# Cloudflare Pages

AI Nuggets is a static site, so Cloudflare Pages can publish the repository without a build step.

## Recommended Git deployment

Create a Cloudflare Pages project connected to the GitHub repository and use:

| Setting | Value |
|---|---|
| Expected account email | `ainuggets123@gmail.com` |
| Cloudflare account ID | `b0253ba555b02a254367db91ab9c0b0b` |
| Production branch | `main` |
| Framework preset | None |
| Build command | Leave empty |
| Build output directory | `.` |

Cloudflare will deploy every push to `main` and create preview deployments for other branches and pull requests.

## OAuth deployment

Wrangler supports interactive browser OAuth for deployments from a trusted developer machine. Authenticate once from the repository root:

```powershell
.\infra\cloudflare\login.ps1
```

Cloudflare opens a browser authorization page and stores the resulting credentials in Wrangler's user-level configuration outside this repository. Deploy afterward with:

```powershell
.\infra\cloudflare\deploy.ps1
```

The login and deployment scripts read the expected email and account ID from `config.json` and stop if Wrangler is authenticated to a different account. The OAuth token itself remains in Wrangler's machine-local credential store. `.assetsignore` prevents repository-only files such as infrastructure scripts and documentation from being published as site assets.

## Information required

- A Cloudflare user account authorized through the browser OAuth flow
- Cloudflare Pages project name (`ai-nuggets` by default)
- GitHub repository access through the Cloudflare Git integration
- Production branch (`main` by default)
- Optional custom domain and the Cloudflare zone that owns it

If the Cloudflare user belongs to multiple accounts, Wrangler may ask which account owns the Pages project. No API token is needed for local OAuth deployment.

Non-interactive CI cannot complete a browser OAuth prompt. CI deployments should use Cloudflare's GitHub integration, or a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` stored as CI secrets.

Git integration remains preferred for automatic deployments because its GitHub authorization is also OAuth-based and Cloudflare manages the deployment credentials.

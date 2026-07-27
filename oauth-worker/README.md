# OAuth backend for /admin (Decap CMS)

GitHub OAuth requires a client secret to be exchanged server-side — it can't
be done from static HTML alone. This tiny Cloudflare Worker does just that
exchange, then hands the resulting token back to the `/admin` page.

## One-time setup

1. **Create a GitHub OAuth App**: https://github.com/settings/developers → "New OAuth App"
   - Application name: `Karachi Jumma Biryani CMS`
   - Homepage URL: `https://kjbiryani.com/admin/`
   - Authorization callback URL: `https://<your-worker-subdomain>.workers.dev/callback`
     (or your custom domain if you route one to this Worker, e.g. `https://oauth.kjbiryani.com/callback`)
   - Save it, note the **Client ID** and generate a **Client Secret**.

2. **Deploy the Worker** (from this `oauth-worker/` folder):
   ```
   npm install -g wrangler   # if you don't have it yet
   wrangler login
   wrangler deploy
   ```

3. **Set the secret** (never commit this):
   ```
   wrangler secret put GITHUB_CLIENT_SECRET
   ```
   Paste the Client Secret from step 1 when prompted.

4. **Set the Client ID** — either edit `wrangler.toml`'s `GITHUB_CLIENT_ID` and
   redeploy, or `wrangler secret put GITHUB_CLIENT_ID` instead (either works;
   it's not sensitive, but secrets work fine too).

5. **Point `/admin/config.yml` at your Worker**: update `backend.base_url` in
   `admin/config.yml` (repo root) to your deployed Worker's URL, e.g.
   `https://kjbiryani-oauth.<your-subdomain>.workers.dev`.

## Who can actually publish?

Anyone can log in with their own GitHub account, but GitHub itself will
reject any commit/PR attempt from an account that doesn't have write access
to `karachi-jumma-biryani/menu`. So access control lives in the repo's
**Settings → Collaborators**, not in this Worker or in Decap CMS.

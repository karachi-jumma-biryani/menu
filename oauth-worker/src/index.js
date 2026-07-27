// Minimal GitHub OAuth backend for Decap CMS, implementing the two routes
// Decap's GitHub backend expects from a self-hosted OAuth client:
//   GET /auth              -> redirects to GitHub's authorize screen
//   GET /callback?code=... -> exchanges the code for a token, hands it back
//                             to the /admin window via postMessage
//
// Deploy with `wrangler deploy` from this folder, then:
//   wrangler secret put GITHUB_CLIENT_SECRET
// and set GITHUB_CLIENT_ID in wrangler.toml (or as a secret too, either works).

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function randomState() {
  return crypto.randomUUID();
}

function htmlResponse(body) {
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/callback`;
  const state = randomState();

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo,user");
  authorizeUrl.searchParams.set("state", state);

  return Response.redirect(authorizeUrl.toString(), 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing ?code from GitHub", { status: 400 });
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return htmlResponse(
      `<p>GitHub authorization failed: ${
        tokenData.error_description || tokenData.error || "unknown error"
      }</p>`
    );
  }

  const payload = JSON.stringify({
    token: tokenData.access_token,
    provider: "github",
  });

  // Decap's documented postMessage handshake: the popup waits for a "hello"
  // message from the opener (/admin), then replies once with the token.
  const script = `
    <script>
      (function() {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:${payload.replace(/'/g, "\\'")}',
            e.origin
          );
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  `;

  return htmlResponse(
    `<!DOCTYPE html><html><body>Authorized. You can close this window.${script}</body></html>`
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") return handleAuth(request, env);
    if (url.pathname === "/callback") return handleCallback(request, env);

    return new Response("Karachi Jumma Biryani OAuth worker — see /auth", {
      status: 200,
    });
  },
};

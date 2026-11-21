# Encrypted API V2

Set `NEXT_PUBLIC_API_VERSION=v2` to enable automatic encrypted transport in the application's API activity provider. Restart/rebuild after changing this public setting. Existing `/api/*` endpoints remain available for compatibility.

Before enabling, run `npx tsx scripts/generate-api-v2-key.ts`. Store the generated PEM in the server-only `API_V2_PRIVATE_KEY` environment variable (literal `\n` separators are supported). Never commit or expose the private key. Use the same private key across server instances.

The client obtains an RSA-OAEP SHA-256 public key from `/api/v2/key`, creates a fresh AES-256-GCM key for each request, and wraps it with RSA. It sends the encrypted original path, query, method, content type and body to `POST /api/v2`. The server decrypts these values and invokes an explicitly allowed existing route, preserving its authentication, permissions, tenant checks and validation. Responses, including application errors, are encrypted with the request key and a fresh IV. The client restores a normal Response so existing `.json()`, `.blob()` and status handling work. Multipart uploads are preserved as bytes.

Only public key discovery and invalid-envelope/origin errors are plaintext. Configuration or protocol failures fail closed without retrying a mutation. HTTPS remains required: browser code and users can inspect decrypted data, and this layer does not replace TLS or authorization. Requests expire after 60 seconds; this is not a durable replay or idempotency mechanism. V1 endpoints remain accessible; enabling the browser setting does not enforce V2 for third-party callers.

Add new API routes to `lib/http/v2-routes.ts`. It is an explicit allowlist rather than an arbitrary HTTP proxy. The endpoint has a 24 MiB encoded envelope limit; base64 encryption adds overhead to uploads. Reverse proxies should also enforce request body limits.

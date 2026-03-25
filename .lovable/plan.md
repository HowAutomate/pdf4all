

## Embed UGC App via iframe

Since the UGC project is a full standalone app with its own auth and Supabase backend, the simplest way to serve it under `tools.howautomate.com/ugc-content` is to embed it in an iframe.

### Steps

1. **Publish the UGC project** — Make sure [Image2Media Magic](/projects/379e3402-3c22-48f9-8e56-4371016e0fe8) is published (it should have a `.lovable.app` URL or custom domain).

2. **Create `src/pages/UgcContent.tsx`** — A simple page with a full-screen iframe pointing to the published UGC app URL. Include a header bar matching the other tool pages with a "Back to Tools" link.

3. **Update `src/App.tsx`** — Add route `/ugc-content` pointing to the new `UgcContent` page.

4. **Update `src/pages/Home.tsx`** — Change the UGC tool card from an external link to an internal `<Link to="/ugc-content">` route.

### Technical notes
- The iframe approach means auth and all UGC functionality work as-is — no code migration needed.
- The URL bar will show `tools.howautomate.com/ugc-content` cleanly.
- Alternative: If you'd prefer a fully separate subdomain (`ugc.howautomate.com`) instead, you can publish and connect a custom domain to the UGC project directly — no code changes needed here.


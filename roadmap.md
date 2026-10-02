# Roadmap

- [x] Add OPENAI_API_KEY fallback in `src/lib/ai-gateway.server.ts` for self-hosted (Cloudflare) deployments when LOVABLE_API_KEY is absent; removed conflicting `max_completion_tokens` param
- [x] Fix pre-existing typecheck error in `src/routes/__root.tsx` (error prop typed `unknown` by router)
- [x] Typecheck passes
- [ ] User creates an OpenAI API key and adds `OPENAI_API_KEY` as an env variable in their Cloudflare project, then redeploys

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Project Structure

This project is organized around a small set of responsibilities so UI, remote data, and server code stay separated.

### Main folders

- `app/`
  - App Router pages, layouts, and API route handlers.
  - Route handlers under `app/api/*` are the server boundary for database and AI operations.
- `app/components/`
  - Reusable UI components, modal flows, cards, tables, and page-level client components.
- `hooks/`
  - Client-side React Query hooks and reusable data-access hooks.
  - Prefer consuming remote data through hooks instead of calling `fetch()` directly in pages/components.
- `lib/api/`
  - Centralized client-side API helpers.
  - New browser-side requests should be added here first, then used from hooks/components.
- `lib/ai/`
  - AI prompt, schema, runtime, and feature logic.
- `lib/`
  - Shared utilities such as auth, date helpers, Prisma setup, notifications, and query provider setup.
- `stores/`
  - Zustand stores for UI state only, such as modal visibility, selected entities, and top-bar controls.
- `types/`
  - Shared domain and API response types.
- `prisma/`
  - Prisma schema, migrations, and seed scripts.

### Data flow conventions

To keep querying and state logic more centralized:

1. Use `lib/api/*` as the transport layer.
   - Shared request helpers belong here.
   - Components should avoid constructing request URLs inline when a domain helper exists.
2. Use React Query hooks for server state.
   - Query hooks in `hooks/` should own cache keys and read access.
   - Mutation helpers should invalidate related query keys instead of manually forcing refreshes where possible.
3. Keep Zustand focused on UI state.
   - Good fit: modal open/close state, selected IDs, temporary layout controls.
   - Avoid storing fetched server data in Zustand when React Query already owns it.
4. Prefer one query key per resource shape.
   - Example: a single appointment detail key should be reused everywhere instead of multiple keys for the same endpoint.

### Current standardization direction

The codebase is being standardized toward:

- `lib/api/*` for request functions
- `hooks/*` for React Query wrappers around those request functions
- `stores/*` for UI-only global state
- `app/components/*` and `app/*` for rendering and user interaction

When adding a new feature, the preferred order is:

1. Add or extend the request helper in `lib/api/*`.
2. Add or extend the query/mutation hook in `hooks/*`.
3. Use that hook in the page or component.

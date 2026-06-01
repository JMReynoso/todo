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

## Demo mode

Setting the build-time flag `NEXT_PUBLIC_DEMO=1` produces a **frontend-only
demo build** that runs entirely in the browser — no API, database, or auth:

- `apiFetch` is served by an in-browser mock backed by `localStorage` and
  seeded from `app/_data/seed.ts` (see `app/_lib/demo/`). Edits persist per
  visitor and reset when they clear storage.
- Auth is bypassed: every visitor is auto-signed-in as a demo user, and the
  `/login` route redirects into the app.

Run it locally:

```bash
NEXT_PUBLIC_DEMO=1 pnpm build && NEXT_PUBLIC_DEMO=1 pnpm start
```

The demo deploys as the `web-demo` service in `infra/docker-compose.prod.yml`
(port 3101), built from the same source as production so it tracks every
change merged to `main`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

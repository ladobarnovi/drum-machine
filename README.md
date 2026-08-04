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

## Offline use

The app is a progressive web app: it can be installed from the browser and then
runs with no network at all, samples included. Everything in the export —
the page, the JS and CSS chunks, and the 909 kit — is downloaded by a service
worker when the app is first opened, so the preset works offline even if it was
never loaded while online.

The worker's precache list is written into `public/sw.js` after the build by
`scripts/build-service-worker.mjs`, which reads the actual contents of `out/`.
It is only registered in production builds, so `npm run dev` is never served
from a cache. To exercise it locally:

```bash
npm run build && npm run serve
```

`next start` cannot serve a static export, hence `npm run serve` — a small
static server on port 3001. Stopping it while the tab stays open is the
simplest way to check the offline path.

The icons are drawn by `scripts/generate-icons.mjs`; run `npm run icons` after
changing it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

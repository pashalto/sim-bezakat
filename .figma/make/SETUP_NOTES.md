# Initial import setup notes

## Ready

- Bootstrap passes with the app kept in `sim-bezakat-source`.
- The root lifecycle scripts install from the frozen pnpm lockfile and run the
  nested Next.js development server on the supervised `$PORT`.
- Deploy and deploy-preview scripts preserve the generated Payload/Next.js
  `.next` output and `aws/lambda/nextjs` adapter contract.

## Deployment blocker

`figma make verify-deploy` and `figma make verify-deploy-preview` both reach the
production build, but the platform build stops with:

> Environment ID could not be resolved. Set FIGMA_EID or initialize the project.

The imported Payload project needs its Figma-managed backend environment
connected or initialized for this Make file. `FIGMA_EID` is platform-owned and
must not be fabricated, stored in repository files, or requested as a
user-managed environment variable.

After the backend environment is available, rerun:

```sh
figma make verify-deploy
figma make verify-deploy-preview
```

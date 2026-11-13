# Working on this repo

- After every change, commit and push to the remote branch straight away. Don't ask first and don't leave work uncommitted.
- Before pushing, run `npm run check` (type check) and `npm run build`, and fix any errors.
- Don't commit `.env` or the local database (`prisma/*.db`). Both are in `.gitignore`.
- See README.md for how the app is set up and run.
- Keep the folder structure in README.md ("Folder structure"). Backend logic goes in `src/server/features/<feature>/` (`service.ts` writes, `queries.ts` reads); every HTTP endpoint is a `route.ts` under `src/app/api/`; screens in `src/app/(app)/<screen>/` never touch the database and call the API through `src/client/api/`; shared plain helpers go in `src/lib/`. `npm run check` enforces this, so fix what it reports instead of working around it.
- When you add a feature or endpoint, update the folder tree and the API list in README.md, and add checks to `scripts/test-api.ts`. Run `npm run test:api` after `npm run build` for anything that touches the API.

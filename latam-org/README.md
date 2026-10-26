# React + Vite

## Guías administradas en Supabase

Las guías públicas guardadas en Supabase aparecen en `/guias` junto con las guías Markdown de `src/content/guias/`. Si ambas fuentes tienen el mismo slug, se muestra la versión de Supabase. Las guías de Supabase se sirven en tiempo de ejecución y todavía no se incluyen en `public/sitemap.xml`, que se genera durante el build. Para que los buscadores las encuentren, habrá que añadir generación dinámica del sitemap o un endpoint de sitemap que consulte Supabase.

Las guías públicas de `src/content/guias/` y las privadas de ejemplo en `private-content/` se importan una vez, después de que el admin haya iniciado sesión, ejecutando `node --env-file=.env netlify/scripts/seed-guides.mjs` dentro de `latam-org/`. El importador usa `DEFAULT_ADMIN_ID` si `ADMIN_DISCORD_ID` no está configurado. Los slugs no válidos se normalizan (por ejemplo, `Primeros pasos` pasa a `Primeros-pasos`). El importador conserva las guías que ya existan en Supabase con la misma sección y slug.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

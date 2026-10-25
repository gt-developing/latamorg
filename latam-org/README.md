# LATAM Org

Sitio de la comunidad hispanohablante de Star Citizen. La aplicación usa React,
Vite, Tailwind CSS y Netlify Functions.

## Desarrollo

Desde la raíz del repositorio:

```bash
npm --prefix latam-org install
npm --prefix latam-org run dev:api
```

El frontend sin API puede ejecutarse con `npm --prefix latam-org run dev`.

## Variables de entorno

La función serverless necesita `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`SESSION_SECRET`, `SITE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y opcionalmente
`ADMIN_DISCORD_ID`. La clave `SUPABASE_SECRET_KEY` solo debe configurarse en el
entorno server-side de Netlify; nunca debe llevar prefijo `VITE_`.

## Guías

Las guías públicas y privadas se almacenan en la tabla `guides` de Supabase. Para
cargar el contenido Markdown existente una vez:

```bash
npm --prefix latam-org run seed-guides
```

El script lee `src/content/` y `private-content/`; no debe ejecutarse sin las
variables de Supabase configuradas. El contenido público se muestra bajo `/guias`.
La generación del sitemap sigue siendo parte del build y todavía no incluye
automáticamente las guías creadas desde el dashboard.

## Validación

```bash
npm --prefix latam-org test
npm --prefix latam-org run lint
npm --prefix latam-org run build
```

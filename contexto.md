# Tarea: migrar LATAM Org de Netlify Blobs a Supabase y añadir guías editables y eventos

Eres el agente de desarrollo de este repositorio. Lee este documento completo antes de tocar código. Trabaja por fases, en orden, y detente al final de cada fase para que el usuario verifique.

## 0. Reglas de trabajo

- Lee cada archivo completo antes de editarlo. No asumas su contenido: este documento describe el proyecto de forma resumida.
- La aplicación vive en `latam-org/`. Los comandos se ejecutan con `npm --prefix latam-org ...` desde la raíz.
- No leas, muestres, copies ni modifiques `latam-org/.env`. No imprimas valores de variables de entorno en logs ni en la salida.
- No hagas commit de secretos. Verifica que `.env` sigue en `.gitignore`.
- Al terminar cada fase ejecuta `npm --prefix latam-org run lint` y `npm --prefix latam-org run build`, y resume qué cambió y qué debe probar el usuario.
- No introduzcas advertencias nuevas de Oxlint. Las existentes (Footer.jsx, AuthContext.jsx, PrivateGuide.jsx, PrivateGuides.jsx) no son parte de esta tarea.
- Si una decisión es ambigua y cambia el comportamiento visible, pregunta al usuario en lugar de adivinar.
- Responde y comenta el código en español, igual que el resto del proyecto.

## 1. Estado actual del proyecto

SPA React 19 + Vite + React Router + Tailwind 4, desplegada en Netlify. La API es una sola función serverless:

- `netlify/functions/api.mjs`: entrada de `/api/*`. Llama a `createHandler({ store, env: process.env, privateGuides })`.
- `netlify/lib/handler.mjs`: toda la lógica HTTP (auth, guías privadas, admin).
- `netlify/lib/session.mjs`: cookies firmadas con HMAC-SHA256 (`latam_session`, 7 días, HttpOnly, SameSite=Lax). **No cambiar.**
- `shared/access.mjs`: `ROLES`, `ROLE_IDS`, `SUBADMIN_ROLE_ID = 'subadmins'`, `DEFAULT_ADMIN_ID`.
- `scripts/generate-private.mjs`: genera `netlify/lib/private-guides.generated.mjs` desde `private-content/<rol>/*.md` durante el build.
- Contenido público actual: Markdown en `src/content/{guias,recursos}`, compilado por Vite (`src/lib/content.js`).
- `src/context/AuthContext.jsx` consulta `/api/me`.
- `src/pages/Admin.jsx`: gestión de usuarios y roles.

Endpoints actuales (conservar contrato y códigos 401/403/404/500):

```text
GET  /api/auth/login
GET  /api/auth/callback
POST /api/auth/logout
GET  /api/me
GET  /api/private/guides
GET  /api/private/guides/:role/:slug
GET  /api/admin/users
PUT  /api/admin/users/:id/roles
```

Hoy los usuarios se guardan en Netlify Blobs (`getStore({ name: 'users', consistency: 'strong' })`), con clave = ID de Discord y esta forma:

```js
{ id, username, name, avatar, roles: [], firstSeen, lastLogin }
```

## 2. Estado de Supabase

El esquema **ya está creado** en el proyecto de Supabase del usuario. No lo vuelvas a ejecutar ni lo modifiques sin avisar. Si necesitas un cambio de esquema, escríbelo como un archivo SQL nuevo (por ejemplo `supabase/migrations/NNN_descripcion.sql`) y pide al usuario que lo ejecute.

Variables de entorno (ya definidas en `.env` y en Netlify; solo el backend las usa):

```text
SUPABASE_URL
SUPABASE_SECRET_KEY      # clave privilegiada formato sb_secret_..., ignora RLS
```

**Nunca** uses el prefijo `VITE_` con estas variables ni las importes desde `src/`. La clave solo se usa dentro de `netlify/`.

Tablas (todas con RLS activado y sin políticas: solo la secret key accede):

```text
sections(id text pk, label text)
  -- militar, transporte, mineria, exploracion, ingenieria, reciclaje, void-enforcers
  -- 'subadmins' NO es sección

users(id text pk [ID Discord], username, name, avatar, roles text[] default '{}',
      first_seen timestamptz, last_login timestamptz)

section_permissions(user_id fk users, section_id fk sections,
      can_publish_guides bool, can_manage_events bool, granted_by fk users,
      created_at, pk (user_id, section_id))

guides(id uuid pk, section_id fk sections NULL=pública, slug, title, description,
      image, body, status 'draft'|'published', author_id fk users,
      created_at, updated_at, published_at)
  -- slug único por sección (las públicas comparten espacio); slug ~ '^[A-Za-z0-9_-]+$'
  -- check: status='published' exige published_at

events(id uuid pk, section_id fk sections NULL=público, title, description, location,
      starts_at timestamptz, ends_at, capacity int NULL, cancelled bool,
      created_by fk users, created_at, updated_at)

event_rsvps(event_id fk events, user_id fk users,
      status 'going'|'maybe'|'declined', responded_at, pk (event_id, user_id))
```

No se migran datos de Blobs: los únicos usuarios eran la cuenta del propietario y una cuenta secundaria, que se recrean al iniciar sesión de nuevo.

## 3. Modelo de permisos (aplicar siempre en el backend)

| Nivel | Cómo se determina | Alcance |
|---|---|---|
| Admin | `session.user.id === ADMIN_DISCORD_ID` (env) o `DEFAULT_ADMIN_ID` como respaldo. **No se guarda en BD.** | Todo, incluido asignar `subadmins`. Nadie puede modificarlo. |
| Subadmin | `'subadmins'` en `users.roles` | Leer todo, gestionar usuarios, publicar guías y gestionar eventos en todas las secciones y en el contenido público. No puede asignar `subadmins` ni tocar al admin. |
| Editor de sección | Fila en `section_permissions` | Solo en esa sección: `can_publish_guides` y/o `can_manage_events`. |
| Miembro | Rol en `users.roles` | Lee guías y eventos privados de esa sección. |
| Visitante | Sin sesión | Solo contenido público. |

Reglas:

- Los permisos se leen de la BD en **cada petición** (como hoy con los roles), para que los cambios tengan efecto inmediato. No los cachees en la cookie.
- Un editor de sección debería tener también el rol de lectura de esa sección. Al asignar un permiso de escritura, comprueba que el usuario tenga ese rol o añádelo.
- Publicar o editar contenido público (`section_id` NULL) y crear eventos públicos: solo admin y subadmins.
- Crea las funciones puras `canReadSection`, `canPublishGuides`, `canManageEvents`, `canManageUsers` en un módulo compartido (por ejemplo `shared/permissions.mjs`) y escribe pruebas con `node:test` para ellas (añade un script `test` a `package.json`). Cubre los casos admin, subadmin, editor, miembro, visitante y los intentos de escalada.

---

## FASE 1: reemplazar Blobs por Supabase (sin cambiar funcionalidad)

Objetivo: que todo funcione igual que hoy, pero con Supabase como almacenamiento de usuarios.

1. Instala `@supabase/supabase-js` en `latam-org/`.
2. Crea `netlify/lib/db.mjs` que exporte una función para crear el cliente:
   ```js
   createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
     auth: { persistSession: false, autoRefreshToken: false },
   })
   ```
   Falla con un error claro (sin imprimir valores) si faltan las variables.
3. Sustituye el `store` de Blobs por un repositorio de usuarios respaldado por Supabase. Mantén la inyección de dependencias que ya usa `createHandler`, para que el handler siga siendo testeable.
4. Mapeo de campos: la BD usa `first_seen` y `last_login`, pero **las respuestas de la API deben conservar la forma actual** (`firstSeen`, `lastLogin`) para no romper el frontend.
5. Login (callback de Discord): haz `upsert` del usuario con `id`, `username`, `name`, `avatar`, `last_login`. **No incluyas `roles` ni `first_seen` en el upsert**, para no pisar los roles existentes ni la fecha de primer acceso.
6. `GET /api/admin/users` lee todos los usuarios; `PUT /api/admin/users/:id/roles` actualiza `roles`. Mantén todas las validaciones actuales (IDs, roles válidos, JSON, Content-Type, restricciones sobre `subadmins` y el admin).
7. Maneja errores de Supabase devolviendo 500 genérico al cliente y registrando solo el mensaje técnico en el servidor, nunca claves ni datos sensibles.
8. Elimina la dependencia y el import de `@netlify/blobs` cuando ya no se use.

Criterio de aceptación: iniciar sesión, ver `/api/me`, abrir `/admin`, asignar y quitar roles y ver guías privadas funciona como antes. Los usuarios aparecen en la tabla `users` de Supabase.

**Detente aquí** y pide al usuario que pruebe el login y el panel de administración antes de pasar a la fase 2.

---

## FASE 2: guías editables desde el dashboard

Objetivo: usuarios con permiso pueden crear, editar y publicar guías desde la web, y se guardan en Supabase sin necesidad de un nuevo build.

Backend (nuevos endpoints; todos validan sesión y permisos en el servidor):

```text
GET    /api/guides                    # guías públicas publicadas (metadatos)
GET    /api/guides/:slug              # guía pública publicada (con cuerpo)
GET    /api/private/guides            # (existente) ahora desde BD, solo secciones permitidas
GET    /api/private/guides/:role/:slug# (existente) ahora desde BD
GET    /api/dashboard/guides          # guías que el usuario puede gestionar (incluye borradores)
POST   /api/dashboard/guides          # crear
GET    /api/dashboard/guides/:id      # obtener una (con cuerpo) para editar
PUT    /api/dashboard/guides/:id      # actualizar
POST   /api/dashboard/guides/:id/publish    # publicar / despublicar
DELETE /api/dashboard/guides/:id      # eliminar
```

Reglas de backend:

- Mantén las respuestas actuales de `/api/private/guides*` (misma forma de datos, `roleLabel` incluido) para no romper `PrivateGuides.jsx` y `PrivateGuide.jsx`. Las listas **nunca** incluyen `body`; el cuerpo solo se entrega al pedir una guía concreta.
- Los borradores solo son visibles para su autor y para quienes pueden publicar en esa sección.
- Validación de entrada: `slug` con `^[A-Za-z0-9_-]+$`, `title` 1 a 200 caracteres, `description` hasta 500, `body` con un tope razonable (por ejemplo 200 KB), `image` solo URL `https://` o vacía, `status` solo `draft` o `published`, `section_id` debe existir en `sections` o ser null.
- Controla el conflicto de slug duplicado (índice único) y devuelve 409 con mensaje claro.
- Al publicar, rellena `published_at`. `updated_at` lo gestiona el trigger.
- `section_id` null (público) exige admin o subadmin.
- `/api/me` debe devolver además las secciones donde el usuario puede publicar guías y gestionar eventos (por ejemplo `permissions: { publishGuides: [...], manageEvents: [...] }`), para que el frontend muestre u oculte la UI. Recuerda que ocultar en React no es seguridad: el backend valida siempre.
- Añade endpoints de administración para conceder y revocar permisos de escritura (`section_permissions`), accesibles solo a admin y subadmins, y respeta que un subadmin no puede escalar privilegios.

Frontend:

- Rutas nuevas bajo `/dashboard` (define las rutas estáticas antes de las dinámicas `/:section`, y confirma que no chocan): lista de mis guías, editor de guía (título, descripción, imagen, sección, slug, cuerpo en Markdown con vista previa, guardar borrador, publicar).
- Añade el acceso al dashboard en `Header.jsx` / `UserMenu.jsx` solo si el usuario tiene algún permiso de escritura.
- Extiende `Admin.jsx` (o crea una pestaña) para gestionar los permisos de escritura por usuario y sección.
- Mantén el estilo visual existente (tema `space-*`, `accent`, utilidad `px-global`).
- Las guías públicas de la BD deben aparecer en las listas públicas junto a las de Markdown del repo. Pregunta al usuario si prefiere que ambas fuentes convivan o migrar las existentes a la BD.

Seguridad del Markdown:

- Renderiza con `react-markdown` **sin** `rehype-raw` ni HTML crudo. No uses `dangerouslySetInnerHTML`.
- Valida y restringe los enlaces e imágenes del Markdown (esquemas `http`/`https`; bloquea `javascript:`).

Limpieza (solo cuando todo lo anterior funcione):

- Siembra las guías privadas de ejemplo existentes con un script de una sola vez (`scripts/seed-guides.mjs`) leyendo `private-content/`, si el usuario quiere conservarlas.
- Después elimina `scripts/generate-private.mjs`, `netlify/lib/private-guides.generated.mjs` de la tubería, el paso correspondiente en los scripts `build` y `dev:api`, y la carpeta `private-content/` (confirma antes con el usuario). Actualiza `api.mjs` y `.gitignore`.
- Nota: el sitemap se genera en build, así que las guías públicas de la BD no aparecerán en él. Documenta esa limitación o propón una solución.

**Detente aquí** para verificación.

---

## FASE 3: eventos con confirmación de asistencia

Objetivo: eventos públicos o privados por sección, con RSVP de los usuarios.

Backend:

```text
GET    /api/events                     # próximos eventos visibles para el usuario
GET    /api/events/:id                 # detalle + mi RSVP + conteos
PUT    /api/events/:id/rsvp            # { status: 'going' | 'maybe' | 'declined' } (upsert)
DELETE /api/events/:id/rsvp            # retirar mi respuesta
GET    /api/events/:id/attendees       # lista de asistentes (solo quien gestiona el evento)
POST   /api/dashboard/events           # crear
PUT    /api/dashboard/events/:id       # editar
POST   /api/dashboard/events/:id/cancel# cancelar
DELETE /api/dashboard/events/:id       # eliminar
```

Reglas:

- Visibilidad: eventos con `section_id` null son públicos y se pueden listar sin sesión. Los eventos de sección solo los ven miembros de esa sección, admin y subadmins. Un evento privado al que el usuario no tiene acceso responde 404 (no 403), para no revelar su existencia.
- RSVP exige sesión y acceso de lectura al evento. Una sola respuesta por usuario (upsert sobre la clave primaria).
- No permitas RSVP en eventos cancelados o ya terminados.
- Si hay `capacity`, valida en el servidor que los `going` no la superen (cuida la condición de carrera, por ejemplo con una función SQL o transacción; si hace falta SQL nuevo, entrégalo como archivo de migración).
- Crear y gestionar eventos: admin, subadmins o editores con `can_manage_events` en esa sección. Eventos públicos: solo admin y subadmins.
- Valida: `title` 1 a 200, `description` hasta 5000, `starts_at` fecha válida, `ends_at` posterior a `starts_at`, `capacity` entero positivo o vacío.
- La lista de asistentes expone nombres de usuario; limítala a quienes gestionan el evento. A los demás muestra solo conteos.
- Guarda y transmite las fechas en UTC (ISO 8601). El frontend las muestra en la zona horaria del usuario e indica la zona, porque la comunidad es de varios países. Considera mostrar también la hora relativa ("en 2 días").

Frontend:

- Página `/eventos` (lista de próximos eventos, con filtro por sección) y `/eventos/:id` (detalle con hora local, descripción, botones Asistiré / Quizá / No asistiré, y conteos).
- Formulario de creación y edición de eventos en el dashboard, visible solo con permiso.
- Enlace a Eventos en el `Header`.
- Reutiliza el estilo existente y mantén el sitio responsivo.

---

## 4. Seguridad: lista de comprobación final

- [ ] `SUPABASE_SECRET_KEY` solo se usa en `netlify/`. Nada de `VITE_`. Nada en `src/`.
- [ ] `.env` no está versionado. No hay secretos en el repo ni en logs.
- [ ] Todas las rutas protegidas validan sesión y permisos en el backend.
- [ ] Las consultas pasan por el cliente de Supabase (parametrizadas); no se construye SQL con texto del usuario.
- [ ] Todas las entradas se validan en el servidor (longitudes, formatos, enumeraciones).
- [ ] El Markdown no renderiza HTML crudo.
- [ ] Los códigos de respuesta se mantienen: 401 sin sesión, 403 sin permiso, 404 inexistente o invisible, 409 conflicto, 500 error interno sin detalles.
- [ ] `npm --prefix latam-org run lint`, `npm --prefix latam-org run build` y los tests pasan.

## 5. Entrega por fase

Al terminar cada fase, informa brevemente: archivos creados o modificados, cualquier SQL nuevo que el usuario deba ejecutar, variables nuevas (si las hay), y una lista corta de pruebas manuales que el usuario debe hacer antes de continuar.
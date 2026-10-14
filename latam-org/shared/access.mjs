// Configuración de acceso compartida entre el servidor (Netlify Function) y el sitio.
// Para añadir una sección: agrega aquí el rol y crea la carpeta con el MISMO id
// dentro de private-content/ (por ejemplo private-content/mineria/).

export const ROLES = [
  { id: 'militar', label: 'Militar' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'mineria', label: 'Minería' },
  { id: 'exploracion', label: 'Exploración' },
  { id: 'ingenieria', label: 'Ingeniería' },
  { id: 'reciclaje', label: 'Reciclaje' },
]

export const ROLE_IDS = ROLES.map((role) => role.id)

// ID de Discord del administrador. Puede sobrescribirse con la variable ADMIN_DISCORD_ID.
export const DEFAULT_ADMIN_ID = '680603294036787319'

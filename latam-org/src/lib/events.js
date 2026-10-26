export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'zona local'

export function formatEventTime(value) {
  return new Date(value).toLocaleString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatEventTimeUtc(value) {
  const formatted = new Date(value).toLocaleString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `${formatted} UTC`
}

export function relativeEventTime(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]]
  const [unit, size] = units.find(([, length]) => Math.abs(seconds) >= length) ?? ['minute', 60]
  return new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' }).format(Math.round(seconds / size), unit)
}

export function toLocalDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

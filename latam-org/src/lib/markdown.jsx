const safeUrl = (value) => /^(https?:|mailto:)/i.test(value || '')

export const markdownComponents = {
  a({ href, children, ...props }) {
    return safeUrl(href) ? (
      <a href={href} {...props} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    )
  },
  img({ src, alt, ...props }) {
    return /^https?:\/\//i.test(src || '') ? <img src={src} alt={alt || ''} {...props} /> : null
  },
}

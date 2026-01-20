/**
 * Normalizes a URL to extract the page path for grouping landing pages.
 * Removes query strings, fragments, and trailing slashes.
 * 
 * Examples:
 * - "https://oseuultimorecomeco.com.br/inscricao/?utm_source=..." → "inscricao"
 * - "https://oseuultimorecomeco.com.br/inscricao-ad010/" → "inscricao-ad010"
 * - "/inscricao/" → "inscricao"
 */
export function normalizePageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  try {
    // If it's a full URL, parse it
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      url = parsed.pathname;
    }
    
    // Remove query string and fragment
    url = url.split('?')[0].split('#')[0];
    
    // Remove trailing and leading slashes
    url = url.replace(/^\/+|\/+$/g, '');
    
    // If empty, return root
    if (!url) return '/';
    
    return url;
  } catch {
    // If parsing fails, do basic cleanup
    return url.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '') || '/';
  }
}

/**
 * Extracts a display-friendly label from a page URL.
 * 
 * Examples:
 * - "inscricao" → "/inscricao"
 * - "inscricao-ad010" → "/inscricao-ad010"
 */
export function getPageDisplayName(normalizedUrl: string): string {
  if (!normalizedUrl || normalizedUrl === '/') return '/';
  return `/${normalizedUrl}`;
}

/**
 * Extracts the last segment of a URL path for shorter display.
 * 
 * Examples:
 * - "products/special/inscricao" → "inscricao"
 * - "inscricao-ad010" → "inscricao-ad010"
 */
export function getPageShortName(normalizedUrl: string): string {
  if (!normalizedUrl || normalizedUrl === '/') return '/';
  const parts = normalizedUrl.split('/');
  return parts[parts.length - 1] || normalizedUrl;
}

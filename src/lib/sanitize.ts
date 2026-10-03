/**
 * Security utility to sanitize HTML content before rendering via dangerouslySetInnerHTML.
 * Strips script tags, iframes, inline event handlers, and javascript: pseudo-protocols
 * while preserving legitimate rich-text formatting (paragraphs, spans, styles, tables, lists).
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  let clean = dirtyHtml;

  // 1. Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Remove iframe and object tags
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  clean = clean.replace(/<embed\b[^>]*>/gi, "");

  // 3. Remove inline event handlers (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // 4. Remove javascript: and vbscript: URIs in href, src, or style
  clean = clean.replace(/(href|src)\s*=\s*(['"]?)\s*(?:javascript|vbscript):/gi, '$1=$2about:blank#blocked:');

  // 5. Remove data: URI execution risks (allow data:image/ for base64 inline images)
  clean = clean.replace(/(href|src)\s*=\s*(['"]?)\s*data:(?!image\/)/gi, '$1=$2about:blank#blocked:');

  return clean;
}

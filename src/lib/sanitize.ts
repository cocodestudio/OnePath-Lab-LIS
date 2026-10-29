import DOMPurify from "dompurify";

/**
 * Security utility to sanitize HTML content before rendering via dangerouslySetInnerHTML.
 * Strips script tags, iframes, inline event handlers (including slash-delimited bypasses),
 * and javascript: pseudo-protocols while preserving legitimate rich-text formatting.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  // 1. Browser-side DOMPurify sanitization
  if (typeof window !== "undefined") {
    try {
      const purify = typeof DOMPurify.sanitize === "function" ? DOMPurify : (DOMPurify as any)(window);
      if (purify && typeof purify.sanitize === "function") {
        return purify.sanitize(dirtyHtml, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["target", "style", "class"],
        });
      }
    } catch {
      // Fall through to strict sanitizer
    }
  }

  // 2. Strict SSR / Fallback Multi-layer Sanitizer
  let clean = dirtyHtml;

  // Remove script tags and contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove iframe, object, embed tags
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  clean = clean.replace(/<embed\b[^>]*>/gi, "");

  // Remove inline event handlers (onload, onerror, onclick, etc.) with whitespace, slash, or quote delimiters
  clean = clean.replace(/[\s/\\"'`]+on[a-zA-Z0-9_]+\s*=\s*(?:'[^']*'|"[^"]*"|`[^`]*`|[^\s>]+)/gi, "");

  // Remove javascript: and vbscript: URIs in href, src, action
  clean = clean.replace(/(href|src|action)\s*=\s*(['"]?)\s*(?:javascript|vbscript):/gi, '$1=$2about:blank#blocked:');

  // Remove data: URI execution risks (allow data:image/ for base64 inline images)
  clean = clean.replace(/(href|src)\s*=\s*(['"]?)\s*data:(?!image\/)/gi, '$1=$2about:blank#blocked:');

  return clean;
}

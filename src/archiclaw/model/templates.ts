/**
 * Simple template expansion for ArchiClaw placeholders.
 * Replaces `{KEY}` tokens with provided values; unknown placeholders are left as-is.
 */
export function expandTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([A-Z_]+)\}/g, (match, key: string) => vars[key] ?? match);
}

/**
 * Words shared by lists and counts across the copy module (PORTAL_COPY_SPEC.md Section 1).
 */
export const commonCopy = {
  "list.and": "and",
  "list.more": "{n} more",
  "list.none": "None",
} as const;

export type CommonCopyKey = keyof typeof commonCopy;

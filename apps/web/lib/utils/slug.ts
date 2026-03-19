export function slugify(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deslugify(slug: string): string {
  if (!slug || typeof slug !== "string") {
    return "";
  }
  return slug.replace(/-and-/g, "&").replace(/-/g, " ").trim();
}

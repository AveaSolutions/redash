import { marked } from "marked";

marked.setOptions({
  gfm: true,
});

export function toHTML(text) {
  return marked.parse(text || "");
}

export default { toHTML };

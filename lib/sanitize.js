// Defense-in-depth cleanup of AI output. The system prompt already asks the
// model for plain text only, but we strip HTML tags and LaTeX/markdown
// wrappers here too, in case a model ignores the instruction.
export function sanitizeAIText(input) {
  if (!input) return '';
  let text = String(input);

  // Strip HTML tags entirely (never render raw HTML from the model).
  text = text.replace(/<[^>]*>/g, '');

  // Unwrap common LaTeX delimiters, keeping the inner text.
  text = text.replace(/\$\$([^$]+)\$\$/g, '$1');
  text = text.replace(/\$([^$]+)\$/g, '$1');
  text = text.replace(/\\\(([^)]+)\\\)/g, '$1');
  text = text.replace(/\\\[([^\]]+)\\\]/g, '$1');

  // Unwrap common markdown emphasis/code formatting.
  text = text.replace(/`{1,3}([^`]*)`{1,3}/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

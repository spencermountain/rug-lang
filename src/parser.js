export class RugParser {
  constructor(options = {}) {
    this.result = [];
    this.currentIndentLevel = 0;
    this.options = {
      ...options
    };
  }

  parse(input) {
    const lines = input.split('\n');
    let buffer = [];
    let indentStack = []; // Stack to track nested divs

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indent = this.getIndentLevel(line);
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        if (buffer.length) {
          this.processParagraphs(buffer);
          buffer = [];
        }
        // Add empty line to maintain spacing
        this.result.push('');
        continue;
      }

      // Updated condition to include lines starting with :
      if (trimmedLine.startsWith('.') || trimmedLine.startsWith('#') || trimmedLine.startsWith(':')) {
        if (buffer.length) {
          this.processParagraphs(buffer);
          buffer = [];
        }

        // Close any divs that are ending based on indent
        while (indentStack.length > 0 && indent <= indentStack[indentStack.length - 1].indent) {
          this.result.push(indentStack.pop().closeTag);
        }

        const { openTag, closeTag, content } = this.parseClassLine(trimmedLine);

        this.result.push(`${openTag}${content}`);
        indentStack.push({ indent, closeTag });
        continue;
      }

      // Handle indented content under a class-based div
      if (indent > 0 && indentStack.length > 0) {
        if (indent > indentStack[indentStack.length - 1].indent) {
          // Preserve the line as-is, don't trim
          this.result.push(line.slice(indent));
          continue;
        }
      }

      // Handle HTML passthrough
      if (trimmedLine.includes('<')) {
        if (buffer.length) {
          this.processParagraphs(buffer);
          buffer = [];
        }
        this.result.push(line);
        continue;
      }

      // Accumulate plain text lines
      buffer.push(line);
    }

    // Process any remaining text in buffer
    if (buffer.length) {
      this.processParagraphs(buffer);
    }

    // Close any remaining open divs
    while (indentStack.length > 0) {
      this.result.push(indentStack.pop().closeTag);
    }

    // Wrap the entire result in a pre-wrap div, without pretty printing
    const innerResult = this.result.join('\n');
    return `<div style="white-space: pre-wrap">\n${innerResult}\n</div>`;
  }

  getIndentLevel(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  parseClassLine(line) {
    const parts = line.trim().split(' ');
    const firstPart = parts[0];
    const content = parts.slice(1).join(' ');

    const attrs = {
      tag: 'span',
      classes: [],
      id: null,
      attributes: {}
    };

    // Check if line starts with a tag name
    if (/^[a-zA-Z][a-zA-Z0-9]*(?:[.#:]|$)/.test(firstPart)) {
      const tagMatch = firstPart.match(/^[a-zA-Z][a-zA-Z0-9]*/);
      if (tagMatch) {
        attrs.tag = tagMatch[0];
        firstPart = firstPart.slice(tagMatch[0].length);
      }
    }

    // If remaining firstPart starts with :, treat it as an attribute-only element
    if (firstPart.startsWith(':')) {
      const elementParts = firstPart.match(/:[^=\s]+(?:=(?:[^"'\s]+|["'][^"']*["']))?/g) || [];
      for (const part of elementParts) {
        const hasEquals = part.includes('=');
        if (hasEquals) {
          const [name, ...valueParts] = part.slice(1).split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          attrs.attributes[name] = value;
        } else {
          const name = part.slice(1);
          attrs.attributes[name] = '';
        }
      }
    } else {
      const elementParts = firstPart.match(/([.#][^.#:]+|:[^=\s]+(?:=(?:[^"'\s]+|["'][^"']*["']))?)/g) || [];
      for (const part of elementParts) {
        if (part.startsWith('.')) {
          attrs.classes.push(part.slice(1));
        } else if (part.startsWith('#')) {
          attrs.id = part.slice(1);
        } else if (part.startsWith(':')) {
          const hasEquals = part.includes('=');
          if (hasEquals) {
            const [name, ...valueParts] = part.slice(1).split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            attrs.attributes[name] = value;
          } else {
            const name = part.slice(1);
            attrs.attributes[name] = '';
          }
        }
      }
    }

    let tag = `<${attrs.tag}`;

    if (attrs.classes.length > 0) {
      tag += ` class="${attrs.classes.join(' ')}"`;
    }

    if (attrs.id) {
      tag += ` id="${attrs.id}"`;
    }

    for (const [name, value] of Object.entries(attrs.attributes)) {
      tag += value === '' ? ` ${name}` : ` ${name}="${value}"`;
    }

    tag += '>';

    return {
      openTag: tag,
      closeTag: `</${attrs.tag}>`,
      content
    };
  }

  processParagraphs(lines) {
    // Simply join the lines with newlines, no <p> tags needed
    if (lines.length) {
      this.result.push(lines.join('\n'));
    }
  }
} 
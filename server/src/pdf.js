const fs = require('fs');

class PDFDocument {
  constructor(options = {}) {
    this.options = options;
    this.layout = options.layout || 'portrait';
    this.size = options.size || 'A4';
    this.pageWidth = 842;
    this.pageHeight = 595;
    if (this.layout === 'portrait') {
      [this.pageWidth, this.pageHeight] = [this.pageHeight, this.pageWidth];
    }
    this.objects = [];
    this.content = [];
    this.x = 50;
    this.y = 50;
    this.currentFontSize = 12;
    this.currentColor = '#000000';
    this.pageObjects = [];
    this.objectCount = 0;
    this.fonts = {};
    this.init();
  }

  init() {
    this.addObject('Font', 'F1', 'Helvetica');
    this.addObject('Font', 'F2', 'Helvetica-Bold');
  }

  addObject(type, name, value) {
    this.objectCount++;
    const obj = { id: this.objectCount, type, name, value };
    this.objects.push(obj);
    return obj;
  }

  rect(x, y, w, h) {
    this.content.push({ op: 'rect', x, y, w, h, color: null, fill: false });
    return this;
  }

  fill(color) {
    if (this.content.length > 0) {
      this.content[this.content.length - 1].fill = true;
      this.content[this.content.length - 1].color = color;
    }
    return this;
  }

  stroke(color) {
    if (this.content.length > 0) {
      this.content[this.content.length - 1].strokeColor = color;
    }
    return this;
  }

  lineWidth(w) {
    if (this.content.length > 0) {
      this.content[this.content.length - 1].lineWidth = w;
    }
    return this;
  }

  fontSize(size) {
    this.currentFontSize = size;
    return this;
  }

  fillColor(color) {
    this.currentColor = color;
    return this;
  }

  moveDown(lines = 1) {
    this.y += this.currentFontSize * 1.2 * lines;
    return this;
  }

  text(text, x, y, options = {}) {
    if (typeof x === 'object') {
      options = x;
      x = this.x;
      y = this.y;
    }
    if (y === undefined) y = this.y;
    if (x === undefined) x = this.x;

    const align = options.align || 'left';
    this.content.push({ op: 'text', text, x, y, fontSize: this.currentFontSize, color: this.currentColor, align });

    if (options.align === 'center') {
      this.x = x;
      this.y = y + this.currentFontSize * 1.2;
    } else {
      this.y = y + this.currentFontSize * 1.2;
    }
    return this;
  }

  pipe(stream) {
    this.outputStream = stream;
    return this;
  }

  end() {
    const pdf = this.generate();
    if (this.outputStream) {
      this.outputStream.write(pdf);
      this.outputStream.end();
    }
    return pdf;
  }

  generate() {
    let lines = [];
    lines.push('%PDF-1.4');
    lines.push('');

    const objs = [];
    const fontObjs = [];
    const pageContent = this.generateContentStream();
    const contentObjId = this.objectCount + 3;

    // Font objects
    objs.push({ id: 1, data: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
    objs.push({ id: 2, data: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' });

    // ProcSet
    objs.push({ id: 3, data: '[/PDF /Text]' });

    // Font dictionary
    objs.push({ id: 4, data: '<< /F1 1 0 R /F2 2 0 R >>' });

    // Content stream
    objs.push({ id: contentObjId, data: `<< /Length ${pageContent.length} >>\nstream\n${pageContent}\nendstream` });

    // Page object
    const pageObjId = contentObjId + 1;
    const pageObj = `<< /Type /Page /Parent 6 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentObjId} 0 R /Resources << /Font 4 0 R /ProcSet 3 0 R >> >>`;
    objs.push({ id: pageObjId, data: pageObj });

    // Pages object
    const pagesObjId = pageObjId + 1;
    objs.push({ id: pagesObjId, data: `<< /Type /Pages /Kids [${pageObjId} 0 R] /Count 1 >>` });

    // Catalog
    const catalogObjId = pagesObjId + 1;
    objs.push({ id: catalogObjId, data: `<< /Type /Catalog /Pages ${pagesObjId} 0 R >>` });

    for (const obj of objs) {
      lines.push(`${obj.id} 0 obj`);
      lines.push(obj.data);
      lines.push('endobj');
      lines.push('');
    }

    // Cross-reference table
    const xrefOffset = lines.join('\n').length + 1;
    lines.push('xref');
    lines.push(`0 ${catalogObjId + 1}`);
    lines.push('0000000000 65535 f ');
    let offset = 1;
    for (let i = 0; i < catalogObjId; i++) {
      const str = String(offset).padStart(10, '0') + ' 00000 n ';
      lines.push(str);
      // Calculate next offset (rough)
      offset += 100 + Math.random() * 200;
    }

    lines.push('');
    lines.push('trailer');
    lines.push(`<< /Size ${catalogObjId + 1} /Root ${catalogObjId} 0 R >>`);
    lines.push('startxref');
    lines.push(String(xrefOffset));
    lines.push('%%EOF');

    return lines.join('\n');
  }

  generateContentStream() {
    const ops = [];
    for (const c of this.content) {
      if (c.op === 'rect') {
        if (c.fill && c.color) {
          const rgb = this.hexToRgb(c.color);
          ops.push(`${rgb} rg`);
        }
        if (c.strokeColor) {
          const rgb = this.hexToRgb(c.strokeColor);
          ops.push(`${rgb} RG`);
        }
        ops.push(`${c.x} ${this.pageHeight - c.y - c.h} ${c.w} ${c.h} re`);
        if (c.fill) ops.push('f');
        if (c.strokeColor) {
          const lw = c.lineWidth || 1;
          ops.push(`${lw} w`);
          ops.push('S');
        }
      } else if (c.op === 'text') {
        const rgb = this.hexToRgb(c.color);
        let x = c.x;
        const text = this.escapeText(c.text);
        if (c.align === 'center') {
          ops.push('BT');
          ops.push(`/F1 ${c.fontSize} Tf`);
          ops.push(`${rgb} rg`);
          const tw = c.text.length * c.fontSize * 0.5;
          x = this.pageWidth / 2;
          ops.push(`${x} ${this.pageHeight - c.y - c.fontSize * 0.3} Td`);
          ops.push(`(${text}) Tj`);
          ops.push('ET');
        } else {
          ops.push('BT');
          ops.push(`/F1 ${c.fontSize} Tf`);
          ops.push(`${rgb} rg`);
          ops.push(`${x} ${this.pageHeight - c.y - c.fontSize * 0.3} Td`);
          ops.push(`(${text}) Tj`);
          ops.push('ET');
        }
      }
    }
    return ops.join('\n');
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r / 255} ${g / 255} ${b / 255}`;
  }

  escapeText(text) {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\n/g, '\\n');
  }
}

module.exports = PDFDocument;

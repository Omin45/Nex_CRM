/**
 * NexERP — Export helpers
 * ---------------------------------------------------------------------------
 * Client-side CSV generation plus Excel (.xls SpreadsheetML) and PDF (via the
 * browser print pipeline) writers. Deliberately dependency-free: an ERP user
 * exporting 50k invoice rows should not have to download a 400 kB XLSX writer.
 *
 * For server-generated, paginated, multi-sheet reports the app should call
 * `POST /reports/export` (see apiRoutes.reports.export) and stream the file
 * back — these helpers cover ad-hoc "export what I'm looking at" cases.
 */

/* ---------------------------------------------------------------------------
 * CORE CSV
 * ------------------------------------------------------------------------- */

/**
 * Escapes a single CSV cell: quotes, commas, newlines.
 * Guarding against CSV/Formula injection by prefixing dangerous leading
 * characters (=, +, -, @) with a single quote.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Serialises rows to a CSV string.
 * @param {Array<{key:string,label:string}>} columns
 * @param {Array<Object>} rows
 * @returns {string}
 */
export function toCSV(columns, rows = []) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value ? c.value(row) : row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Triggers a client-side file download.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  /* UTF-8 BOM keeps Excel from mangling ₦ and accented characters. */
  const blob = new Blob([mimeType.includes('csv') ? '\uFEFF' + content : content], {
    type: mimeType,
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  /* Release the object URL on the next tick so Firefox has time to start. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Timestamped filename stem: "invoices-2026-09-28". */
export function fileStem(name) {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `${String(name).replace(/[^\w-]+/g, '-').toLowerCase()}-${stamp}`;
}

/* ---------------------------------------------------------------------------
 * PUBLIC EXPORTERS
 * ------------------------------------------------------------------------- */

/** Download the current table view as CSV. */
export function exportToCSV({ columns, rows, filename = 'export' }) {
  if (!rows?.length) return false;
  downloadFile(toCSV(columns, rows), `${fileStem(filename)}.csv`);
  return true;
}

/**
 * Download as a spreadsheet-readable .xls file (SpreadsheetML 2003). Excel,
 * LibreOffice and Google Sheets all open these, and it preserves number
 * formatting and styling without a third-party library.
 */
export function exportToExcel({ columns, rows, filename = 'export', title = 'Export' }) {
  if (!rows?.length) return false;
  const headerCells = columns
    .map((c) => `<Cell><Data ss:Type="String">${escapeCell(c.label)}</Data></Cell>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const raw = c.value ? c.value(row) : row[c.key];
          /* Emit numeric cells unquoted so Excel can total them. */
          const isNum = typeof raw === 'number' && Number.isFinite(raw);
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeCell(
            raw,
          )}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeCell(title).slice(0, 30)}">
  <Table>
   <Row>${headerCells.replace(/<Cell>/g, '<Cell ss:StyleID="hdr">')}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(xml, `${fileStem(filename)}.xls`, 'application/vnd.ms-excel');
  return true;
}

/**
 * Print-to-PDF. Opens a hidden iframe styled for A4 landscape, writes the
 * table plus a title header, then calls print(). The user picks "Save as PDF"
 * in the dialog — no binary PDF generator required.
 */
export function exportToPDF({ columns, rows, filename = 'export', title = 'Export', subtitle = '' }) {
  if (!rows?.length) return false;

  const head = columns.map((c) => `<th>${escapeCell(c.label)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${escapeCell(c.value ? c.value(row) : row[c.key])}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument ?? frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${escapeCell(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
      header { border-bottom: 2px solid #0ea5e9; padding-bottom: 8px; margin-bottom: 14px; }
      h1 { font-size: 17px; margin: 0 0 2px; }
      p  { font-size: 11px; color: #475569; margin: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #0f172a; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; }
      td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      footer { margin-top: 12px; font-size: 9px; color: #94a3b8; }
    </style></head><body>
    <header>
      <h1>${escapeCell(title)}</h1>
      ${subtitle ? `<p>${escapeCell(subtitle)}</p>` : ''}
      <p>Generated by NexERP — ${new Date().toLocaleString()}</p>
    </header>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <footer>${rows.length} record(s)</footer>
    </body></html>`);
  doc.close();

  /* Give the iframe a frame to lay out before invoking print. */
  frame.contentWindow.focus();
  setTimeout(() => {
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);

  return true;
}

/** Dispatches to the right exporter by format key. */
export function exportTable(format, payload) {
  switch (format) {
    case 'csv':
      return exportToCSV(payload);
    case 'excel':
      return exportToExcel(payload);
    case 'pdf':
      return exportToPDF(payload);
    default:
      return false;
  }
}

/** Strips characters Excel dislikes in a worksheet name. */
export function safeSheetName(name) {
  return String(name).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet1';
}

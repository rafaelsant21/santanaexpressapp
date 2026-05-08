/**
 * Exporta dados para CSV — abre no Excel (PT-BR).
 * Usa data URI para máxima compatibilidade com Next.js.
 */
export function exportToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  _sheetName?: string
) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escape).join(';'),
    ...rows.map(row => headers.map(h => escape(row[h])).join(';')),
  ];

  // BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const csv = bom + csvLines.join('\r\n');

  // Usa data URI + link — mais confiável em ambientes Next.js
  const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const link = document.createElement('a');
  link.setAttribute('href', uri);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

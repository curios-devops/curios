// Ask Deeper — Step E: PDF export.
// Renders a DOM node (the Ask Deeper answer card) to a clean multi-page PDF.
// Imports are dynamic so the (heavy) PDF libs are only loaded when a user
// actually exports, keeping them out of the main bundle.

import { logger } from '../../../utils/logger';

/**
 * Export the given element to a downloadable PDF report.
 * Returns true on success, false on failure (never throws to the caller).
 */
export async function exportDeepSearchPdf(
  element: HTMLElement,
  query: string
): Promise<boolean> {
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Render at 2x for crisp text; force a white background for dark mode.
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale the capture to the page width, then paginate vertically.
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeName = query.trim().replace(/[^a-z0-9]+/gi, '-').slice(0, 60) || 'ask-deeper';
    pdf.save(`curios-${safeName}.pdf`);
    return true;
  } catch (error) {
    logger.error('exportDeepSearchPdf: failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

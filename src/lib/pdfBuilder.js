import { jsPDF } from "jspdf";

// Generates a PDF Blob from a title and an array of { heading, body } sections.
export function generatePdf(title, sections) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(title, margin, y);
  y += 14;
  doc.setDrawColor(230, 57, 112);
  doc.setLineWidth(2);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  for (const s of sections) {
    if (s.heading) {
      if (y > pageH - margin - 24) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      const hlines = doc.splitTextToSize(s.heading, pageW - margin * 2);
      doc.text(hlines, margin, y);
      y += hlines.length * 17 + 4;
    }
    if (s.body) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(s.body, pageW - margin * 2);
      for (const line of lines) {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 13;
      }
      y += 8;
    }
  }

  return doc.output("blob");
}
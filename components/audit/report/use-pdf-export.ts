"use client";

import { useCallback, useState } from "react";

// Eksport widoku raportu do PDF: html2canvas (raster) + jsPDF z podziałem na strony A4.
// Biblioteki importowane dynamicznie, aby nie obciążać bundla strony przy pierwszym renderze.
export function usePdfExport(fileName = "raport-sri.pdf") {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(
    async (element: HTMLElement | null) => {
      if (!element) return;
      setExporting(true);
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;
        const imgData = canvas.toDataURL("image/png");

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(fileName);
      } finally {
        setExporting(false);
      }
    },
    [fileName],
  );

  return { exportPdf, exporting };
}

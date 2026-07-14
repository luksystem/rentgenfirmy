import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { VIZ_SLA_STATUS_LABELS } from "@/lib/viz/service-sla";
import type { VizServiceSlaSummary } from "@/lib/viz/viz-service-sla-server";
import type { VizDashboardLiveKpi } from "@/lib/viz/live-types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

const PAGE_SIZE: [number, number] = [595.28, 841.89];

async function loadFontBytes(fileName: string): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "fonts", fileName));
}

async function embedTextFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes("Lato-Regular.ttf"),
    loadFontBytes("Lato-Bold.ttf"),
  ]);
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

function drawWrappedFactory(page: PDFPage, margin: number, maxWidth: number, startY: number) {
  let y = startY;
  return function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0.1, 0.1, 0.1),
  ) {
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => {
      if (!line) {
        return;
      }
      page.drawText(line, { x: margin, y, size, font, color });
      y -= lineHeight;
      line = "";
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    flush();
    return y;
  };
}

export type VizDashboardReportParams = {
  dashboardName: string;
  generatedAt: string;
  kpi: VizDashboardLiveKpi;
  snapshots: VizStoreLiveSnapshot[];
  sla: VizServiceSlaSummary;
};

export async function generateVizDashboardReportPdf(params: VizDashboardReportParams) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedTextFonts(pdfDoc);
  const page = pdfDoc.addPage(PAGE_SIZE);
  const margin = 48;
  const maxWidth = PAGE_SIZE[0] - margin * 2;
  let y = PAGE_SIZE[1] - margin;

  const drawLine = (text: string, bold = false, size = 11) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fonts.bold : fonts.regular,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  drawLine("Raport dashboardu BMS", true, 16);
  drawLine(params.dashboardName, true, 13);
  drawLine(
    `Wygenerowano: ${new Date(params.generatedAt).toLocaleString("pl-PL")}`,
    false,
    10,
  );
  y -= 8;

  drawLine("Podsumowanie sieci", true, 12);
  drawLine(`Sklepy: ${params.kpi.storeCount} · Online: ${params.kpi.onlineCount} · Offline: ${params.kpi.offlineCount}`);
  drawLine(`Alarmy: ${params.kpi.alarmCount} · Bez potwierdzenia: ${params.kpi.unacknowledgedAlarmCount ?? 0}`);
  drawLine(`Otwarte zgłoszenia: ${params.kpi.openServiceRequests}`);
  drawLine(
    `Średnia temperatura: ${
      params.kpi.avgTemperature != null ? `${params.kpi.avgTemperature.toFixed(1)} °C` : "—"
    }`,
  );
  y -= 8;

  drawLine("Status sklepów", true, 12);
  for (const store of params.snapshots.slice(0, 18)) {
    const label = store.displayName ?? store.projectName ?? store.projectId;
    drawLine(
      `${label}: ${store.status.label} · temp. ${store.roles.store_temperature?.displayValue ?? "—"}`,
      false,
      10,
    );
    if (y < margin + 40) {
      break;
    }
  }

  y -= 8;
  drawLine("SLA zgłoszeń serwisowych", true, 12);
  drawLine(
    `Otwarte: ${params.sla.totalOpen} · Po terminie: ${params.sla.overdueCount} · Zbliża się termin: ${params.sla.approachingCount}`,
  );

  const drawWrapped = drawWrappedFactory(page, margin, maxWidth, y);
  for (const item of params.sla.items.slice(0, 12)) {
    y = drawWrapped(
      `${item.referenceNumber} · ${item.projectLabel ?? "—"} · ${VIZ_SLA_STATUS_LABELS[item.slaStatus]} · ${item.description.slice(0, 120)}`,
      fonts.regular,
      9,
      12,
    );
    if (y < margin + 30) {
      break;
    }
  }

  page.drawText("Rentgen — moduł Wizualizacje / BMS", {
    x: margin,
    y: margin - 10,
    size: 8,
    font: fonts.regular,
    color: rgb(0.45, 0.45, 0.45),
  });

  return pdfDoc.save();
}

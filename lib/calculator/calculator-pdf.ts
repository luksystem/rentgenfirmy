import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { companyDisplayName, companyFooterLines, type CompanyProfile } from "@/lib/company/company-profile";
import { calculateCalculatorTotals } from "@/lib/calculator/engine";
import type { CalculatorSettings } from "@/lib/calculator/settings";
import {
  CALCULATOR_FUNCTIONAL_CATEGORY_LABELS,
  CALCULATOR_FUNCTIONAL_LEVEL_LABELS,
  CALCULATOR_HOUSE_SIZE_TIER_LABELS,
  CALCULATOR_OTHER_SYSTEM_LABELS,
  type CalculatorOffer,
} from "@/lib/calculator/types";
import { formatMoney } from "@/lib/utils";

/**
 * PDF wyliczonej kalkulacji — wzorem `lib/contracts/contract-pdf.ts` (osadzona czcionka Lato
 * przez fontkit dla polskich znaków). Tylko cena dla klienta — bez wewnętrznej kalkulacji marży.
 */

const PAGE_SIZE: [number, number] = [595.28, 841.89];

async function loadFontBytes(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Nie udało się wczytać czcionki ${path}`);
  }
  return response.arrayBuffer();
}

async function embedTextFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes("/fonts/Lato-Regular.ttf"),
    loadFontBytes("/fonts/Lato-Bold.ttf"),
  ]);
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

export async function generateCalculatorOfferPdf(params: {
  offer: CalculatorOffer;
  settings: CalculatorSettings;
  company: CompanyProfile;
}): Promise<Uint8Array> {
  const { offer, settings, company } = params;
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedTextFonts(pdfDoc);

  const margin = 48;
  const maxWidth = PAGE_SIZE[0] - margin * 2;
  const minY = 130;

  let page = pdfDoc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - margin;

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < minY) {
      page = pdfDoc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - margin;
    }
  }

  function drawWrapped(text: string, font: PDFFont, size: number, lineHeight: number, color = rgb(0.1, 0.1, 0.1)) {
    if (!text.trim()) {
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => {
      if (!line) {
        return;
      }
      ensureSpace(lineHeight);
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
  }

  drawWrapped(offer.title || "Kalkulacja — Inteligentny Dom", fonts.bold, 18, 24);
  y -= 6;

  drawWrapped("Strony", fonts.bold, 12, 16);
  drawWrapped(`Wykonawca: ${companyDisplayName(company)}`, fonts.regular, 10, 14);
  for (const line of companyFooterLines(company)) {
    drawWrapped(line, fonts.regular, 9, 12, rgb(0.4, 0.4, 0.4));
  }
  y -= 4;
  drawWrapped(`Zamawiający: ${offer.client.fullName || "—"}`, fonts.regular, 10, 14);
  const contactBits = [offer.client.location, offer.client.email, offer.client.phone].filter(Boolean).join(" · ");
  if (contactBits) {
    drawWrapped(contactBits, fonts.regular, 9, 12);
  }
  y -= 10;

  const totals = calculateCalculatorTotals(offer.answers, settings);

  drawWrapped(
    `Parametry domu: ${offer.answers.powierzchniaM2} m², ${offer.answers.liczbaKondygnacji} kondygnacj(a/e), próg cenowy: ${CALCULATOR_HOUSE_SIZE_TIER_LABELS[totals.baseSystem.tier]}`,
    fonts.regular,
    10,
    14,
  );
  y -= 10;

  drawWrapped("Baza systemu Inteligentnego Domu (pakiet OPTIMUM)", fonts.bold, 12, 16);
  drawWrapped(`Rozdzielnica — sprzęt: ${formatMoney(totals.baseSystem.rozdzielnicaSprzetNet)}`, fonts.regular, 10, 14);
  drawWrapped(`Automatyka — baza i zasilanie: ${formatMoney(totals.baseSystem.automatykaBazaNet)}`, fonts.regular, 10, 14);
  drawWrapped(
    `Projekt: ${formatMoney(totals.baseSystem.projektNet)}${totals.baseSystem.projektDiscountNet > 0 ? ` (rabat kompleksowości: ${formatMoney(totals.baseSystem.projektDiscountNet)})` : ""}`,
    fonts.regular,
    10,
    14,
  );
  drawWrapped(`Wykonanie i podłączenie rozdzielni: ${formatMoney(totals.baseSystem.wykonanieRozdzielniNet)}`, fonts.regular, 10, 14);
  drawWrapped(`Wstępna konfiguracja: ${formatMoney(totals.baseSystem.konfiguracjaNet)}`, fonts.regular, 10, 14);
  y -= 6;

  drawWrapped("Kategorie funkcjonalne", fonts.bold, 11, 15);
  for (const item of totals.functional) {
    drawWrapped(
      `${CALCULATOR_FUNCTIONAL_CATEGORY_LABELS[item.category]} — poziom ${CALCULATOR_FUNCTIONAL_LEVEL_LABELS[item.level]}: ${formatMoney(item.net)}`,
      fonts.regular,
      10,
      14,
    );
  }
  y -= 6;

  if (totals.addonsNet > 0) {
    drawWrapped("Dodatki (wybrane)", fonts.bold, 11, 15);
    for (const item of totals.addons.filter((entry) => entry.selected)) {
      drawWrapped(`${item.key}: ${formatMoney(item.net)}`, fonts.regular, 10, 14);
    }
    y -= 6;
  }

  drawWrapped(`Instalacja elektryczna (${totals.electrical.points} pkt): ${formatMoney(totals.electrical.finalNet)}`, fonts.bold, 11, 15);
  y -= 6;

  if (totals.otherSystems.selectedNet > 0) {
    drawWrapped("Inne systemy", fonts.bold, 11, 15);
    for (const item of totals.otherSystems.items.filter((entry) => entry.selected)) {
      drawWrapped(`${CALCULATOR_OTHER_SYSTEM_LABELS[item.key]}: ${formatMoney(item.net)}`, fonts.regular, 10, 14);
    }
    if (totals.otherSystems.discountNet > 0) {
      drawWrapped(`Rabat (${totals.otherSystems.discountPercent}%): −${formatMoney(totals.otherSystems.discountNet)}`, fonts.regular, 10, 14);
    }
    y -= 6;
  }

  if (totals.platnoscZGoryDiscountNet > 0) {
    drawWrapped(`Rabat za płatność z góry: −${formatMoney(totals.platnoscZGoryDiscountNet)}`, fonts.regular, 10, 14);
  }
  if (totals.trudnyKlientWspolczynnik > 1) {
    drawWrapped(`Doliczony współczynnik: ×${totals.trudnyKlientWspolczynnik.toFixed(2)}`, fonts.regular, 10, 14);
  }

  ensureSpace(30);
  drawWrapped(`Wartość kalkulacji netto: ${formatMoney(totals.totalNet)}`, fonts.bold, 14, 20);
  drawWrapped("VAT dolicza się dopiero po wyborze rozliczenia w umowie.", fonts.regular, 9, 12, rgb(0.4, 0.4, 0.4));

  return pdfDoc.save();
}

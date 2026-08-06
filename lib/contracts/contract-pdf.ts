import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { companyDisplayName, companyFooterLines, type CompanyProfile } from "@/lib/company/company-profile";
import { DEFAULT_CONTRACT_MODULE_SETTINGS } from "@/lib/contracts/module-settings";
import { renderContractText } from "@/lib/contracts/render-text";
import {
  calculateContractTotals,
  calculatePaymentPlanInstallmentAmounts,
  calculateTableNetTotal,
  calculateVatBreakdown,
} from "@/lib/contracts/totals";
import { CONTRACT_OPTION_CATEGORY_LABELS, isContractTableSection, isContractTextSection, type Contract } from "@/lib/contracts/types";
import { computeFixedPriceRowNetValue } from "@/lib/service/fixed-price";
import { fetchContractModuleSettings } from "@/lib/supabase/contract-module-settings-repository";
import { formatDateTime, formatMoney } from "@/lib/utils";

/**
 * Generowanie finalnego PDF podpisanej umowy — wzorem `lib/process/protocol-pdf.ts` (osadzona
 * czcionka Lato przez fontkit dla polskich znaków). Uruchamiane w przeglądarce (tak jak
 * `acceptProtocol` w `process-protocol-repository.ts`), nie w route handlerze — `fetch("/fonts/…")`
 * wymaga origin, którego serwerowy handler nie ma bez dodatkowej konfiguracji.
 */

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 w punktach

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

export async function generateContractPdf(params: {
  contract: Contract;
  company: CompanyProfile;
}): Promise<Uint8Array> {
  const { contract, company } = params;
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

  function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0.1, 0.1, 0.1),
  ) {
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

  drawWrapped(contract.title || "Umowa", fonts.bold, 18, 24);
  y -= 6;

  drawWrapped("Strony umowy", fonts.bold, 12, 16);
  drawWrapped(`Wykonawca: ${companyDisplayName(company)}`, fonts.regular, 10, 14);
  for (const line of companyFooterLines(company)) {
    drawWrapped(line, fonts.regular, 9, 12, rgb(0.4, 0.4, 0.4));
  }
  y -= 4;
  drawWrapped(`Zamawiający: ${contract.client.fullName || "—"}`, fonts.regular, 10, 14);
  if (contract.client.companyName) {
    drawWrapped(contract.client.companyName, fonts.regular, 9, 12);
  }
  if (contract.client.nip) {
    drawWrapped(`NIP: ${contract.client.nip}`, fonts.regular, 9, 12);
  }
  if (contract.client.location) {
    drawWrapped(contract.client.location, fonts.regular, 9, 12);
  }
  const contactBits = [contract.client.email, contract.client.phone].filter(Boolean).join(" · ");
  if (contactBits) {
    drawWrapped(contactBits, fonts.regular, 9, 12);
  }
  y -= 10;

  const effectivePlan =
    contract.paymentPlans.find((plan) => plan.id === contract.selectedPaymentPlanId) ??
    contract.paymentPlans[0] ??
    null;
  const totals = calculateContractTotals(contract.sections, { paymentPlan: effectivePlan });
  const moduleSettings = await fetchContractModuleSettings().catch(() => DEFAULT_CONTRACT_MODULE_SETTINGS);
  const vatBreakdown = calculateVatBreakdown(totals.totalNet, contract.vatDeclaration, moduleSettings);
  const scaleToFinal = totals.totalNet > 0 ? vatBreakdown.finalTotal / totals.totalNet : 1;

  for (const section of contract.sections) {
    if (isContractTextSection(section)) {
      if (section.title) {
        drawWrapped(section.title, fonts.bold, 11, 15);
      }
      const rendered = renderContractText(section.content, contract);
      const content = section.struck ? `[WYKREŚLONE] ${rendered}` : rendered;
      drawWrapped(content, fonts.regular, 10, 14, section.struck ? rgb(0.55, 0.55, 0.55) : rgb(0.1, 0.1, 0.1));
      y -= 6;
      continue;
    }

    if (!isContractTableSection(section)) {
      continue;
    }
    const isDodatki = section.group === "option" && section.category === "dodatki";
    if (section.group === "option" && !isDodatki && !section.selected) {
      continue;
    }
    if (isDodatki && section.selectedRowIds.length === 0) {
      continue;
    }

    const categoryLabel = section.category ? CONTRACT_OPTION_CATEGORY_LABELS[section.category] : null;
    drawWrapped(
      `${section.title || "Tabela pozycji"}${categoryLabel ? ` (${categoryLabel}${!isDodatki && section.categoryDiscountPercent > 0 ? ` — rabat ${section.categoryDiscountPercent}%` : ""})` : ""}`,
      fonts.bold,
      11,
      15,
    );
    if (section.description) {
      drawWrapped(section.description, fonts.regular, 9, 12, rgb(0.4, 0.4, 0.4));
    }
    let tableNet = 0;
    for (const row of section.rows) {
      if (!row.active) {
        continue;
      }
      if (isDodatki && !section.selectedRowIds.includes(row.id)) {
        continue;
      }
      const net = computeFixedPriceRowNetValue(row);
      tableNet += net;
      drawWrapped(
        `${row.name || "Pozycja"} — ${row.quantity} ${row.unit} × ${formatMoney(row.netUnitPrice)} = ${formatMoney(net)} netto`,
        fonts.regular,
        9,
        13,
      );
    }
    drawWrapped(
      `Suma tabeli netto: ${formatMoney(isDodatki ? tableNet : calculateTableNetTotal(section))}`,
      fonts.bold,
      9,
      13,
    );
    y -= 6;
  }

  if (totals.itemDiscountNet > 0) {
    drawWrapped(`Rabat na pozycjach: ${formatMoney(totals.itemDiscountNet)}`, fonts.regular, 10, 14);
  }
  if (totals.categoryDiscountNet > 0) {
    drawWrapped(`Rabat za wybrane kategorie: ${formatMoney(totals.categoryDiscountNet)}`, fonts.regular, 10, 14);
  }
  if (effectivePlan && effectivePlan.discountPercent > 0) {
    drawWrapped(
      `Rabat za wariant płatności „${effectivePlan.label}” (${effectivePlan.discountPercent}%): ${formatMoney(totals.planDiscountNet)}`,
      fonts.regular,
      10,
      14,
    );
  }
  drawWrapped(`Wartość umowy netto: ${formatMoney(totals.totalNet)}`, fonts.bold, 12, 18);
  y -= 4;

  drawWrapped("Rozliczenie VAT", fonts.bold, 12, 16);
  if (vatBreakdown.inneNet > 0) {
    drawWrapped(
      `Część „inne” (0% VAT, rabat ${vatBreakdown.inneDiscountPercent}%): ${formatMoney(vatBreakdown.inneFinal)}`,
      fonts.regular,
      10,
      14,
    );
  }
  drawWrapped(
    `Część rozliczana normalnie (VAT ${vatBreakdown.normalVatRatePercent}%): ${formatMoney(vatBreakdown.normalGross)}`,
    fonts.regular,
    10,
    14,
  );
  drawWrapped(`Razem do zapłaty: ${formatMoney(vatBreakdown.finalTotal)}`, fonts.bold, 12, 18);
  y -= 8;

  if (effectivePlan && effectivePlan.installments.length) {
    drawWrapped(
      contract.paymentPlans.length > 1
        ? `Harmonogram spłat — wariant „${effectivePlan.label}”`
        : "Harmonogram spłat",
      fonts.bold,
      12,
      16,
    );
    for (const item of calculatePaymentPlanInstallmentAmounts(effectivePlan, totals)) {
      const amountFinal = item.amountNet * scaleToFinal;
      const perMonthFinal = item.perMonthNet != null ? item.perMonthNet * scaleToFinal : null;
      const splitNote = perMonthFinal != null ? ` — ${item.splitOverMonths}× ${formatMoney(perMonthFinal)}/mies.` : "";
      drawWrapped(
        `${item.label || "Rata"} — ${item.percent}% = ${formatMoney(amountFinal)}${splitNote}${item.note ? ` (${item.note})` : ""}`,
        fonts.regular,
        10,
        14,
      );
    }
    y -= 8;
  }

  ensureSpace(70);
  y -= 10;
  drawWrapped("Podpisy", fonts.bold, 12, 16);
  drawWrapped(
    `Zamawiający: ${contract.clientSignature ? `${contract.clientSignature.signerName} — ${formatDateTime(contract.clientSignature.signedAt)}` : "brak podpisu"}`,
    fonts.regular,
    10,
    14,
  );
  drawWrapped(
    `Wykonawca: ${contract.companySignature ? `${contract.companySignature.signerName} — ${formatDateTime(contract.companySignature.signedAt)}` : "brak podpisu"}`,
    fonts.regular,
    10,
    14,
  );

  return pdfDoc.save();
}

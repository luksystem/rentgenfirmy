import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type {
  ProtocolField,
  ProtocolFieldValue,
  ProtocolOverlayItem,
  ProtocolSignature,
} from "@/lib/process/protocol-types";
import { formatDateTime } from "@/lib/utils";

/**
 * Generowanie finalnego PDF protokołu po akceptacji — czcionki standardowe pdf-lib (WinAnsi)
 * nie obsługują polskich znaków diakrytycznych, dlatego osadzamy własną czcionkę (Lato, OFL)
 * z pełnym Unicode przez fontkit.
 */

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 w punktach

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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

type SignatureBlockMeta = {
  acceptedAt: string;
  acceptedBy: string;
};

async function drawSignatureBlock(
  pdfDoc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  signatures: { company: ProtocolSignature | null; client: ProtocolSignature | null },
  meta: SignatureBlockMeta,
) {
  const { width } = page.getSize();
  const margin = 48;
  const gap = 24;
  const blockWidth = (width - margin * 2 - gap) / 2;
  const imageMaxHeight = 55;
  const footerY = margin - 24;
  const signerLineY = footerY + 16;
  const imageBaseY = signerLineY + 10;
  const labelY = imageBaseY + imageMaxHeight + 8;

  async function drawOne(signature: ProtocolSignature | null, label: string, x: number) {
    page.drawText(label, {
      x,
      y: labelY,
      size: 9,
      font: fonts.bold,
      color: rgb(0.2, 0.2, 0.2),
    });

    if (signature) {
      const pngBytes = dataUrlToBytes(signature.imageDataUrl);
      const image = await pdfDoc.embedPng(pngBytes);
      const scale = Math.min(blockWidth / image.width, imageMaxHeight / image.height, 1);
      const w = image.width * scale;
      const h = image.height * scale;
      page.drawImage(image, { x, y: imageBaseY + (imageMaxHeight - h), width: w, height: h });
      page.drawText(`${signature.signerName} - ${formatDateTime(signature.signedAt)}`, {
        x,
        y: signerLineY,
        size: 8,
        font: fonts.regular,
        color: rgb(0.35, 0.35, 0.35),
      });
    } else {
      page.drawText("Brak podpisu", {
        x,
        y: imageBaseY + imageMaxHeight / 2,
        size: 8,
        font: fonts.regular,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
  }

  await drawOne(signatures.company, "Przedstawiciel firmy", margin);
  await drawOne(signatures.client, "Klient", margin + blockWidth + gap);

  page.drawText(`Zaakceptowano elektronicznie: ${formatDateTime(meta.acceptedAt)} — ${meta.acceptedBy}`, {
    x: margin,
    y: Math.max(footerY, 14),
    size: 7,
    font: fonts.regular,
    color: rgb(0.5, 0.5, 0.5),
  });
}

function hexToRgb(hex: string) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) {
    return rgb(0.1, 0.1, 0.1);
  }
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => parseInt(part, 16) / 255);
  return rgb(r, g, b);
}

/**
 * Nanosi na strony wzoru pola tekstowe i umieszczone podpisy (`ProtocolOverlayItem`) — dane
 * strukturalne wprowadzone przez użytkownika w edytorze (`PdfPageAnnotator`), niezależne od
 * odręcznego rastrowego pisma. Współrzędne to ułamek (0..1) szerokości/wysokości strony,
 * z origin w lewym górnym rogu (jak na ekranie) — dlatego oś Y jest odwracana względem PDF.
 */
async function drawOverlayItems(
  pdfDoc: PDFDocument,
  overlayItems: ProtocolOverlayItem[],
  fonts: { regular: PDFFont; bold: PDFFont },
  signatures: { company: ProtocolSignature | null; client: ProtocolSignature | null },
) {
  const signatureImageCache = new Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>();

  async function embedSignatureImage(dataUrl: string) {
    const cached = signatureImageCache.get(dataUrl);
    if (cached) {
      return cached;
    }
    const image = await pdfDoc.embedPng(dataUrlToBytes(dataUrl));
    signatureImageCache.set(dataUrl, image);
    return image;
  }

  for (const item of overlayItems) {
    const pdfPage = pdfDoc.getPage(item.page - 1);
    if (!pdfPage) {
      continue;
    }
    const { width, height } = pdfPage.getSize();
    const x = item.xRatio * width;
    const yTop = item.yRatio * height;

    if (item.kind === "text" && item.text?.trim()) {
      const fontSize = (item.fontSizeRatio ?? 0.018) * height;
      const color = hexToRgb(item.color ?? "#111827");
      const lines = item.text.split("\n");
      lines.forEach((line, index) => {
        pdfPage.drawText(line, {
          x,
          y: height - yTop - fontSize * (index + 1) * 1.25,
          size: fontSize,
          font: fonts.regular,
          color,
        });
      });
    } else if (item.kind === "signature") {
      const signature = item.which === "company" ? signatures.company : signatures.client;
      if (!signature) {
        continue;
      }
      const image = await embedSignatureImage(signature.imageDataUrl);
      const w = (item.widthRatio ?? 0.22) * width;
      const h = (w / image.width) * image.height;
      pdfPage.drawImage(image, { x, y: height - yTop - h, width: w, height: h });
    }
  }
}

/**
 * Wzór PDF + odręczne adnotacje "wypalone" na oryginalnych stronach + pola tekstowe/podpisy
 * umieszczone przez użytkownika w wybranych miejscach + podpisy zbiorczo na ostatniej stronie.
 */
export async function generateAnnotatedProtocolPdf(params: {
  originalPdfBytes: ArrayBuffer;
  pageAnnotationBytes: Map<number, Uint8Array>;
  overlayItems: ProtocolOverlayItem[];
  companySignature: ProtocolSignature | null;
  clientSignature: ProtocolSignature | null;
  acceptedAt: string;
  acceptedBy: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(params.originalPdfBytes);

  for (const [page, bytes] of params.pageAnnotationBytes) {
    const pdfPage = pdfDoc.getPage(page - 1);
    if (!pdfPage) {
      continue;
    }
    const image = await pdfDoc.embedPng(bytes);
    const { width, height } = pdfPage.getSize();
    pdfPage.drawImage(image, { x: 0, y: 0, width, height });
  }

  const fonts = await embedTextFonts(pdfDoc);

  if (params.overlayItems.length) {
    await drawOverlayItems(
      pdfDoc,
      params.overlayItems,
      fonts,
      { company: params.companySignature, client: params.clientSignature },
    );
  }

  const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  await drawSignatureBlock(
    pdfDoc,
    lastPage,
    fonts,
    { company: params.companySignature, client: params.clientSignature },
    { acceptedAt: params.acceptedAt, acceptedBy: params.acceptedBy },
  );

  return pdfDoc.save();
}

/**
 * Czysty raport PDF wygenerowany od zera z wartości pól formularza (szablon "custom", bez
 * oryginalnego wzoru do pisania po nim).
 */
export async function generateFieldReportPdf(params: {
  templateName: string;
  fields: ProtocolField[];
  fieldValues: Record<string, ProtocolFieldValue>;
  notes: string;
  companySignature: ProtocolSignature | null;
  clientSignature: ProtocolSignature | null;
  acceptedAt: string;
  acceptedBy: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedTextFonts(pdfDoc);
  const margin = 48;
  const maxWidth = PAGE_SIZE[0] - margin * 2;
  const minY = 150;

  let page = pdfDoc.addPage(PAGE_SIZE);
  let y = PAGE_SIZE[1] - margin;

  function ensureSpace(lineHeight: number) {
    if (y - lineHeight < minY) {
      page = pdfDoc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - margin;
    }
  }

  function drawWrapped(text: string, font: PDFFont, size: number, lineHeight: number, color = rgb(0.1, 0.1, 0.1)) {
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

  drawWrapped(params.templateName || "Protokół", fonts.bold, 16, 22);
  y -= 8;

  for (const field of params.fields) {
    const raw = params.fieldValues[field.id];
    const value =
      field.type === "checkbox" ? (raw ? "Tak" : "Nie") : typeof raw === "string" && raw.trim() ? raw : "—";
    drawWrapped(field.label, fonts.bold, 11, 15);
    drawWrapped(value, fonts.regular, 11, 15);
    y -= 8;
  }

  if (params.notes.trim()) {
    drawWrapped("Uwagi", fonts.bold, 11, 15);
    drawWrapped(params.notes, fonts.regular, 11, 15);
  }

  await drawSignatureBlock(
    pdfDoc,
    page,
    fonts,
    { company: params.companySignature, client: params.clientSignature },
    { acceptedAt: params.acceptedAt, acceptedBy: params.acceptedBy },
  );

  return pdfDoc.save();
}

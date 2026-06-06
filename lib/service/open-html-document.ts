export function openHtmlDocument(html: string, blockedMessage?: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    window.alert(
      blockedMessage ??
        "Przeglądarka zablokowała okno. Zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.",
    );
    return;
  }

  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (!printWindow.closed) {
      printWindow.close();
    }
  };

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      window.alert("Nie udało się otworzyć dialogu druku.");
      cleanup();
      return;
    }

    printWindow.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
  };

  const waitForRender = () => window.setTimeout(triggerPrint, 400);

  try {
    if (printWindow.document.readyState === "complete") {
      waitForRender();
    } else {
      printWindow.addEventListener("load", waitForRender, { once: true });
    }
  } catch {
    waitForRender();
  }
}

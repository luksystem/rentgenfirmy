"use client";

import { useState } from "react";
import { Package, Send } from "lucide-react";
import { EmployeeReportDialog } from "@/components/process/employee-report-dialog";
import { RequisitionQuickDialog } from "@/components/requisitions/requisition-quick-dialog";
import { Button } from "@/components/ui/button";

/**
 * Dwa przyciski eskalacji, wspólne dla checklist i modułów dokumentacyjnych: opisanie problemu
 * samo w polu tekstowym nic dalej nie uruchamia — te przyciski dają dalszy ciąg (zgłoszenie do
 * biura albo zapotrzebowanie na zakupy). Sukces którejkolwiek akcji liczy się jako "ogarnięte" —
 * wywołujący sam decyduje, co to znaczy zapisać (patch pola checklisty / update wiersza modułu).
 */
export function ItemEscalationActions({
  projectId,
  itemTitle,
  itemDescription,
  disabled,
  onHandled,
  onReportCreated,
}: {
  projectId: string;
  itemTitle: string;
  itemDescription?: string;
  disabled?: boolean;
  onHandled: (note: string) => void;
  /** Modułowe (Rozdzielnie/dokumentacja) wiążą utworzone zgłoszenie z konkretnym wierszem — ten
   *  hak leci PRZED onHandled, żeby caller zdążył zapisać link zanim wiersz zostanie oznaczony. */
  onReportCreated?: (result: { target: "agreement" | "change_request"; recordId: string }) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [requisitionOpen, setRequisitionOpen] = useState(false);

  // "—" to placeholder braku etykiety (switchboardCircuitLabel/documentationModuleItemLabel) —
  // dopisywanie go do opisu tylko zaśmieca tytuł, który zgłoszenie buduje z pierwszej linii.
  const initialDescription = [itemTitle === "—" ? null : itemTitle, itemDescription?.trim()]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={() => setReportOpen(true)}
      >
        <Send className="mr-2 h-3.5 w-3.5" />
        Zgłoś do biura
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={disabled}
        onClick={() => setRequisitionOpen(true)}
      >
        <Package className="mr-2 h-3.5 w-3.5" />
        Zgłoś zapotrzebowanie
      </Button>

      <EmployeeReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        projectId={projectId}
        initialDescription={initialDescription}
        onCreated={(result) => {
          setReportOpen(false);
          onReportCreated?.(result);
          onHandled("Zgłoszono do biura.");
        }}
      />
      <RequisitionQuickDialog
        open={requisitionOpen}
        onOpenChange={setRequisitionOpen}
        projectId={projectId}
        initialTitle={itemTitle}
        onCreated={() => onHandled("Zgłoszono zapotrzebowanie.")}
      />
    </div>
  );
}

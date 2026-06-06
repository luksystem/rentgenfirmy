import { WorkOrderHydrator } from "@/components/work-order/work-order-hydrator";

export default function ZleceniaLayout({ children }: { children: React.ReactNode }) {
  return <WorkOrderHydrator>{children}</WorkOrderHydrator>;
}

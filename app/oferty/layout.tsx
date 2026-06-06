import { ServiceHydrator } from "@/components/service/service-hydrator";

export default function OfertyLayout({ children }: { children: React.ReactNode }) {
  return <ServiceHydrator>{children}</ServiceHydrator>;
}

import { ServiceHydrator } from "@/components/service/service-hydrator";

export default function SerwisLayout({ children }: { children: React.ReactNode }) {
  return <ServiceHydrator>{children}</ServiceHydrator>;
}

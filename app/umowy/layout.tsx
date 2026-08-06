import { ContractHydrator } from "@/components/contracts/contract-hydrator";

export default function UmowyLayout({ children }: { children: React.ReactNode }) {
  return <ContractHydrator>{children}</ContractHydrator>;
}

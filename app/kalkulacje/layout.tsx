import { CalculatorHydrator } from "@/components/calculator/calculator-hydrator";

export default function KalkulacjeLayout({ children }: { children: React.ReactNode }) {
  return <CalculatorHydrator>{children}</CalculatorHydrator>;
}

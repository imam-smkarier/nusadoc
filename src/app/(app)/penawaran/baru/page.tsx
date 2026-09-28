import { Suspense } from "react";
import { QuotationBuilder } from "@/components/builder/QuotationBuilder";
import { Spinner } from "@/components/ui/primitives";

export const metadata = { title: "Buat Penawaran" };

export default function PenawaranBaruPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      }
    >
      <QuotationBuilder />
    </Suspense>
  );
}

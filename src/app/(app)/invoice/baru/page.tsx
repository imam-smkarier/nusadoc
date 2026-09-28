import { Suspense } from "react";
import { InvoiceBuilder } from "@/components/builder/InvoiceBuilder";
import { Spinner } from "@/components/ui/primitives";

export const metadata = { title: "Buat Invoice" };

export default function InvoiceBaruPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      }
    >
      <InvoiceBuilder />
    </Suspense>
  );
}

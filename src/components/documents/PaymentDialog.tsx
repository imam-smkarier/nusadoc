"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, PriceInput, Select, DateInput, TextArea } from "@/components/ui/form";
import { Button } from "@/components/ui/primitives";
import { Modal, useToast } from "@/components/ui/Modal";
import { useApp } from "@/lib/store";
import type { Invoice, Payment } from "@/lib/types";
import { formatRupiah, todayISO } from "@/lib/utils";
import { paymentSummaryOf } from "@/lib/calc";

/** Catat Pembayaran → kwitansi otomatis terbit (sekali final). */
export function PaymentDialog({ invoice, open, onClose }: { invoice: Invoice; open: boolean; onClose: () => void }) {
  const { addPayment, data } = useApp();
  const toast = useToast();
  const router = useRouter();
  const sum = useMemo(() => paymentSummaryOf(invoice, data.payments), [invoice, data.payments]);

  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState(sum.outstanding);
  const [method, setMethod] = useState<Payment["method"]>("Transfer Bank");
  const [note, setNote] = useState("");

  const over = amount > sum.outstanding;
  const valid = amount > 0 && !over && !!date;

  const submit = async () => {
    if (!valid) return;
    try {
      const receipt = await addPayment(invoice.id, {
        date,
        amount,
        method,
        note: note || undefined,
        forPaymentOf: `${invoice.subject}${invoice.terminLabel ? ` (${invoice.terminLabel})` : ""}`,
      });
      toast({
        tone: "success",
        title: "Pembayaran dicatat — kwitansi terbit",
        desc: `${receipt.number} · ${formatRupiah(receipt.amount)}`,
      });
      onClose();
      router.push(`/kwitansi/${receipt.id}`);
    } catch (e) {
      toast({
        tone: "error",
        title: "Pembayaran gagal dicatat",
        desc: e instanceof Error ? e.message : "Coba lagi",
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Catat Pembayaran"
      desc={`${invoice.number} · sisa ${formatRupiah(sum.outstanding)} dari ${formatRupiah(sum.total)}`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tanggal Pembayaran" required>
            <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Metode">
            <Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>
              {["Transfer Bank", "Tunai", "QRIS", "Virtual Account", "Cek/Giro"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Jumlah Diterima"
          required
          hint={over ? "Melebihi sisa tagihan — kwitansi tidak akan terbit." : `Kwitansi terbit otomatis setelah disimpan.`}
        >
          <PriceInput value={amount} onChangeValue={setAmount} className={over ? "border-red-300 focus:ring-red-100" : ""} />
        </Field>
        <Field label="Catatan (opsional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. transfer BCA a.n. klien…" className="min-h-[64px]" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!valid}>
            Simpan & Terbitkan Kwitansi
          </Button>
        </div>
      </div>
    </Modal>
  );
}

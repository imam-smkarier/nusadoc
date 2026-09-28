import { ValidateClient } from "@/components/documents/ValidateClient";

export const metadata = {
  title: "Validasi Dokumen",
  description: "Verifikasi keaslian dokumen PT. SMKarier Inovasi Digital melalui QR / token.",
};

/** Halaman validasi PUBLIK — tujuan scan QR, tanpa login. */
export default async function ValidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ValidateClient token={decodeURIComponent(token)} />;
}

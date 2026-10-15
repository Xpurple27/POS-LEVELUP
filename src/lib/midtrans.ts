import "server-only";
import midtransClient from "midtrans-client";

function configuration() {
  const mode = process.env.MIDTRANS_IS_PRODUCTION;
  if (mode !== "true" && mode !== "false") {
    throw new Error("MIDTRANS_IS_PRODUCTION wajib bernilai true atau false.");
  }
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!serverKey || !clientKey)
    throw new Error("Konfigurasi Midtrans belum lengkap.");
  if (
    mode === "true" &&
    (serverKey.startsWith("SB-") || clientKey.startsWith("SB-"))
  ) {
    throw new Error(
      "Kunci sandbox tidak boleh digunakan dalam mode production.",
    );
  }
  if (
    mode === "false" &&
    (!serverKey.startsWith("SB-") || !clientKey.startsWith("SB-"))
  ) {
    throw new Error("Mode sandbox memerlukan kunci sandbox Midtrans.");
  }
  return { isProduction: mode === "true", serverKey, clientKey };
}

let snap: InstanceType<typeof midtransClient.Snap> | undefined;
let core: InstanceType<typeof midtransClient.CoreApi> | undefined;
export function getMidtransSnap(): InstanceType<typeof midtransClient.Snap> {
  snap ??= new midtransClient.Snap(configuration());
  return snap;
}
export function getMidtransCore(): InstanceType<typeof midtransClient.CoreApi> {
  core ??= new midtransClient.CoreApi(configuration());
  return core;
}

import MemberQrCode from "../_components/MemberQrCode";

export default function QrPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12 flex flex-col items-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Mi QR de acceso</h1>
        <p className="text-muted-foreground text-sm">
          Muestra este código en la recepción
        </p>
      </div>
      <MemberQrCode size="lg" />
    </div>
  );
}

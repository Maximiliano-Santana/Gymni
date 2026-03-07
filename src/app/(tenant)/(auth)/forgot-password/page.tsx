import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <ForgotPasswordForm />
    </>
  );
}

import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Nueva contraseña</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Elige una nueva contraseña para tu cuenta
        </p>
      </div>

      <ResetPasswordForm />
    </>
  );
}

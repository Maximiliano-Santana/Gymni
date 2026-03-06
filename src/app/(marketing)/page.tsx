import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CreditCard,
  QrCode,
  Building2,
  BarChart3,
  Smartphone,
  Check,
  MessageCircle,
  ArrowRight,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";

const WHATSAPP_URL = "https://wa.me/5215613527205";

const features = [
  {
    icon: Users,
    title: "Gestión de miembros",
    description:
      "Alta, baja y control de membresías. Toda la info de tus miembros en un solo lugar.",
  },
  {
    icon: CreditCard,
    title: "Cobros automáticos",
    description:
      "Facturación recurrente, recordatorios de pago y detección automática de adeudos.",
  },
  {
    icon: QrCode,
    title: "Check-in con QR",
    description:
      "Registro de asistencia instantáneo. Escanea y listo, sin filas ni papeleo.",
  },
  {
    icon: Building2,
    title: "Multi-sucursal",
    description:
      "Gestiona varias sucursales desde una sola cuenta. Cada una con su propia configuración.",
  },
  {
    icon: BarChart3,
    title: "Dashboard en tiempo real",
    description:
      "Métricas clave de tu negocio: ingresos, membresías activas y más, todo al instante.",
  },
  {
    icon: Smartphone,
    title: "App para miembros",
    description:
      "Tus miembros consultan su membresía, pagos y estado desde su celular.",
  },
];

const steps = [
  {
    number: "1",
    title: "Crea tu gimnasio",
    description:
      "Regístrate y configura tu gimnasio en minutos. Personaliza colores, logo y planes de membresía.",
  },
  {
    number: "2",
    title: "Agrega miembros",
    description:
      "Importa o registra a tus miembros. Cada uno recibe acceso a su app personal.",
  },
  {
    number: "3",
    title: "Gestiona todo",
    description:
      "Cobros, check-ins, reportes y comunicación con miembros. Todo desde un solo lugar.",
  },
];

const plans = [
  {
    name: "Básico",
    price: "Gratis",
    period: "",
    description: "Para gimnasios que están empezando",
    features: [
      "Hasta 50 miembros",
      "Check-in con QR",
      "1 usuario staff",
      "Dashboard básico",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$499",
    period: "/mes",
    description: "Para gimnasios en crecimiento",
    features: [
      "Miembros ilimitados",
      "Cobros automáticos",
      "Staff ilimitado",
      "Dashboard avanzado",
      "Soporte prioritario",
    ],
    cta: "Comenzar prueba gratis",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Contacto",
    period: "",
    description: "Para cadenas y franquicias",
    features: [
      "Todo en Pro",
      "Multi-sucursal",
      "API personalizada",
      "Soporte dedicado",
      "Onboarding asistido",
    ],
    cta: "Contactar ventas",
    highlighted: false,
  },
];

export default async function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <Dumbbell className="size-6 text-primary" />
            Gym&i
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#funciones"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Funciones
            </a>
            <a
              href="#como-funciona"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cómo funciona
            </a>
            <a
              href="#precios"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Precios
            </a>
            <a
              href="#contacto"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contacto
            </a>
            <Button asChild size="sm">
              <Link href="/login">Comenzar</Link>
            </Button>
          </div>
          {/* Mobile: just show CTA */}
          <Button asChild size="sm" className="md:hidden">
            <Link href="/login">Comenzar</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center md:py-32">
          <Badge variant="secondary" className="mb-6">
            Software de gestión para gimnasios
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            La app para gestionar{" "}
            <span className="text-primary">tu gimnasio</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Miembros, cobros, check-in y más. Todo lo que necesitas para
            administrar tu gimnasio en una sola plataforma.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">
                Comenzar gratis
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#funciones">Ver funciones</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funciones" className="bg-muted/50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Todo lo que necesitas
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Herramientas diseñadas para que te enfoques en lo que importa: tus
              miembros.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/50">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="-mt-2">
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Cómo funciona
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              En tres pasos tienes tu gimnasio funcionando.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="bg-muted/50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Precios</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Planes flexibles que crecen con tu negocio.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "relative border-primary shadow-lg shadow-primary/10"
                    : ""
                }
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="size-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    <a href={plan.highlighted ? "/login" : "#contacto"}>
                      {plan.cta}
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="size-7 text-primary" />
            </div>
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            ¿Listo para empezar?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Escríbenos por WhatsApp y te ayudamos a configurar tu gimnasio en
            minutos. Sin compromisos.
          </p>
          <Button asChild size="lg">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-5" />
              Contactar por WhatsApp
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <Dumbbell className="size-5 text-primary" />
            Gym&i
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Gym&i. Todos los derechos
            reservados.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}

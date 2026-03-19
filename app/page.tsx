import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const PHOTOS = [
  {
    src: "https://images.unsplash.com/photo-1530143584546-02191bc84eb5?w=800&q=80",
    alt: "Corredores en maratón",
  },
  {
    src: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80",
    alt: "Runner en trail de montaña",
  },
  {
    src: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80",
    alt: "Equipo de running",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-[70vh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=1600&q=80"
          alt="Maratón de running"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 text-center text-white px-6 space-y-6 max-w-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-lg">
            🏃 WePlan
          </h1>
          <p className="text-xl text-white/90 drop-shadow">
            Gestioná los planes de entrenamiento de tu equipo de running.
            Subí PDFs mensuales para cada atleta y hacé que cada uno vea exactamente lo que necesita.
          </p>
          <div className="flex gap-4 justify-center pt-2">
            <Button size="lg" asChild className="text-base px-8">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base px-8 bg-white/10 border-white text-white hover:bg-white/20"
            >
              <Link href="/signup">Registrarse</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="bg-muted py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Para corredores que van en serio
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PHOTOS.map((photo) => (
              <div
                key={photo.src}
                className="relative h-56 rounded-xl overflow-hidden shadow-md"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-4xl">📋</div>
            <h3 className="font-semibold text-lg">Planes por runner</h3>
            <p className="text-muted-foreground text-sm">
              Cada atleta recibe su plan mensual personalizado en PDF.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-4xl">👥</div>
            <h3 className="font-semibold text-lg">Gestión de equipos</h3>
            <p className="text-muted-foreground text-sm">
              Organizá múltiples equipos y controlá quién pertenece a cada uno.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-4xl">🔒</div>
            <h3 className="font-semibold text-lg">Acceso seguro</h3>
            <p className="text-muted-foreground text-sm">
              Los runners se unen con código de invitación y ven solo sus propios planes.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

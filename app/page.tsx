import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">🏃 WePlan</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Gestión de planes de entrenamiento para equipos de running
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Iniciar sesión</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">Registrarse</Link>
        </Button>
      </div>
    </main>
  );
}

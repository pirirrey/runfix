"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  atLimit?: boolean;
  maxTeams?: number;
  planName?: string;
}

export function CreateTeamDialog({ atLimit = false, maxTeams, planName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Error al crear el equipo");
      setLoading(false);
      return;
    }

    toast.success("¡Equipo creado!");
    setOpen(false);
    form.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={atLimit ? undefined : setOpen}>
      <DialogTrigger asChild>
        <button
          disabled={atLimit}
          title={atLimit ? `Límite del plan ${planName ?? ""} alcanzado` : "Crear nuevo equipo"}
          onClick={() => !atLimit && setOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: atLimit ? "#1a1a1a" : "#a3e635",
            color: atLimit ? "#444" : "#000",
            border: atLimit ? "1px solid #2a2a2a" : "none",
            borderRadius: "0.625rem",
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem", fontWeight: 700,
            cursor: atLimit ? "not-allowed" : "pointer",
            whiteSpace: "nowrap" as const,
          }}
        >
          <span>+</span> Nuevo equipo
        </button>
      </DialogTrigger>
      <DialogContent style={{ background: "#161616", border: "1px solid #2a2a2a", color: "white" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "white" }}>Crear equipo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: "#ccc" }}>Nombre del equipo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej: Equipo Maratón 2026"
                      style={{ background: "#1a1a1a", border: "1px solid #333", color: "white" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: "#ccc" }}>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ej: Preparación para 42k"
                      style={{ background: "#1a1a1a", border: "1px solid #333", color: "white" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                style={{ borderColor: "#333", color: "#aaa", background: "transparent" }}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                style={{ background: "#a3e635", color: "#000", fontWeight: 700 }}
              >
                {loading ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

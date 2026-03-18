"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  plan_month: z.string().min(1, "Seleccioná un mes"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PlanUploadFormProps {
  teamId: string;
  runnerId: string;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function PlanUploadForm({ teamId, runnerId }: PlanUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { plan_month: "", notes: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!file) {
      toast.error("Seleccioná un archivo PDF");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("El archivo no puede superar los 10 MB");
      return;
    }

    setLoading(true);

    // Construir path: {teamId}/{runnerId}/{year}-{month}.pdf
    const [year, month] = values.plan_month.split("-");
    const storagePath = `${teamId}/${runnerId}/${year}-${month}.pdf`;

    const supabase = createClient();

    // Upload directo a Storage
    const { error: uploadError } = await supabase.storage
      .from("training-plans")
      .upload(storagePath, file, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      toast.error(`Error al subir el archivo: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    // Crear/actualizar registro en DB
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team_id: teamId,
        runner_id: runnerId,
        plan_month: `${year}-${month}-01`,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        notes: values.notes || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Error al guardar el plan");
      setLoading(false);
      return;
    }

    toast.success("Plan subido correctamente");
    form.reset();
    setFile(null);
    router.refresh();
    setLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="plan_month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mes del plan</FormLabel>
              <FormControl>
                <Input type="month" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File input */}
        <div className="space-y-2">
          <FormLabel>Archivo PDF</FormLabel>
          <Input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Observaciones del plan..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading || !file} className="w-full">
          {loading ? "Subiendo..." : "Subir plan"}
        </Button>
      </form>
    </Form>
  );
}

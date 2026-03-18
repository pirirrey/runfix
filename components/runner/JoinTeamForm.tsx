"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  invite_code: z.string().min(1, "Ingresá el código de invitación"),
});

type FormValues = z.infer<typeof schema>;

export function JoinTeamForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { invite_code: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const res = await fetch("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Error al unirse al equipo");
      setLoading(false);
      return;
    }

    toast.success(`¡Te uniste a ${data.team.name}!`);
    router.push("/runner/plans");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Unirse a un equipo</h1>
        <p className="text-muted-foreground text-sm">
          Ingresá el código que te dio tu entrenador
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="invite_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de invitación</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ej: A1B2C3D4"
                    className="font-mono uppercase tracking-widest"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Uniéndose..." : "Unirse al equipo"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

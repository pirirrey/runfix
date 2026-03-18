import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteCodeDisplay } from "@/components/coach/InviteCodeDisplay";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Cargar equipo
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, description, invite_code, coach_id")
    .eq("id", teamId)
    .single<{
      id: string;
      name: string;
      description: string | null;
      invite_code: string;
      coach_id: string;
    }>();

  if (!team || team.coach_id !== user.id) notFound();

  type Membership = {
    id: string;
    joined_at: string;
    profiles: { id: string; full_name: string | null; email: string };
  };

  // Cargar runners del equipo
  const { data: memberships } = await supabase
    .from("team_memberships")
    .select(`
      id, joined_at,
      profiles:runner_id (id, full_name, email)
    `)
    .eq("team_id", teamId)
    .order("joined_at")
    .returns<Membership[]>();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/coach/teams"
            className="text-sm text-muted-foreground hover:underline mb-1 block"
          >
            ← Mis equipos
          </Link>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {team.description && (
            <p className="text-muted-foreground">{team.description}</p>
          )}
        </div>
      </div>

      {/* Código de invitación */}
      <InviteCodeDisplay code={team.invite_code} />

      {/* Runners */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Runners{" "}
          <Badge variant="secondary">{memberships?.length ?? 0}</Badge>
        </h2>

        {memberships?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            <p className="text-3xl mb-2">🏃</p>
            <p>Todavía no hay runners en este equipo.</p>
            <p className="text-sm">
              Compartí el código de invitación para que se unan.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Runner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Se unió</TableHead>
                <TableHead className="text-right">Planes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships?.map((m) => {
                const profile = m.profiles;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {profile.full_name ?? profile.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joined_at).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/coach/teams/${teamId}/runners/${profile.id}`}
                        >
                          Ver planes
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

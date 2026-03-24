export type PlanId = "starter" | "pro" | "elite";

export const PLANS = [
  {
    id: "starter" as PlanId,
    name: "Starter",
    badge: null,
    price: "Gratis",
    priceNote: "sin límite de tiempo",
    highlight: false,
    limits: "1 sede · 1 equipo · hasta 8 runners",
    features: [
      { label: "1 sede de entrenamiento" },
      { label: "1 grupo de entrenamiento" },
      { label: "Hasta 8 runners" },
      { label: "Planes PDF por runner" },
      { label: "Objetivos de carrera" },
      { label: "Logros y resultados" },
      { label: "Gestión de pagos", disabled: true },
      { label: "Certificados médicos", disabled: true },
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    badge: "Más popular",
    price: "$30.000",
    priceNote: "ARS / mes",
    highlight: true,
    limits: "3 sedes · 3 equipos · hasta 50 runners",
    features: [
      { label: "Hasta 3 sedes" },
      { label: "3 grupos de entrenamiento" },
      { label: "Hasta 50 runners" },
      { label: "Planes PDF por runner" },
      { label: "Objetivos de carrera" },
      { label: "Logros y resultados" },
      { label: "Gestión de pagos" },
      { label: "Certificados médicos" },
    ],
  },
  {
    id: "elite" as PlanId,
    name: "Elite",
    badge: null,
    price: "$50.000",
    priceNote: "ARS / mes",
    highlight: false,
    limits: "Sedes, equipos y runners ilimitados",
    features: [
      { label: "Sedes ilimitadas" },
      { label: "Equipos ilimitados" },
      { label: "Runners ilimitados" },
      { label: "Planes PDF por runner" },
      { label: "Objetivos de carrera" },
      { label: "Logros y resultados" },
      { label: "Gestión de pagos" },
      { label: "Certificados médicos" },
    ],
  },
];

/** null = sin límite */
export const PLAN_LIMITS: Record<PlanId, { maxTeams: number | null; maxRunners: number | null; maxVenues: number | null }> = {
  starter: { maxTeams: 1,    maxRunners: 8,  maxVenues: 1    },
  pro:     { maxTeams: 3,    maxRunners: 50, maxVenues: 3    },
  elite:   { maxTeams: null, maxRunners: null, maxVenues: null },
};

export const PLAN_CONFIG: Record<PlanId, { color: string; bg: string; border: string }> = {
  starter: { color: "#888",    bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" },
  pro:     { color: "#a3e635", bg: "rgba(163,230,53,0.07)",  border: "rgba(163,230,53,0.2)"  },
  elite:   { color: "#f59e0b", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)"  },
};

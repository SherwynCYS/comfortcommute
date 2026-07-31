/**
 * Singapore public transport fare estimation.
 * Distance-based fares (approximation of the LTA fare table) with
 * concession multipliers driven by the traveller's fare card.
 */

export type CardType =
  | "adult_card"
  | "student_card"
  | "senior_card"
  | "workfare_card"
  | "disability_card"
  | "cash";

export type Occupation =
  | "student"
  | "working_adult"
  | "national_service"
  | "senior"
  | "job_seeker"
  | "other";

export const CARD_TYPES: { value: CardType; label: string; description: string }[] = [
  { value: "adult_card", label: "Adult card", description: "Standard EZ-Link / SimplyGo adult fares" },
  { value: "student_card", label: "Student concession", description: "Lowest concession fares" },
  { value: "senior_card", label: "Senior citizen concession", description: "For commuters aged 60 and above" },
  { value: "workfare_card", label: "Workfare transport concession", description: "For eligible lower-wage workers" },
  { value: "disability_card", label: "Persons with disabilities concession", description: "PWD concession fares" },
  { value: "cash", label: "Cash / single trip", description: "Highest fares, no transfer rebate" },
];

export const OCCUPATIONS: {
  value: Occupation;
  label: string;
  suggestedCard: CardType;
}[] = [
  { value: "student", label: "Student", suggestedCard: "student_card" },
  { value: "working_adult", label: "Working adult", suggestedCard: "adult_card" },
  { value: "national_service", label: "National serviceman", suggestedCard: "adult_card" },
  { value: "senior", label: "Senior / retiree", suggestedCard: "senior_card" },
  { value: "job_seeker", label: "Between jobs", suggestedCard: "workfare_card" },
  { value: "other", label: "Other", suggestedCard: "adult_card" },
];

const CARD_MULTIPLIER: Record<CardType, number> = {
  adult_card: 1,
  student_card: 0.45,
  senior_card: 0.62,
  workfare_card: 0.75,
  disability_card: 0.5,
  cash: 1,
};

/** Adult card fare in cents for a given ride distance in km. */
function adultCardFareCents(distanceKm: number): number {
  const d = Math.max(0, distanceKm);
  if (d <= 3.2) return 109;
  return Math.min(234, 109 + Math.ceil((d - 3.2) / 1) * 6);
}

export type FareInput = {
  /** Total in-vehicle distance for the journey, in km. */
  distanceKm: number;
  cardType: CardType;
  /** Number of paid boardings (bus/train legs). Walking legs don't count. */
  boardings: number;
};

/** Estimated journey fare in cents. */
export function estimateFareCents({ distanceKm, cardType, boardings }: FareInput): number {
  const legs = Math.max(0, boardings);
  if (legs === 0) return 0;

  if (cardType === "cash") {
    // Cash pays per boarding with no distance-based transfer rebate.
    const perLegKm = distanceKm / legs;
    return legs * (adultCardFareCents(perLegKm) + 60);
  }

  // Card journeys are charged once on total distance across transfers.
  const base = adultCardFareCents(distanceKm);
  return Math.max(30, Math.round(base * CARD_MULTIPLIER[cardType]));
}

export function formatFare(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function cardLabel(cardType: string): string {
  return CARD_TYPES.find((c) => c.value === cardType)?.label ?? "Adult card";
}

export function occupationLabel(occupation: string): string {
  return OCCUPATIONS.find((o) => o.value === occupation)?.label ?? "Commuter";
}

export function isCardType(value: unknown): value is CardType {
  return CARD_TYPES.some((c) => c.value === value);
}

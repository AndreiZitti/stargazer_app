import { redirect } from "next/navigation";

// Force dynamic rendering so redirect uses current date, not build date
export const dynamic = "force-dynamic";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

export default function GuidePage() {
  const currentMonth = MONTHS[new Date().getMonth()];
  redirect(`/guide/${currentMonth}`);
}

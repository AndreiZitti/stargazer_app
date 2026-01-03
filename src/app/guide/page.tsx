import { redirect } from "next/navigation";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

export default function GuidePage() {
  const currentMonth = MONTHS[new Date().getMonth()];
  redirect(`/guide/${currentMonth}`);
}

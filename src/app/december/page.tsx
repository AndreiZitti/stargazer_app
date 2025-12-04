import SkyGuide from "@/components/SkyGuide";
import { getDSOsForMonth, getShowersForMonth, getMoonDataForMonth } from "@/lib/sky-data";

export const metadata = {
  title: "December Night Sky Guide - Stargazer",
  description: "Deep sky objects, meteor showers, and moon phases for December stargazing in Europe",
};

export default function DecemberPage() {
  const dsos = getDSOsForMonth("December");
  const showers = getShowersForMonth("December");
  const moonData = getMoonDataForMonth("2025", "december");

  // Fallback moon data if not found
  const moon = moonData || {
    newMoon: "2025-12-20",
    fullMoon: { date: "2025-12-04", name: "Cold Moon" },
    darkSkyWindows: [{ start: "2025-12-16", end: "2025-12-24", quality: "excellent" }],
  };

  return (
    <SkyGuide
      month="December"
      year={2025}
      daysInMonth={31}
      dsos={dsos}
      showers={showers}
      moonData={moon}
      otherMonth="January"
    />
  );
}

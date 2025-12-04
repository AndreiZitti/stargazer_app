import SkyGuide from "@/components/SkyGuide";
import { getDSOsForMonth, getShowersForMonth, getMoonDataForMonth } from "@/lib/sky-data";

export const metadata = {
  title: "January Night Sky Guide - Stargazer",
  description: "Deep sky objects, meteor showers, and moon phases for January stargazing in Europe",
};

export default function JanuaryPage() {
  const dsos = getDSOsForMonth("January");
  const showers = getShowersForMonth("January");
  const moonData = getMoonDataForMonth("2026", "january");

  // Fallback moon data if not found
  const moon = moonData || {
    newMoon: "2026-01-11",
    fullMoon: { date: "2026-01-25", name: "Wolf Moon" },
    darkSkyWindows: [{ start: "2026-01-07", end: "2026-01-15", quality: "excellent" }],
  };

  return (
    <SkyGuide
      month="January"
      year={2026}
      daysInMonth={31}
      dsos={dsos}
      showers={showers}
      moonData={moon}
      otherMonth="December"
    />
  );
}

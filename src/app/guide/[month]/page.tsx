import { notFound } from "next/navigation";
import SkyGuide from "@/components/SkyGuide";
import { getDSOsForMonth, getShowersForMonth, getMoonDataForMonth } from "@/lib/sky-data";

const MONTH_DATA: Record<string, {
  name: string;
  days: number;
  year: number;
  fallbackMoon: { newMoon: string; fullMoon: { date: string; name: string }; darkSkyWindows: { start: string; end: string; quality: string }[] }
}> = {
  january: {
    name: "January",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-01-11",
      fullMoon: { date: "2026-01-25", name: "Wolf Moon" },
      darkSkyWindows: [{ start: "2026-01-07", end: "2026-01-15", quality: "excellent" }],
    }
  },
  february: {
    name: "February",
    days: 28,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-02-09",
      fullMoon: { date: "2026-02-23", name: "Snow Moon" },
      darkSkyWindows: [{ start: "2026-02-05", end: "2026-02-13", quality: "excellent" }],
    }
  },
  march: {
    name: "March",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-03-11",
      fullMoon: { date: "2026-03-25", name: "Worm Moon" },
      darkSkyWindows: [{ start: "2026-03-07", end: "2026-03-15", quality: "excellent" }],
    }
  },
  april: {
    name: "April",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-04-10",
      fullMoon: { date: "2026-04-24", name: "Pink Moon" },
      darkSkyWindows: [{ start: "2026-04-06", end: "2026-04-14", quality: "excellent" }],
    }
  },
  may: {
    name: "May",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-05-09",
      fullMoon: { date: "2026-05-23", name: "Flower Moon" },
      darkSkyWindows: [{ start: "2026-05-05", end: "2026-05-13", quality: "excellent" }],
    }
  },
  june: {
    name: "June",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-06-08",
      fullMoon: { date: "2026-06-22", name: "Strawberry Moon" },
      darkSkyWindows: [{ start: "2026-06-04", end: "2026-06-12", quality: "good" }],
    }
  },
  july: {
    name: "July",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-07-07",
      fullMoon: { date: "2026-07-21", name: "Buck Moon" },
      darkSkyWindows: [{ start: "2026-07-03", end: "2026-07-11", quality: "good" }],
    }
  },
  august: {
    name: "August",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-08-06",
      fullMoon: { date: "2026-08-20", name: "Sturgeon Moon" },
      darkSkyWindows: [{ start: "2026-08-02", end: "2026-08-10", quality: "excellent" }],
    }
  },
  september: {
    name: "September",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-09-04",
      fullMoon: { date: "2026-09-18", name: "Harvest Moon" },
      darkSkyWindows: [{ start: "2026-08-31", end: "2026-09-08", quality: "excellent" }],
    }
  },
  october: {
    name: "October",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-10-03",
      fullMoon: { date: "2026-10-18", name: "Hunter's Moon" },
      darkSkyWindows: [{ start: "2026-09-29", end: "2026-10-07", quality: "excellent" }],
    }
  },
  november: {
    name: "November",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-11-02",
      fullMoon: { date: "2026-11-16", name: "Beaver Moon" },
      darkSkyWindows: [{ start: "2026-10-29", end: "2026-11-06", quality: "excellent" }],
    }
  },
  december: {
    name: "December",
    days: 31,
    year: 2025,
    fallbackMoon: {
      newMoon: "2025-12-20",
      fullMoon: { date: "2025-12-04", name: "Cold Moon" },
      darkSkyWindows: [{ start: "2025-12-16", end: "2025-12-24", quality: "excellent" }],
    }
  },
};

interface Props {
  params: Promise<{ month: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { month } = await params;
  const monthData = MONTH_DATA[month.toLowerCase()];

  if (!monthData) {
    return { title: "Not Found" };
  }

  return {
    title: `${monthData.name} Night Sky Guide - Stargazer`,
    description: `Deep sky objects, meteor showers, and moon phases for ${monthData.name} stargazing in Europe`,
  };
}

export function generateStaticParams() {
  return Object.keys(MONTH_DATA).map((month) => ({ month }));
}

export default async function MonthGuidePage({ params }: Props) {
  const { month } = await params;
  const monthData = MONTH_DATA[month.toLowerCase()];

  if (!monthData) {
    notFound();
  }

  const dsos = getDSOsForMonth(monthData.name);
  const showers = getShowersForMonth(monthData.name);
  const moonData = getMoonDataForMonth(String(monthData.year), month.toLowerCase());

  const moon = moonData || monthData.fallbackMoon;

  return (
    <SkyGuide
      month={monthData.name}
      year={monthData.year}
      daysInMonth={monthData.days}
      dsos={dsos}
      showers={showers}
      moonData={moon}
    />
  );
}

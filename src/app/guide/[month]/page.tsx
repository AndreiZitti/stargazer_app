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
      newMoon: "2026-01-18",
      fullMoon: { date: "2026-01-03", name: "Wolf Moon" },
      darkSkyWindows: [{ start: "2026-01-14", end: "2026-01-22", quality: "excellent" }],
    }
  },
  february: {
    name: "February",
    days: 28,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-02-17",
      fullMoon: { date: "2026-02-01", name: "Snow Moon" },
      darkSkyWindows: [{ start: "2026-02-13", end: "2026-02-21", quality: "excellent" }],
    }
  },
  march: {
    name: "March",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-03-19",
      fullMoon: { date: "2026-03-03", name: "Worm Moon" },
      darkSkyWindows: [{ start: "2026-03-15", end: "2026-03-23", quality: "excellent" }],
    }
  },
  april: {
    name: "April",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-04-17",
      fullMoon: { date: "2026-04-02", name: "Pink Moon" },
      darkSkyWindows: [{ start: "2026-04-13", end: "2026-04-21", quality: "excellent" }],
    }
  },
  may: {
    name: "May",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-05-16",
      fullMoon: { date: "2026-05-01", name: "Flower Moon" },
      darkSkyWindows: [{ start: "2026-05-12", end: "2026-05-20", quality: "excellent" }],
    }
  },
  june: {
    name: "June",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-06-15",
      fullMoon: { date: "2026-06-30", name: "Strawberry Moon" },
      darkSkyWindows: [{ start: "2026-06-11", end: "2026-06-19", quality: "excellent" }],
    }
  },
  july: {
    name: "July",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-07-14",
      fullMoon: { date: "2026-07-29", name: "Buck Moon" },
      darkSkyWindows: [{ start: "2026-07-10", end: "2026-07-18", quality: "excellent" }],
    }
  },
  august: {
    name: "August",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-08-12",
      fullMoon: { date: "2026-08-28", name: "Sturgeon Moon" },
      darkSkyWindows: [{ start: "2026-08-08", end: "2026-08-16", quality: "excellent" }],
    }
  },
  september: {
    name: "September",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-09-11",
      fullMoon: { date: "2026-09-26", name: "Harvest Moon" },
      darkSkyWindows: [{ start: "2026-09-07", end: "2026-09-15", quality: "excellent" }],
    }
  },
  october: {
    name: "October",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-10-10",
      fullMoon: { date: "2026-10-26", name: "Hunter's Moon" },
      darkSkyWindows: [{ start: "2026-10-06", end: "2026-10-14", quality: "excellent" }],
    }
  },
  november: {
    name: "November",
    days: 30,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-11-09",
      fullMoon: { date: "2026-11-24", name: "Beaver Moon" },
      darkSkyWindows: [{ start: "2026-11-05", end: "2026-11-13", quality: "excellent" }],
    }
  },
  december: {
    name: "December",
    days: 31,
    year: 2026,
    fallbackMoon: {
      newMoon: "2026-12-09",
      fullMoon: { date: "2026-12-24", name: "Cold Moon" },
      darkSkyWindows: [{ start: "2026-12-05", end: "2026-12-13", quality: "excellent" }],
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

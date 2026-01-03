"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    id: "map",
    label: "Map",
    href: "/",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "sky",
    label: "Sky",
    href: "/sky-lab",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        <path strokeLinecap="round" strokeWidth={1.5} d="M2 12h20" />
      </svg>
    ),
  },
  {
    id: "guide",
    label: "Guide",
    href: "/guide",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === "map") return pathname === "/";
    if (tab.id === "sky") return pathname.startsWith("/sky-lab");
    if (tab.id === "guide") return pathname.startsWith("/guide") || pathname === "/december" || pathname === "/january";
    return pathname === tab.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1001] bg-card/95 backdrop-blur-sm border-t border-card-border safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? "text-accent" : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

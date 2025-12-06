export interface Coordinates {
  lat: number;
  lng: number;
}

export interface HourlyCondition {
  hour: number; // 0-23
  cloudCover: number;
  icon: "clear" | "partly" | "cloudy" | "rainy";
}

export interface TonightForecast {
  hours: HourlyCondition[];
  overallScore: number;
  bestHour: number;
  summary: string; // e.g., "Mostly clear after 10pm"
}

export interface GeocodedLocation extends Coordinates {
  displayName: string;
}

export interface LightPollutionData {
  resolution: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  grid: number[][];
}

export interface SpotResult {
  radius: number;
  lat: number;
  lng: number;
  bortle: number;
  label: string;
}

export interface SpotsResponse {
  origin: GeocodedLocation;
  spots: SpotResult[];
}

export interface WeatherForecast {
  date: string;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  precipitation: number;
  visibility: "Excellent" | "Good" | "Fair" | "Poor";
  stargazingScore: number; // 0-100
  sunrise: string;
  sunset: string;
}

export interface SkyEvent {
  name: string;
  dates: string;
  description: string;
  type: "meteor_shower" | "planet" | "eclipse" | "conjunction" | "other";
}

export interface MoonPhase {
  newMoon: string;
  fullMoon: string;
}

export interface MonthlyEvents {
  month: string;
  updated: string;
  highlights: SkyEvent[];
  moonPhase: MoonPhase;
}

// Accessibility types for spot finder
export interface AccessibilityFeature {
  type: 'parking' | 'park' | 'viewpoint' | 'road';
  name?: string;
  distance: number; // meters from spot
}

export interface AccessibilityScore {
  score: number;
  features: AccessibilityFeature[];
}

export interface SpotCandidate {
  lat: number;
  lng: number;
  bortle: number;
  distance: number; // km from origin
}

export interface ScoredSpot extends SpotResult {
  accessibilityScore: number;
  accessibilityFeatures: AccessibilityFeature[];
}

export interface SpotsResponseV2 {
  origin: GeocodedLocation;
  searchLocation: Coordinates;
  spots: ScoredSpot[];
}

// User profile types
export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bortle?: number;
  label?: string;
  savedAt: string; // ISO date
  notes?: string;
}

export interface UserProfile {
  name: string;
  createdAt: string;
  lastVisit: string;
}

export interface UserData {
  profile: UserProfile;
  savedPlaces: SavedPlace[];
}

// Deep Sky Object types
export interface DSONames {
  primary: string;
  catalog: string[];
  other: string[];
}

export interface DSOPhysical {
  type: string;
  type_short: string;
  constellation: string;
  magnitude_visual: number | null;
  surface_brightness?: number;
  size_arcmin: string | null;
  distance_ly: number;
}

export interface DSOVisibility {
  best_months: string[];
  peak_month: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  equipment_minimum: 'naked_eye' | 'binoculars' | 'small_telescope' | 'large_telescope';
  equipment_recommended: string;
}

export interface DSOFinding {
  naked_eye_guide: string;
  constellation_context: string;
  star_hop: { step: number; instruction: string }[];
  nearby_bright_stars: string[];
}

export interface DSOObservation {
  naked_eye: string;
  binoculars: string;
  small_telescope: string;
  large_telescope: string;
  best_magnification: string;
  special_equipment?: string;
}

export interface DSOScience {
  short_description: string;
  full_description: string;
  interesting_facts: string[];
}

export interface DSOStellarium {
  skysource_id: string;
  default_fov: number;
  views?: {
    context?: { description: string; fov: number; center: string };
    medium?: { description: string; fov: number; center: string };
    detail?: { description: string; fov: number; center: string };
  };
}

export interface DeepSkyObject {
  id: string;
  names: DSONames;
  coordinates: {
    ra: string;
    ra_decimal: number;
    dec: string;
    dec_decimal: number;
  };
  physical: DSOPhysical;
  visibility: DSOVisibility;
  finding: DSOFinding;
  observation: DSOObservation;
  science: DSOScience;
  related_objects: string[];
  stellarium?: DSOStellarium;
}

// Meteor Shower types
export interface MeteorShowerRadiant {
  constellation: string;
  ra: string;
  dec: string;
  notes: string;
}

export interface MeteorShowerViewing {
  time: string;
  direction: string;
  notes: string;
}

export interface MoonInterference {
  phase: string;
  rating: 'none' | 'minimal' | 'low' | 'moderate' | 'high';
  notes: string;
}

export interface MeteorShower {
  id: string;
  name: string;
  peak_date: string;
  active_period: {
    start: string;
    end: string;
  };
  zhr: number;
  zhr_notes: string;
  speed_km_s: number;
  speed_description: string;
  radiant: MeteorShowerRadiant;
  parent_body: string;
  moon_interference_2026?: MoonInterference | null;
  moon_interference_2027?: MoonInterference | null;
  best_viewing: MeteorShowerViewing;
  description: string;
  photography_tips: string;
}

// Moon Phase calendar types
export interface FullMoonInfo {
  date: string;
  name: string;
  time_utc?: string;
  notes?: string;
}

export interface DarkSkyWindow {
  start: string;
  end: string;
  quality: 'excellent' | 'good' | 'fair';
}

export interface SpecialEvent {
  type: string;
  date: string;
  visible_europe?: boolean;
  notes?: string;
}

export interface MonthPhases {
  first_quarter?: string;
  full_moon: FullMoonInfo;
  last_quarter?: string;
  new_moon: string | { date: string; notes?: string };
  full_moon_2?: FullMoonInfo;
  new_moon_2?: string;
  last_quarter_2?: string;
  dark_sky_windows: DarkSkyWindow[];
  special_events?: SpecialEvent[];
}

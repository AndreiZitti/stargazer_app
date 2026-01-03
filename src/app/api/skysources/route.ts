import { NextRequest, NextResponse } from "next/server";

// Use CDS Sesame name resolver (Simbad/NED/VizieR) since NoctuaSky API is deprecated
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") || "";

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // Use Sesame XML service from CDS Strasbourg
  const url = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxI/SNV?${encodeURIComponent(q)}`;

  try {
    const response = await fetch(url);
    const xmlText = await response.text();

    // Parse the XML response
    const results = parseSesamXML(xmlText, q);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Sesame API error:", error);
    return NextResponse.json({ error: "Failed to fetch from Sesame API" }, { status: 500 });
  }
}

interface SkySource {
  match: string;
  short_name: string;
  types: string[];
  ra: number;
  dec: number;
  names_i18n?: string[];
}

function parseSesamXML(xml: string, query: string): SkySource[] {
  const results: SkySource[] = [];

  // Extract resolver blocks
  const resolverMatches = xml.matchAll(/<Resolver[^>]*>([\s\S]*?)<\/Resolver>/g);

  for (const match of resolverMatches) {
    const block = match[1];

    // Extract main name and clean up spaces
    const onameMatch = block.match(/<oname>([^<]+)<\/oname>/);
    let name = onameMatch ? onameMatch[1].trim().replace(/\s+/g, ' ') : query;

    // Extract object type
    const otypeMatch = block.match(/<otype>([^<]+)<\/otype>/);
    const otype = otypeMatch ? otypeMatch[1].trim() : "";

    // Extract coordinates
    const raMatch = block.match(/<jradeg>([^<]+)<\/jradeg>/);
    const decMatch = block.match(/<jdedeg>([^<]+)<\/jdedeg>/);
    const ra = raMatch ? parseFloat(raMatch[1]) : 0;
    const dec = decMatch ? parseFloat(decMatch[1]) : 0;

    // Extract aliases and clean up
    const aliases: string[] = [];
    const aliasMatches = block.matchAll(/<alias>([^<]+)<\/alias>/g);
    for (const aliasMatch of aliasMatches) {
      const alias = aliasMatch[1].trim().replace(/\s+/g, ' ');
      aliases.push(alias);

      // Also add compact version for catalog numbers
      if (/^[A-Z]+\s+\d+/.test(alias)) {
        aliases.push(alias.replace(/\s+/g, ''));
      }
    }

    // Find the best display name (prefer NAME aliases)
    let displayName = name;
    for (const alias of aliases) {
      if (alias.startsWith('NAME ')) {
        displayName = alias.replace('NAME ', '');
        break;
      }
    }

    // Map object types to readable names
    const typeMap: Record<string, string> = {
      "HII": "HII Region",
      "Neb": "Nebula",
      "PN": "Planetary Nebula",
      "SNR": "Supernova Remnant",
      "G": "Galaxy",
      "GlC": "Globular Cluster",
      "OpC": "Open Cluster",
      "Cl*": "Star Cluster",
      "*": "Star",
      "**": "Double Star",
      "V*": "Variable Star",
      "Psr": "Pulsar",
      "QSO": "Quasar",
      "AGN": "Active Galaxy",
    };

    const readableType = typeMap[otype] || otype || "Celestial Object";

    // Build comprehensive list of names to try
    const allNames = [displayName, name];

    // Add Messier/NGC compact versions
    if (/^M\s*\d+$/.test(name)) {
      allNames.push(name.replace(/\s+/g, '')); // M42
      allNames.push('M ' + name.replace(/\D/g, '')); // M 42
    }

    // Add important aliases (NGC, IC, NAME, etc.)
    for (const alias of aliases) {
      if (alias.startsWith('NGC') || alias.startsWith('IC') ||
          alias.startsWith('NAME') || alias.startsWith('M ') ||
          /^M\d+$/.test(alias)) {
        allNames.push(alias);
        allNames.push(alias.replace(/\s+/g, ''));
      }
    }

    // Add remaining aliases
    allNames.push(...aliases.slice(0, 10));

    // Remove duplicates
    const uniqueNames = [...new Set(allNames)];

    results.push({
      match: displayName,
      short_name: `NAME ${displayName}`,
      types: [readableType],
      ra,
      dec,
      names_i18n: uniqueNames
    });

    // Only take first result to avoid duplicates
    break;
  }

  // If no results from Sesame, add common objects search
  if (results.length === 0) {
    const commonObjects = searchCommonObjects(query);
    results.push(...commonObjects);
  }

  return results;
}

// Fallback: search in common astronomical objects
function searchCommonObjects(query: string): SkySource[] {
  const q = query.toLowerCase();

  const commonObjects: SkySource[] = [
    { match: "Polaris", short_name: "NAME Polaris", types: ["Star"], ra: 37.95, dec: 89.26, names_i18n: ["Polaris", "North Star", "Alpha Ursae Minoris"] },
    { match: "Sirius", short_name: "NAME Sirius", types: ["Star"], ra: 101.29, dec: -16.72, names_i18n: ["Sirius", "Alpha Canis Majoris", "Dog Star"] },
    { match: "Vega", short_name: "NAME Vega", types: ["Star"], ra: 279.23, dec: 38.78, names_i18n: ["Vega", "Alpha Lyrae"] },
    { match: "Betelgeuse", short_name: "NAME Betelgeuse", types: ["Star"], ra: 88.79, dec: 7.41, names_i18n: ["Betelgeuse", "Alpha Orionis"] },
    { match: "Rigel", short_name: "NAME Rigel", types: ["Star"], ra: 78.63, dec: -8.20, names_i18n: ["Rigel", "Beta Orionis"] },
    { match: "Mars", short_name: "NAME Mars", types: ["Planet"], ra: 0, dec: 0, names_i18n: ["Mars"] },
    { match: "Jupiter", short_name: "NAME Jupiter", types: ["Planet"], ra: 0, dec: 0, names_i18n: ["Jupiter"] },
    { match: "Saturn", short_name: "NAME Saturn", types: ["Planet"], ra: 0, dec: 0, names_i18n: ["Saturn"] },
    { match: "Venus", short_name: "NAME Venus", types: ["Planet"], ra: 0, dec: 0, names_i18n: ["Venus"] },
    { match: "Moon", short_name: "NAME Moon", types: ["Satellite"], ra: 0, dec: 0, names_i18n: ["Moon", "Luna"] },
    { match: "Andromeda Galaxy", short_name: "NAME Andromeda Galaxy", types: ["Galaxy"], ra: 10.68, dec: 41.27, names_i18n: ["Andromeda Galaxy", "M31", "NGC 224"] },
    { match: "Orion Nebula", short_name: "NAME Orion Nebula", types: ["Nebula"], ra: 83.82, dec: -5.39, names_i18n: ["Orion Nebula", "M42", "NGC 1976"] },
    { match: "Pleiades", short_name: "NAME Pleiades", types: ["Open Cluster"], ra: 56.87, dec: 24.12, names_i18n: ["Pleiades", "M45", "Seven Sisters"] },
  ];

  return commonObjects.filter(obj =>
    obj.match.toLowerCase().includes(q) ||
    obj.names_i18n?.some(n => n.toLowerCase().includes(q))
  );
}

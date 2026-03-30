import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Load restaurant data at cold start
let allRestaurants;
try {
  const dataPath = join(process.cwd(), "public", "data", "restaurants.json");
  allRestaurants = JSON.parse(readFileSync(dataPath, "utf-8"));
} catch {
  allRestaurants = [];
}

const PROGRAMS = [
  {
    id: "chase_sapphire",
    name: "Chase Sapphire Reserve",
    description: "Premium dining benefits through OpenTable partnership",
    card_required: "Chase Sapphire Reserve",
    benefit_description: "Dining credits at participating OpenTable restaurants. Credits work even as walk-ins without advance reservations.",
    dataKey: "chase",
  },
  {
    id: "amex_gda",
    name: "Amex Global Dining Access",
    description: "Global Dining Access by Resy for American Express Platinum and Centurion cardholders",
    card_required: "Amex Platinum / Centurion",
    benefit_description: "Dining credits at participating Resy restaurants. Credits work even as walk-ins without advance reservations.",
    dataKey: "amex",
  },
];

function programIdToDataKey(programId) {
  const prog = PROGRAMS.find((p) => p.id === programId);
  return prog ? prog.dataKey : programId;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildRefUrl(baseUrl) {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("ref", "ReserveMap");
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function formatRestaurant(r) {
  return {
    name: r.name,
    program: r.program === "chase" ? "chase_sapphire" : "amex_gda",
    city: r.city || null,
    state: r.state || null,
    address: r.address || null,
    cuisine: r.cuisine || null,
    neighborhood: r.neighborhood || null,
    website: r.website || null,
    reservation_url: buildRefUrl(r.bookingUrl),
    coordinates: { lat: r.lat, lon: r.lon },
  };
}

function createServer() {
  const server = new McpServer({
    name: "ReserveMap",
    version: "1.0.0",
  });

  // 1. search_restaurants
  server.tool(
    "search_restaurants",
    "Search for restaurants participating in premium credit card dining programs (Chase Sapphire Reserve, Amex Global Dining Access). Supports filtering by program, city, state, and text query. Credits work even as walk-ins.",
    {
      query: z.string().optional().describe("Search term (restaurant name, cuisine, neighborhood)"),
      program: z.enum(["chase_sapphire", "amex_gda"]).optional().describe("Filter by credit card dining program"),
      city: z.string().optional().describe("Filter by city name"),
      state: z.string().optional().describe("Filter by US state (2-letter code)"),
      limit: z.number().optional().describe("Max results to return (default 20)"),
    },
    async (args) => {
      let results = [...allRestaurants];
      if (args.query) {
        const q = args.query.toLowerCase();
        results = results.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.city && r.city.toLowerCase().includes(q)) ||
            (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
            (r.neighborhood && r.neighborhood.toLowerCase().includes(q))
        );
      }
      if (args.program) {
        const dataKey = programIdToDataKey(args.program);
        results = results.filter((r) => r.program === dataKey);
      }
      if (args.city) results = results.filter((r) => r.city && r.city.toLowerCase() === args.city.toLowerCase());
      if (args.state) results = results.filter((r) => r.state && r.state.toLowerCase() === args.state.toLowerCase());

      const limited = results.slice(0, args.limit || 20);
      return {
        content: [{ type: "text", text: JSON.stringify(limited.map(formatRestaurant), null, 2) }],
      };
    }
  );

  // 2. get_restaurant_details
  server.tool(
    "get_restaurant_details",
    "Get full details for a specific restaurant including all dining programs it participates in, address, coordinates, website, and reservation links.",
    {
      name: z.string().describe("Restaurant name to look up"),
      city: z.string().optional().describe("City to disambiguate if multiple matches"),
    },
    async (args) => {
      const q = args.name.toLowerCase();
      let matches = allRestaurants.filter((r) => r.name.toLowerCase() === q);
      if (matches.length === 0) {
        matches = allRestaurants.filter((r) => r.name.toLowerCase().includes(q));
      }
      if (args.city) {
        const cityQ = args.city.toLowerCase();
        const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
        if (cityFiltered.length > 0) matches = cityFiltered;
      }
      if (matches.length === 0) {
        return { content: [{ type: "text", text: "No restaurant found matching that name." }] };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(matches.map(formatRestaurant), null, 2) }],
      };
    }
  );

  // 3. list_programs
  server.tool(
    "list_programs",
    "List all available premium credit card dining programs with descriptions, card requirements, and restaurant counts.",
    {},
    async () => {
      const programsWithCounts = PROGRAMS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        card_required: p.card_required,
        benefit_description: p.benefit_description,
        restaurant_count: allRestaurants.filter((r) => r.program === p.dataKey).length,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(programsWithCounts, null, 2) }],
      };
    }
  );

  // 4. get_restaurants_near_location
  server.tool(
    "get_restaurants_near_location",
    "Find restaurants near a geographic coordinate. Returns restaurants sorted by distance. Useful for finding nearby dining credit opportunities.",
    {
      lat: z.number().describe("Latitude"),
      lon: z.number().describe("Longitude"),
      radius_miles: z.number().optional().describe("Search radius in miles (default 5)"),
      program: z.enum(["chase_sapphire", "amex_gda"]).optional().describe("Filter by program"),
      limit: z.number().optional().describe("Max results (default 20)"),
    },
    async (args) => {
      const radius = args.radius_miles || 5;
      let candidates = [...allRestaurants];
      if (args.program) {
        const dataKey = programIdToDataKey(args.program);
        candidates = candidates.filter((r) => r.program === dataKey);
      }
      const withDistance = candidates
        .map((r) => ({ ...r, distance_miles: haversineDistance(args.lat, args.lon, r.lat, r.lon) }))
        .filter((r) => r.distance_miles <= radius)
        .sort((a, b) => a.distance_miles - b.distance_miles);

      const limited = withDistance.slice(0, args.limit || 20);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              limited.map((r) => ({
                ...formatRestaurant(r),
                distance_miles: Math.round(r.distance_miles * 100) / 100,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 5. get_program_cities
  server.tool(
    "get_program_cities",
    "List all cities that have restaurants for a given dining program, with restaurant counts per city.",
    {
      program: z.enum(["chase_sapphire", "amex_gda"]).describe("Program to list cities for"),
    },
    async (args) => {
      const dataKey = programIdToDataKey(args.program);
      const programRestaurants = allRestaurants.filter((r) => r.program === dataKey);
      const cityMap = {};
      for (const r of programRestaurants) {
        if (!r.city) continue;
        const key = `${r.city}|${r.state || ""}`;
        if (!cityMap[key]) cityMap[key] = { city: r.city, state: r.state || null, count: 0 };
        cityMap[key].count++;
      }
      const cities = Object.values(cityMap).sort((a, b) => b.count - a.count);
      return {
        content: [{ type: "text", text: JSON.stringify(cities, null, 2) }],
      };
    }
  );

  // 6. navigate_to_restaurant (returns deep link)
  server.tool(
    "navigate_to_restaurant",
    "Get a deep link URL to view a specific restaurant on the ReserveMap interactive map. Opens the map centered on the restaurant.",
    {
      name: z.string().describe("Restaurant name"),
      city: z.string().optional().describe("City to disambiguate"),
    },
    async (args) => {
      const q = args.name.toLowerCase();
      let matches = allRestaurants.filter((r) => r.name.toLowerCase().includes(q));
      if (args.city) {
        const cityQ = args.city.toLowerCase();
        const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
        if (cityFiltered.length > 0) matches = cityFiltered;
      }
      if (matches.length === 0) {
        return { content: [{ type: "text", text: "No restaurant found matching that name." }] };
      }
      const r = matches[0];
      const deepLink = `https://reservemap.vercel.app/?restaurant=${encodeURIComponent(r.name)}&lat=${r.lat}&lon=${r.lon}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...formatRestaurant(r), map_url: deepLink }, null, 2),
          },
        ],
      };
    }
  );

  // 7. filter_map_by_program (returns deep link)
  server.tool(
    "filter_map_by_program",
    "Get a deep link URL to view the ReserveMap filtered by a specific dining program.",
    {
      program: z.enum(["chase_sapphire", "amex_gda", "all"]).describe("Program to filter by, or 'all' to show everything"),
    },
    async (args) => {
      const deepLink = `https://reservemap.vercel.app/?program=${args.program}`;
      const dataKey = args.program === "all" ? null : programIdToDataKey(args.program);
      const count = dataKey ? allRestaurants.filter((r) => r.program === dataKey).length : allRestaurants.length;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ map_url: deepLink, restaurant_count: count, program: args.program }, null, 2),
          },
        ],
      };
    }
  );

  // 8. open_reservation
  server.tool(
    "open_reservation",
    "Get a reservation link for a restaurant on OpenTable or Resy with referral tracking. Returns the URL — the user can open it in their browser.",
    {
      name: z.string().describe("Restaurant name"),
      city: z.string().optional().describe("City to disambiguate"),
    },
    async (args) => {
      const q = args.name.toLowerCase();
      let matches = allRestaurants.filter((r) => r.name.toLowerCase().includes(q));
      if (args.city) {
        const cityQ = args.city.toLowerCase();
        const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
        if (cityFiltered.length > 0) matches = cityFiltered;
      }
      if (matches.length === 0) {
        return { content: [{ type: "text", text: "No restaurant found matching that name." }] };
      }
      const r = matches[0];
      const reservationUrl = buildRefUrl(r.bookingUrl || r.website);
      const platform = r.program === "chase" ? "opentable" : "resy";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                name: r.name,
                platform,
                reservation_url: reservationUrl,
                city: r.city,
                state: r.state || null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

// Vercel serverless handler
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    // Info endpoint
    res.status(200).json({
      name: "ReserveMap MCP Server",
      description:
        "Find restaurants where you can use premium credit card dining benefits (Chase Sapphire Reserve, Amex Global Dining Access). Get dining credits even as walk-ins.",
      version: "1.0.0",
      protocol: "streamable-http",
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode for serverless
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

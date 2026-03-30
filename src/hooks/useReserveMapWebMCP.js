import { useEffect } from 'react';
import '@mcp-b/global';
import { buildReservationUrl } from '../utils/reservationUrl';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROGRAMS = [
  {
    id: 'chase_sapphire',
    name: 'Chase Sapphire Reserve',
    description: 'Premium dining benefits through OpenTable partnership',
    card_required: 'Chase Sapphire Reserve',
    benefit_description: 'Dining credits at participating OpenTable restaurants. Credits work even as walk-ins.',
    dataKey: 'chase',
  },
  {
    id: 'amex_gda',
    name: 'Amex Global Dining Access',
    description: 'Global Dining Access by Resy for Amex Platinum/Centurion cardholders',
    card_required: 'Amex Platinum / Centurion',
    benefit_description: 'Dining credits at participating Resy restaurants. Credits work even as walk-ins.',
    dataKey: 'amex',
  },
];

function programIdToDataKey(id) {
  const p = PROGRAMS.find((p) => p.id === id);
  return p ? p.dataKey : id;
}

function formatRestaurant(r) {
  return {
    name: r.name,
    program: r.program === 'chase' ? 'chase_sapphire' : 'amex_gda',
    city: r.city || null,
    state: r.state || null,
    address: r.address || null,
    cuisine: r.cuisine || null,
    neighborhood: r.neighborhood || null,
    website: r.website || null,
    reservation_url: buildReservationUrl(r.bookingUrl),
    coordinates: { lat: r.lat, lon: r.lon },
  };
}

export function useReserveMapWebMCP({ restaurants, mapRef, filters, setFilters, setFlyToLocation }) {
  useEffect(() => {
    if (!('modelContext' in navigator)) return;

    const registrations = [];

    // 1. search_restaurants
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'search_restaurants',
        description:
          'Search ReserveMap restaurants by name, city, state, cuisine, or dining program. Returns restaurants where you can use Chase Sapphire Reserve or Amex Global Dining Access credits. These credits work even as walk-ins without advance reservations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term (restaurant name, cuisine, neighborhood)' },
            program: {
              type: 'string',
              enum: ['chase_sapphire', 'amex_gda'],
              description: 'Filter by credit card dining program',
            },
            city: { type: 'string', description: 'Filter by city name' },
            state: { type: 'string', description: 'Filter by US state (2-letter code)' },
            limit: { type: 'number', description: 'Max results to return (default 20)' },
          },
        },
        async execute(args) {
          let results = [...restaurants];
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
          return { content: [{ type: 'text', text: JSON.stringify(limited.map(formatRestaurant)) }] };
        },
      })
    );

    // 2. get_restaurant_details
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'get_restaurant_details',
        description:
          'Get full details for a specific restaurant including all dining programs it participates in, address, coordinates, website, and reservation links.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Restaurant name to look up' },
            city: { type: 'string', description: 'City to disambiguate if multiple matches' },
          },
          required: ['name'],
        },
        async execute(args) {
          const q = args.name.toLowerCase();
          let matches = restaurants.filter((r) => r.name.toLowerCase().includes(q));
          if (args.city) {
            const cityQ = args.city.toLowerCase();
            const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
            if (cityFiltered.length > 0) matches = cityFiltered;
          }
          if (matches.length === 0) return { content: [{ type: 'text', text: 'No restaurant found.' }] };
          return { content: [{ type: 'text', text: JSON.stringify(matches.slice(0, 5).map(formatRestaurant)) }] };
        },
      })
    );

    // 3. list_programs
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'list_programs',
        description: 'List all available premium credit card dining programs with descriptions and restaurant counts.',
        inputSchema: { type: 'object', properties: {} },
        async execute() {
          const programsWithCounts = PROGRAMS.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            card_required: p.card_required,
            benefit_description: p.benefit_description,
            restaurant_count: restaurants.filter((r) => r.program === p.dataKey).length,
          }));
          return { content: [{ type: 'text', text: JSON.stringify(programsWithCounts) }] };
        },
      })
    );

    // 4. get_restaurants_near_location
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'get_restaurants_near_location',
        description:
          'Find restaurants near a lat/lon point. Returns results sorted by distance. Useful for finding nearby dining credit opportunities.',
        inputSchema: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            radius_miles: { type: 'number', description: 'Search radius in miles (default 5)' },
            program: { type: 'string', enum: ['chase_sapphire', 'amex_gda'], description: 'Filter by program' },
            limit: { type: 'number', description: 'Max results (default 20)' },
          },
          required: ['lat', 'lon'],
        },
        async execute(args) {
          const radius = args.radius_miles || 5;
          let candidates = [...restaurants];
          if (args.program) {
            const dataKey = programIdToDataKey(args.program);
            candidates = candidates.filter((r) => r.program === dataKey);
          }
          const withDistance = candidates
            .map((r) => ({ ...r, distance_miles: haversineDistance(args.lat, args.lon, r.lat, r.lon) }))
            .filter((r) => r.distance_miles <= radius)
            .sort((a, b) => a.distance_miles - b.distance_miles)
            .slice(0, args.limit || 20);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  withDistance.map((r) => ({
                    ...formatRestaurant(r),
                    distance_miles: Math.round(r.distance_miles * 100) / 100,
                  }))
                ),
              },
            ],
          };
        },
      })
    );

    // 5. get_program_cities
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'get_program_cities',
        description: 'List all cities that have restaurants for a given program, with counts.',
        inputSchema: {
          type: 'object',
          properties: {
            program: { type: 'string', enum: ['chase_sapphire', 'amex_gda'], description: 'Program to list cities for' },
          },
          required: ['program'],
        },
        async execute(args) {
          const dataKey = programIdToDataKey(args.program);
          const programRestaurants = restaurants.filter((r) => r.program === dataKey);
          const cityMap = {};
          for (const r of programRestaurants) {
            if (!r.city) continue;
            const key = `${r.city}|${r.state || ''}`;
            if (!cityMap[key]) cityMap[key] = { city: r.city, state: r.state || null, count: 0 };
            cityMap[key].count++;
          }
          const cities = Object.values(cityMap).sort((a, b) => b.count - a.count);
          return { content: [{ type: 'text', text: JSON.stringify(cities) }] };
        },
      })
    );

    // 6. navigate_to_restaurant (destructive — changes visible page)
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'navigate_to_restaurant',
        description: 'Pan the map to a specific restaurant and open its popup/detail view. Changes the visible map state.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Restaurant name' },
            city: { type: 'string', description: 'City to disambiguate' },
          },
          required: ['name'],
        },
        annotations: { destructive: true },
        async execute(args) {
          const q = args.name.toLowerCase();
          let matches = restaurants.filter((r) => r.name.toLowerCase().includes(q));
          if (args.city) {
            const cityQ = args.city.toLowerCase();
            const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
            if (cityFiltered.length > 0) matches = cityFiltered;
          }
          if (matches.length === 0) return { content: [{ type: 'text', text: 'No restaurant found.' }] };
          const r = matches[0];
          setFlyToLocation({ lat: r.lat, lon: r.lon, zoom: 16 });
          return { content: [{ type: 'text', text: JSON.stringify({ navigated: true, ...formatRestaurant(r) }) }] };
        },
      })
    );

    // 7. filter_map_by_program (destructive — changes visible markers)
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'filter_map_by_program',
        description: 'Apply a program filter to the map view. Shows only restaurants from the selected program.',
        inputSchema: {
          type: 'object',
          properties: {
            program: {
              type: 'string',
              enum: ['chase_sapphire', 'amex_gda', 'all'],
              description: 'Program to filter by, or "all" to show everything',
            },
          },
          required: ['program'],
        },
        annotations: { destructive: true },
        async execute(args) {
          const newFilters =
            args.program === 'all'
              ? { amex: true, chase: true }
              : { amex: args.program === 'amex_gda', chase: args.program === 'chase_sapphire' };
          setFilters(newFilters);
          const count = restaurants.filter(
            (r) => (r.program === 'amex' && newFilters.amex) || (r.program === 'chase' && newFilters.chase)
          ).length;
          return { content: [{ type: 'text', text: JSON.stringify({ program: args.program, visible_restaurants: count }) }] };
        },
      })
    );

    // 8. open_reservation (action)
    registrations.push(
      navigator.modelContext.registerTool({
        name: 'open_reservation',
        description:
          'Open a reservation link for a restaurant on OpenTable or Resy in a new tab. Appends referral tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Restaurant name' },
            city: { type: 'string', description: 'City to disambiguate' },
          },
          required: ['name'],
        },
        async execute(args) {
          const q = args.name.toLowerCase();
          let matches = restaurants.filter((r) => r.name.toLowerCase().includes(q));
          if (args.city) {
            const cityQ = args.city.toLowerCase();
            const cityFiltered = matches.filter((r) => r.city && r.city.toLowerCase() === cityQ);
            if (cityFiltered.length > 0) matches = cityFiltered;
          }
          if (matches.length === 0) return { content: [{ type: 'text', text: 'No restaurant found.' }] };
          const r = matches[0];
          const url = buildReservationUrl(r.bookingUrl || r.website);
          if (url) window.open(url, '_blank');
          return { content: [{ type: 'text', text: JSON.stringify({ name: r.name, reservation_url: url }) }] };
        },
      })
    );

    return () => registrations.forEach((r) => r.unregister());
  }, [restaurants, mapRef, filters, setFilters, setFlyToLocation]);
}

// Map Configuration
export const MAP_CONFIG = {
  // Default map center (India - can be changed to user's location)
  defaultCenter: {
    lat: 28.6139, // New Delhi
    lng: 77.2090,
  },
  
  // Default zoom level
  defaultZoom: 13,
  
  // Map providers
  providers: {
    openstreetmap: {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    dark: {
      name: 'Dark Theme',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    },
  },
  
  // Geocoding service (Nominatim - free OpenStreetMap geocoding)
  geocoding: {
    nominatim: 'https://nominatim.openstreetmap.org',
  },
  
  // Routing service (OpenRouteService - free for <2000 requests/day)
  routing: {
    openRouteService: 'https://api.openrouteservice.org/v2',
    // To use ORS, sign up for free API key at https://openrouteservice.org/dev/#/signup
    apiKey: process.env.NEXT_PUBLIC_ORS_API_KEY || '',
  },
};

export default MAP_CONFIG;

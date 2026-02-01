import { MAP_CONFIG } from './mapConfig';

/**
 * Reverse geocode coordinates to get a formatted address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Formatted address
 */
export async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `${MAP_CONFIG.geocoding.nominatim}/reverse?` +
            `format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();

        // Format the address nicely
        const address = data.address || {};
        const parts = [
            address.road || address.neighbourhood,
            address.suburb || address.city_district,
            address.city || address.town || address.village,
            address.state,
        ].filter(Boolean);

        return parts.join(', ') || data.display_name || 'Unknown location';
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

/**
 * Geocode an address to get coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number, display_name: string}>} Coordinates and formatted address
 */
export async function geocodeAddress(address) {
    try {
        const response = await fetch(
            `${MAP_CONFIG.geocoding.nominatim}/search?` +
            `format=json&q=${encodeURIComponent(address)}&limit=1`,
            {
                headers: {
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding failed');
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name,
            };
        }

        throw new Error('No results found');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

/**
 * Search for places by query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results (default: 5)
 * @returns {Promise<Array>} Array of search results
 */
export async function searchPlaces(query, limit = 5) {
    try {
        const response = await fetch(
            `${MAP_CONFIG.geocoding.nominatim}/search?` +
            `format=json&q=${encodeURIComponent(query)}&limit=${limit}`,
            {
                headers: {
                    'Accept-Language': 'en',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Search failed');
        }

        const data = await response.json();

        return data.map(item => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            display_name: item.display_name,
            type: item.type,
            importance: item.importance,
        }));
    } catch (error) {
        console.error('Place search error:', error);
        return [];
    }
}

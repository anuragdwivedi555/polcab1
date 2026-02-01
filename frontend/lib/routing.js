/**
 * Calculate route between two points using simple crow-fly distance
 * For production, consider using OpenRouteService, Mapbox, or Google Directions API
 * @param {Object} start - Starting point {lat, lng}
 * @param {Object} end - Ending point {lat, lng}
 * @returns {Promise<Object>} Route information
 */
export async function calculateRoute(start, end) {
    try {
        // Calculate crow-fly distance using Haversine formula
        const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);

        // Estimate time (assuming average speed of 30 km/h in city traffic)
        const estimatedTime = (distance / 30) * 60; // in minutes

        // Create simple straight-line route coordinates
        const routeCoordinates = [
            [start.lat, start.lng],
            [end.lat, end.lng],
        ];

        return {
            distance: distance.toFixed(2), // in km
            duration: Math.ceil(estimatedTime), // in minutes
            coordinates: routeCoordinates,
            type: 'straight-line', // Indicates this is a simple route
        };
    } catch (error) {
        console.error('Route calculation error:', error);
        throw error;
    }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate suggested fare based on distance
 * @param {number} distance - Distance in km
 * @returns {Object} Fare information
 */
export function calculateFare(distance) {
    const baseRate = 0.01; // Base fare in MATIC
    const perKmRate = 0.005; // Per km rate in MATIC

    const fare = baseRate + (distance * perKmRate);

    return {
        total: fare.toFixed(4),
        breakdown: {
            base: baseRate.toFixed(4),
            distance: (distance * perKmRate).toFixed(4),
        },
    };
}

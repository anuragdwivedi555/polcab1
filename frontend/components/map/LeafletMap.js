"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '@/lib/geocoding';
import { calculateRoute } from '@/lib/routing';
import { MAP_CONFIG } from '@/lib/mapConfig';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LeafletMap({
    center = MAP_CONFIG.defaultCenter,
    zoom = MAP_CONFIG.defaultZoom,
    height = '400px',
    markers = [], // Array of {lat, lng, label, color}
    route = null, // {start: {lat, lng}, end: {lat, lng}}
    onLocationSelect = null, // Callback when map is clicked
    interactive = true,
    showUserLocation = true,
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersLayerRef = useRef(null);
    const routeLayerRef = useRef(null);
    const [userLocation, setUserLocation] = useState(null);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Create map
        const map = L.map(mapRef.current, {
            center: [center.lat, center.lng],
            zoom: zoom,
            zoomControl: true,
            attributionControl: false,
        });

        // Add dark theme tile layer
        L.tileLayer(MAP_CONFIG.providers.dark.url, {
            attribution: MAP_CONFIG.providers.dark.attribution,
            maxZoom: MAP_CONFIG.providers.dark.maxZoom,
        }).addTo(map);

        // Create layers for markers and routes
        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

        // Add click handler if interactive
        if (interactive && onLocationSelect) {
            map.on('click', async (e) => {
                const { lat, lng } = e.latlng;
                const address = await reverseGeocode(lat, lng);
                onLocationSelect({ lat, lng, address });
            });
        }

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Get user's current location
    useEffect(() => {
        if (showUserLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(location);

                    // Center map on user location if no other center is specified
                    if (mapInstanceRef.current && center === MAP_CONFIG.defaultCenter) {
                        mapInstanceRef.current.setView([location.lat, location.lng], zoom);
                    }
                },
                (error) => {
                    console.warn('Could not get user location:', error);
                }
            );
        }
    }, [showUserLocation]);

    // Update markers
    useEffect(() => {
        if (!markersLayerRef.current) return;

        // Clear existing markers
        markersLayerRef.current.clearLayers();

        // Custom icon colors
        const createColoredIcon = (color = '#7C3AED') => {
            return L.divIcon({
                className: 'custom-marker',
                html: `
          <div style="
            width: 30px;
            height: 30px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: white;
              border-radius: 50%;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            "></div>
          </div>
        `,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30],
            });
        };

        // Add markers
        markers.forEach((marker) => {
            const leafletMarker = L.marker([marker.lat, marker.lng], {
                icon: createColoredIcon(marker.color),
                draggable: marker.draggable || false,
            }).addTo(markersLayerRef.current);

            if (marker.label) {
                leafletMarker.bindPopup(marker.label);
            }

            // Handle drag events
            if (marker.draggable && onLocationSelect) {
                leafletMarker.on('dragend', async (e) => {
                    const position = e.target.getLatLng();
                    const address = await reverseGeocode(position.lat, position.lng);
                    onLocationSelect({
                        lat: position.lat,
                        lng: position.lng,
                        address,
                    });
                });
            }
        });

        // Add user location marker if available
        if (userLocation && showUserLocation) {
            L.circleMarker([userLocation.lat, userLocation.lng], {
                radius: 8,
                fillColor: '#3B82F6',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8,
            })
                .addTo(markersLayerRef.current)
                .bindPopup('Your location');
        }
    }, [markers, userLocation, showUserLocation, onLocationSelect]);

    // Draw route
    useEffect(() => {
        if (!routeLayerRef.current || !route) return;

        routeLayerRef.current.clearLayers();

        // Calculate and draw route
        calculateRoute(route.start, route.end).then((routeData) => {
            const polyline = L.polyline(routeData.coordinates, {
                color: '#7C3AED',
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1,
            }).addTo(routeLayerRef.current);

            // Fit map to show entire route
            if (mapInstanceRef.current) {
                mapInstanceRef.current.fitBounds(polyline.getBounds(), {
                    padding: [50, 50],
                });
            }

            // Add distance/time popup at midpoint
            const midpoint = [
                (route.start.lat + route.end.lat) / 2,
                (route.start.lng + route.end.lng) / 2,
            ];

            L.marker(midpoint, {
                icon: L.divIcon({
                    className: 'route-info',
                    html: `
            <div style="
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 8px 12px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              border: 2px solid #7C3AED;
            ">
              ${routeData.distance} km · ${routeData.duration} min
            </div>
          `,
                    iconSize: [0, 0],
                }),
            }).addTo(routeLayerRef.current);
        });
    }, [route]);

    return (
        <div
            ref={mapRef}
            style={{
                height,
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
            }}
        />
    );
}

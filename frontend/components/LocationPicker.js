"use client";

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Locate, Search, Loader2 } from 'lucide-react';
// import LeafletMap from '@/components/map/LeafletMap';
import dynamic from 'next/dynamic';
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false });
import { searchPlaces } from '@/lib/geocoding';
import { MAP_CONFIG } from '@/lib/mapConfig';

export default function LocationPicker({
    isOpen,
    onClose,
    onLocationSelect,
    initialLocation = null,
    title = "Select Location",
    description = "Click on the map or search for a location"
}) {
    const [selectedLocation, setSelectedLocation] = useState(initialLocation);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);

    // Handle location selection from map click
    const handleMapLocationSelect = (location) => {
        setSelectedLocation(location);
    };

    // Handle search
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchPlaces(searchQuery, 5);
            setSearchResults(results);

            if (results.length > 0) {
                // Center map on first result
                setMapCenter({ lat: results[0].lat, lng: results[0].lng });
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search result selection
    const handleResultSelect = (result) => {
        setSelectedLocation({
            lat: result.lat,
            lng: result.lng,
            address: result.display_name,
        });
        setMapCenter({ lat: result.lat, lng: result.lng });
        setSearchResults([]);
        setSearchQuery('');
    };

    // Get current location
    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setMapCenter(location);

                    // Trigger map click at this location to get address
                    const { reverseGeocode } = await import('@/lib/geocoding');
                    const address = await reverseGeocode(location.lat, location.lng);
                    setSelectedLocation({ ...location, address });
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Could not get your location. Please select manually.');
                }
            );
        }
    };

    // Confirm selection
    const handleConfirm = () => {
        if (selectedLocation) {
            onLocationSelect(selectedLocation);
            onClose();
        }
    };

    // Reset when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0a0a0a]/95 backdrop-blur-2xl border-white/10 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="text-primary" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            type="text"
                            placeholder="Search for a place..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
                        {isSearching ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleUseCurrentLocation}
                    >
                        <Locate size={18} />
                    </Button>
                </form>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                        {searchResults.map((result, index) => (
                            <button
                                key={index}
                                onClick={() => handleResultSelect(result)}
                                className="w-full text-left px-4 py-2 hover:bg-secondary/50 transition-colors text-sm border-b border-border last:border-b-0"
                            >
                                <div className="font-medium truncate">{result.display_name}</div>
                                <div className="text-xs text-muted-foreground">{result.type}</div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Map */}
                <div className="flex-1 min-h-[400px]">
                    <LeafletMap
                        center={mapCenter}
                        zoom={13}
                        height="100%"
                        markers={selectedLocation ? [{
                            lat: selectedLocation.lat,
                            lng: selectedLocation.lng,
                            label: selectedLocation.address || 'Selected location',
                            color: '#7C3AED',
                            draggable: true,
                        }] : []}
                        onLocationSelect={handleMapLocationSelect}
                        interactive={true}
                        showUserLocation={true}
                    />
                </div>

                {/* Selected Location Display */}
                {selectedLocation && (
                    <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Selected Location</div>
                        <div className="font-medium text-sm">{selectedLocation.address}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedLocation}
                        className="flex-1 gradient-primary"
                    >
                        Confirm Location
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon in NextJS
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  defaultLocation?: { lat: number; lng: number } | null;
}

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function MapPicker({ onLocationSelect, defaultLocation }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLngExpression | null>(
    defaultLocation ? [defaultLocation.lat, defaultLocation.lng] : null
  );
  const [error, setError] = useState('');

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
          setPosition(latlng);
          onLocationSelect(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setError('Failed to get location. Please click the map to select manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 relative">
      <div className="flex justify-between items-center z-10 w-full mb-1">
        <span className="text-sm text-slate-500">Pick Exact Location</span>
        <button 
          type="button" 
          onClick={detectLocation}
          className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded font-medium transition"
        >
          📍 Auto Detect My Location
        </button>
      </div>
      
      {error && <span className="text-xs text-red-500 mb-1">{error}</span>}

      <div className="w-full h-[250px] rounded-lg overflow-hidden border border-slate-300 relative z-0">
        <MapContainer 
          center={position || [20.5937, 78.9629]} // default center India
          zoom={position ? 15 : 4} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&amp;copy <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-400 mt-1 italic">Click on the map to manually set or adjust the Pin.</p>
    </div>
  );
}

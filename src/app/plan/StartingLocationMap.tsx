"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { DivIcon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface StartingLocationMapProps {
  center: LatLngExpression;
  onMarkerDrag: (lat: number, lng: number) => void;
}

// Custom icon for starting location
const startingLocationIcon = new DivIcon({
  className: "starting-location-marker",
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: grab;
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Component to update map view when center changes
function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);

  return null;
}

// Draggable marker component
function DraggableMarker({
  position,
  onDrag,
}: {
  position: LatLngExpression;
  onDrag: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const latlng = marker.getLatLng();
        onDrag(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={startingLocationIcon}
    />
  );
}

export default function StartingLocationMap({
  center,
  onMarkerDrag,
}: StartingLocationMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-64 w-full rounded-lg"
      scrollWheelZoom={true}
    >
      <MapUpdater center={center} />
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <DraggableMarker position={center} onDrag={onMarkerDrag} />
    </MapContainer>
  );
}

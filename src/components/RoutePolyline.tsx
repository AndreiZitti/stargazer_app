"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface RoutePolylineProps {
  coordinates: [number, number][]; // [lng, lat] format from API
  color?: string;
  fitBounds?: boolean;
}

export default function RoutePolyline({
  coordinates,
  color = "#6366f1",
  fitBounds = true,
}: RoutePolylineProps) {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    // Convert [lng, lat] to [lat, lng] for Leaflet
    const latLngs: L.LatLngExpression[] = coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );

    // Remove existing polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    // Create new polyline
    const polyline = L.polyline(latLngs, {
      color,
      weight: 5,
      opacity: 0.8,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    polylineRef.current = polyline;

    // Fit map to show entire route
    if (fitBounds) {
      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50],
        maxZoom: 14,
      });
    }

    return () => {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }
    };
  }, [coordinates, color, fitBounds, map]);

  return null;
}

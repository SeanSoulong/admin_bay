"use client";

import { useState, useEffect } from "react";

const addressCache: Record<string, string> = {};
let geocoderInstance: google.maps.Geocoder | null = null;

export function getGeocodedAddress(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (addressCache[key]) return Promise.resolve(addressCache[key]);
  if (!window.google?.maps?.Geocoder) return Promise.resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  
  if (!geocoderInstance) {
    geocoderInstance = new window.google.maps.Geocoder();
  }
  
  return new Promise((resolve) => {
    geocoderInstance!.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        addressCache[key] = results[0].formatted_address;
        resolve(results[0].formatted_address);
      } else {
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        addressCache[key] = fallback;
        resolve(fallback);
      }
    });
  });
}

export function AddressDisplay({ lat, lng, className = "" }: { lat?: number | null; lng?: number | null; className?: string }) {
  const [address, setAddress] = useState<string>("កំពុងស្វែងរកអាសយដ្ឋាន...");

  useEffect(() => {
    if (!lat || !lng) {
      setAddress("មិនមានទីតាំង");
      return;
    }
    let mounted = true;
    getGeocodedAddress(lat, lng).then((addr) => {
      if (mounted) setAddress(addr);
    });
    return () => { mounted = false; };
  }, [lat, lng]);

  return <span className={className} title={address}>{address}</span>;
}

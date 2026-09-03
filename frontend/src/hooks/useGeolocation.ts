import { useState, useEffect, useCallback } from 'react';
import { reverseGeocodeCoords } from '../services/api';

export interface GeoLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

export const useGeolocation = () => {
  const [geoState, setGeoState] = useState<GeoLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: '',
    loading: false,
    error: null,
    permissionDenied: false,
  });

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
        loading: false,
      }));
      return;
    }

    setGeoState(prev => ({ ...prev, loading: true, error: null, permissionDenied: false }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let resolvedAddress = `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        try {
          const res = await reverseGeocodeCoords(latitude, longitude);
          if (res && res.address) {
            resolvedAddress = res.address;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setGeoState({
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          address: resolvedAddress,
          loading: false,
          error: null,
          permissionDenied: false,
        });
      },
      (error) => {
        let errorMsg = 'Unable to retrieve location.';
        let isDenied = false;

        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access was denied. Please enable GPS permissions or enter location manually.';
          isDenied = true;
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }

        setGeoState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg,
          permissionDenied: isDenied,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { ...geoState, requestLocation, setGeoState };
};

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Hospital, 
  Shield, 
  Phone, 
  Maximize2,
  Crosshair,
} from 'lucide-react';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom animated tactical icons
const createTacticalPin = (
  type: 'user' | 'hospital' | 'police' | 'risk',
  badgeText?: string
) => {
  let bg = '#FF5A5F';
  let emoji = '📍';
  let isPulsing = false;

  if (type === 'user') {
    bg = '#EF4444';
    emoji = '🔴';
    isPulsing = true;
  } else if (type === 'hospital') {
    bg = '#10B981';
    emoji = '🏥';
  } else if (type === 'police') {
    bg = '#3B82F6';
    emoji = '👮';
  } else if (type === 'risk') {
    bg = '#DC2626';
    emoji = '🚨';
  }

  return L.divIcon({
    className: 'custom-live-location-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
        ${
          isPulsing
            ? `<div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.35);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : ''
        }
        <div style="
          background:${bg};
          width:38px;
          height:38px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:18px;
          border:2.5px solid white;
          box-shadow:0 4px 14px rgba(0,0,0,0.35);
          position:relative;
          z-index:2;
        ">
          ${emoji}
        </div>
        ${
          badgeText
            ? `<div style="
                margin-top:-6px;
                background:#0F172A;
                color:white;
                border:1px solid rgba(255,255,255,0.2);
                border-radius:8px;
                padding:1px 6px;
                font-size:9px;
                font-weight:800;
                font-family:sans-serif;
                white-space:nowrap;
                box-shadow:0 2px 6px rgba(0,0,0,0.4);
                z-index:3;
              ">
                ${badgeText}
              </div>`
            : ''
        }
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 25],
    popupAnchor: [0, -25],
  });
};

function MapRecenterControl({
  userPos,
  allPoints,
  fitAll,
}: {
  userPos: [number, number];
  allPoints: [number, number][];
  fitAll: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (fitAll && allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView(userPos, 15);
    }
  }, [userPos, allPoints, fitAll, map]);

  return null;
}

export interface NearbyResponderLocation {
  id: string;
  name: string;
  type: 'hospital' | 'police';
  lat: number;
  lng: number;
  distanceKm: number;
  etaMinutes: number;
  phone?: string;
  address?: string;
}

export interface LiveLocationMapProps {
  userLat?: number;
  userLng?: number;
  incidentTitle?: string;
  incidentCategory?: string;
  riskScore?: number;
  riskRadiusMeters?: number;
  hospitals?: NearbyResponderLocation[];
  policeStations?: NearbyResponderLocation[];
  height?: string;
  theme?: 'light' | 'dark' | 'satellite';
  showControls?: boolean;
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = ({
  userLat = 26.8467,
  userLng = 80.9462,
  incidentTitle = 'Incident Ground Zero',
  incidentCategory = 'Emergency Scene',
  riskScore = 88,
  riskRadiusMeters = 250,
  hospitals: propHospitals,
  policeStations: propPolice,
  height = '420px',
  theme = 'light',
  showControls = true,
}) => {
  const [mapTheme, setMapTheme] = useState<'light' | 'dark' | 'satellite'>(theme);
  const [fitAllBounds, setFitAllBounds] = useState<boolean>(true);

  // Default nearest Hospital (1.8 km North-East) if not provided
  const hospitals: NearbyResponderLocation[] = propHospitals || [
    {
      id: 'hosp-1',
      name: 'King George Emergency Hospital',
      type: 'hospital',
      lat: userLat + 0.014,
      lng: userLng + 0.008,
      distanceKm: 1.8,
      etaMinutes: 4,
      phone: '108 / +91-522-2257450',
      address: 'Medical Campus, Shah Mina Rd, Lucknow',
    },
  ];

  // Default nearest Police Station (1.2 km South) if not provided
  const policeStations: NearbyResponderLocation[] = propPolice || [
    {
      id: 'pol-1',
      name: 'Hazratganj Central Police Station',
      type: 'police',
      lat: userLat - 0.010,
      lng: userLng - 0.004,
      distanceKm: 1.2,
      etaMinutes: 3,
      phone: '112 / +91-522-2213456',
      address: 'MG Marg, Hazratganj, Lucknow',
    },
  ];

  const primaryHospital = hospitals[0];
  const primaryPolice = policeStations[0];

  const allPoints: [number, number][] = [
    [userLat, userLng],
    ...hospitals.map(h => [h.lat, h.lng] as [number, number]),
    ...policeStations.map(p => [p.lat, p.lng] as [number, number]),
  ];

  const tileUrls = {
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  return (
    <div className="flex flex-col w-full rounded-2xl overflow-hidden border border-[var(--vera-border)] shadow-xl bg-[var(--vera-surface)] relative">
      {/* ── Top Live Location Status Bar ── */}
      <div className="p-3.5 bg-[var(--vera-surface-elevated)] text-[var(--vera-text-primary)] flex flex-wrap items-center justify-between gap-2 z-10 border-b border-[var(--vera-border)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#D45060] animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-tight text-[var(--vera-text-primary)]">Live Location Map</span>
              <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                RISK {riskScore}/100
              </span>
            </div>
            <p className="text-[10px] text-[var(--vera-text-muted)]">
              GPS: {userLat.toFixed(4)}, {userLng.toFixed(4)} &bull; {incidentCategory}
            </p>
          </div>
        </div>

        {/* Tactical Badges for Nearest Responders */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
            <Hospital className="w-3.5 h-3.5 text-emerald-400" />
            <span>{primaryHospital ? `${primaryHospital.distanceKm} km` : '1.8 km'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center gap-1.5 text-[11px] font-bold text-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>{primaryPolice ? `${primaryPolice.distanceKm} km` : '1.2 km'}</span>
          </div>

          {showControls && (
            <div className="flex items-center bg-[var(--vera-surface)] border border-[var(--vera-border)] rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => setMapTheme('light')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  mapTheme === 'light' ? 'bg-[#800020] text-[#FFF9F2]' : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setMapTheme('dark')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  mapTheme === 'dark' ? 'bg-[#800020] text-[#FFF9F2]' : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
                }`}
              >
                Dark
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Interactive Map View ── */}
      <div className="relative w-full" style={{ height }}>
        {/* Floating Recenter & Fit Buttons */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
          <button
            onClick={() => setFitAllBounds(true)}
            className="p-2 rounded-xl vera-card text-[var(--vera-text-primary)] hover:bg-[var(--vera-surface-muted)] shadow-md border border-[var(--vera-border)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Fit All Emergency Points"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--vera-text-muted)]" />
            <span className="text-[10px]">Fit View</span>
          </button>
          <button
            onClick={() => setFitAllBounds(false)}
            className="p-2 rounded-xl vera-card text-[var(--vera-text-primary)] hover:bg-[var(--vera-surface-muted)] shadow-md border border-[var(--vera-border)] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Recenter on User Position"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#D45060]" />
            <span className="text-[10px]">User Pos</span>
          </button>
        </div>

        <MapContainer
          center={[userLat, userLng]}
          zoom={14}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ background: mapTheme === 'dark' ? '#0f172a' : '#f8fafc' }}
        >
          <TileLayer
            key={mapTheme}
            attribution='&copy; OpenStreetMap &bull; CARTO &bull; ESRI'
            url={tileUrls[mapTheme]}
            maxZoom={19}
          />

          <MapRecenterControl
            userPos={[userLat, userLng]}
            allPoints={allPoints}
            fitAll={fitAllBounds}
          />

          {/* ── 1. User / Incident Location (🔴 Ground Zero) ── */}
          <Marker
            position={[userLat, userLng]}
            icon={createTacticalPin('user', '🔴 Incident')}
          >
            <Popup className="custom-popup">
              <div className="p-2.5 min-w-[210px] text-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-600 mb-1">
                  <span>🔴</span>
                  <span>{incidentTitle}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Verified Incident Ground Zero
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>GPS Precision: ±12m</span>
                  <span className="font-bold text-red-600">Risk: {riskScore}/100</span>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* ── 2. 🚨 Incident Risk Area (Hazard Perimeter Circle) ── */}
          <Circle
            center={[userLat, userLng]}
            radius={riskRadiusMeters}
            pathOptions={{
              color: '#EF4444',
              fillColor: '#EF4444',
              fillOpacity: 0.18,
              weight: 2,
              dashArray: '5, 5',
            }}
          />

          {/* ── 3. 🏥 Nearby Hospital Markers & Vector Path ── */}
          {hospitals.map((hosp) => (
            <React.Fragment key={hosp.id}>
              <Marker
                position={[hosp.lat, hosp.lng]}
                icon={createTacticalPin('hospital', `🏥 ${hosp.distanceKm} km`)}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 min-w-[220px] text-slate-900">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 mb-1">
                      <Hospital className="w-4 h-4" />
                      <span>{hosp.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{hosp.address}</p>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-700">Distance: {hosp.distanceKm} km</span>
                      <span className="font-bold text-slate-700">ETA: ~{hosp.etaMinutes} min</span>
                    </div>
                    {hosp.phone && (
                      <div className="mt-2">
                        <a
                          href={`tel:${hosp.phone}`}
                          className="w-full py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call Hospital ({hosp.phone.split('/')[0].trim()})</span>
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Vector to Hospital */}
              <Polyline
                positions={[
                  [userLat, userLng],
                  [hosp.lat, hosp.lng],
                ]}
                pathOptions={{
                  color: '#10B981',
                  weight: 3.5,
                  opacity: 0.85,
                  dashArray: '6, 6',
                }}
              />
            </React.Fragment>
          ))}

          {/* ── 4. 👮 Nearby Police Station Markers & Vector Path ── */}
          {policeStations.map((pol) => (
            <React.Fragment key={pol.id}>
              <Marker
                position={[pol.lat, pol.lng]}
                icon={createTacticalPin('police', `👮 ${pol.distanceKm} km`)}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 min-w-[220px] text-slate-900">
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-600 mb-1">
                      <Shield className="w-4 h-4" />
                      <span>{pol.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{pol.address}</p>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-blue-700">Distance: {pol.distanceKm} km</span>
                      <span className="font-bold text-slate-700">ETA: ~{pol.etaMinutes} min</span>
                    </div>
                    {pol.phone && (
                      <div className="mt-2">
                        <a
                          href={`tel:${pol.phone}`}
                          className="w-full py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-blue-500 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call Police ({pol.phone.split('/')[0].trim()})</span>
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Vector to Police */}
              <Polyline
                positions={[
                  [userLat, userLng],
                  [pol.lat, pol.lng],
                ]}
                pathOptions={{
                  color: '#3B82F6',
                  weight: 3.5,
                  opacity: 0.85,
                  dashArray: '6, 6',
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* ── Bottom Summary Information Card ── */}
      <div className="p-3.5 bg-[var(--vera-surface-elevated)] border-t border-[var(--vera-border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-sm border-2 border-[var(--vera-surface)]">
              🏥
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shadow-sm border-2 border-[var(--vera-surface)]">
              👮
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--vera-text-primary)]">
              Emergency Perimeter & Responders
            </h4>
            <p className="text-[10px] text-[var(--vera-text-muted)]">
              Hospital ({primaryHospital?.distanceKm || 1.8} km) &bull; Police ({primaryPolice?.distanceKm || 1.2} km)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {primaryHospital && (
            <a
              href={`tel:${primaryHospital.phone?.split('/')[0].trim() || '108'}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-sm"
            >
              <Phone className="w-3 h-3" />
              <span>Call EMS (108)</span>
            </a>
          )}
          {primaryPolice && (
            <a
              href={`tel:${primaryPolice.phone?.split('/')[0].trim() || '112'}`}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-sm"
            >
              <Phone className="w-3 h-3" />
              <span>Call Police (112)</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

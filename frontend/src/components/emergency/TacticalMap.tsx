import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResponsePlan, Complaint } from '../../types';

// Fix Leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom tactical marker factory
const createTacticalIcon = (color: string, emoji: string, badge?: string, isGroundZero = false) =>
  L.divIcon({
    className: 'custom-tactical-pin',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${
          isGroundZero
            ? `<div style="position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(212,80,96,0.4);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>`
            : ''
        }
        <div style="
          background:${color};
          width:${isGroundZero ? '42px' : '34px'};
          height:${isGroundZero ? '42px' : '34px'};
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:${isGroundZero ? '20px' : '16px'};
          border:2.5px solid #FFF9F2;
          box-shadow:${isGroundZero ? '0 0 20px rgba(212,80,96,0.8)' : '0 4px 12px rgba(0,0,0,0.5)'};
        ">
          ${emoji}
        </div>
        ${
          badge
            ? `<div style="
              position:absolute;
              top:-9px;
              right:-18px;
              background:#10070B;
              color:#FFF9F2;
              border:1px solid ${color};
              border-radius:10px;
              padding:1px 5px;
              font-size:9px;
              font-weight:900;
              font-family:monospace;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.6);
            ">
              ${badge}
            </div>`
            : ''
        }
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });

function MapBoundsController({
  points,
}: {
  points: { lat: number; lon: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 15);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [points, map]);

  return null;
}

interface TacticalMapProps {
  complaint: Complaint;
  plan?: ResponsePlan | null;
  height?: string;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  complaint,
  plan: propPlan,
  height = '360px',
}) => {
  const [tileType, setTileType] = useState<'street' | 'satellite'>('street');
  const plan = propPlan || complaint.response_plan;
  const incidentLat = complaint.latitude || 26.8467;
  const incidentLon = complaint.longitude || 80.9462;
  const accuracy = complaint.gps_accuracy || 25;

  const incidentIcon = createTacticalIcon('#D45060', '🚨', `${complaint.risk_score}`, true);

  const primary = plan?.primary_response;
  const secondary = plan?.secondary_response;

  const points: { lat: number; lon: number }[] = [{ lat: incidentLat, lon: incidentLon }];

  if (primary?.latitude && primary?.longitude) {
    points.push({ lat: primary.latitude, lon: primary.longitude });
  }
  if (secondary?.latitude && secondary?.longitude) {
    points.push({ lat: secondary.latitude, lon: secondary.longitude });
  }

  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  return (
    <div className="rounded-2xl overflow-hidden vera-card shadow-2xl relative" style={{ height }}>
      {/* Floating Tile Layer Switcher (Street OSM & Satellite) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center vera-card-elevated p-1 shadow-2xl text-[11px] gap-1">
        <button
          onClick={() => setTileType('street')}
          className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
            tileType === 'street'
              ? 'bg-[#800020] text-[#FFF9F2] shadow-sm'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          Street (OSM)
        </button>
        <button
          onClick={() => setTileType('satellite')}
          className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
            tileType === 'satellite'
              ? 'bg-[#800020] text-[#FFF9F2] shadow-sm'
              : 'text-[var(--vera-text-muted)] hover:text-[var(--vera-text-primary)]'
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={[incidentLat, incidentLon]}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ background: 'var(--vera-bg)' }}
      >
        <TileLayer
          key={tileType}
          attribution='&copy; CARTO &bull; OpenStreetMap'
          url={tileUrls[tileType]}
          maxZoom={19}
        />

        <MapBoundsController points={points} />

        {/* Incident Ground Zero Marker */}
        <Marker position={[incidentLat, incidentLon]} icon={incidentIcon}>
          <Popup className="custom-popup">
            <div className="p-2 vera-card min-w-[200px]">
              <strong className="block text-[#D45060] font-bold mb-1 flex items-center gap-1">
                <span>🚨</span> Ground Zero Scene
              </strong>
              <div className="text-xs font-semibold text-[var(--vera-text-primary)]">{complaint.category}</div>
              <div className="text-[11px] text-[var(--vera-text-secondary)] mt-1 line-clamp-2">{complaint.description}</div>
              <div className="text-[10px] font-mono text-[var(--brand-primary)] mt-1.5 pt-1 border-t border-[var(--vera-border)] flex justify-between">
                <span>Risk: {complaint.risk_score}/100</span>
                <span>Accuracy: ±{Math.round(accuracy)}m</span>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* GPS Accuracy Circle */}
        <Circle
          center={[incidentLat, incidentLon]}
          radius={accuracy}
          pathOptions={{
            color: '#D45060',
            fillColor: '#D45060',
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: '4, 4',
          }}
        />

        {/* Primary Response Unit Marker & Vector Line */}
        {primary && (
          <>
            <Marker
              position={[primary.latitude, primary.longitude]}
              icon={createTacticalIcon('#800020', '🏥', `~${primary.estimated_eta_minutes}m`)}
            >
              <Popup className="custom-popup">
                <div className="p-2 vera-card min-w-[200px]">
                  <strong className="block text-[var(--brand-primary)] font-bold mb-1 flex items-center gap-1">
                    <span>🏥</span> Primary: {primary.name}
                  </strong>
                  <div className="text-[11px] text-[var(--vera-text-secondary)]">
                    Distance: <strong>{primary.distance_km} km</strong> &bull; ETA: <strong>~{primary.estimated_eta_minutes} min</strong>
                  </div>
                  <div className="text-[10px] text-[var(--brand-primary)] font-bold mt-1">Status: {primary.status}</div>
                  <div className="mt-2 pt-1.5 border-t border-[var(--vera-border)] flex items-center justify-between">
                    <a
                      href={primary.directions_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--brand-primary)] text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      Open in Maps &rarr;
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>

            <Polyline
              positions={[
                [incidentLat, incidentLon],
                [primary.latitude, primary.longitude],
              ]}
              pathOptions={{
                color: '#800020',
                weight: 3,
                opacity: 0.9,
                dashArray: '6, 6',
              }}
            />
          </>
        )}

        {/* Secondary Response Unit Marker & Vector Line */}
        {secondary && (
          <>
            <Marker
              position={[secondary.latitude, secondary.longitude]}
              icon={createTacticalIcon('#D45060', '🚓', `~${secondary.estimated_eta_minutes}m`)}
            >
              <Popup className="custom-popup">
                <div className="p-2 vera-card min-w-[200px]">
                  <strong className="block text-[#D45060] font-bold mb-1 flex items-center gap-1">
                    <span>🚓</span> Secondary: {secondary.name}
                  </strong>
                  <div className="text-[11px] text-[var(--vera-text-secondary)]">
                    Distance: <strong>{secondary.distance_km} km</strong> &bull; ETA: <strong>~{secondary.estimated_eta_minutes} min</strong>
                  </div>
                  <div className="text-[10px] text-[#D45060] font-bold mt-1">Status: {secondary.status}</div>
                  <div className="mt-2 pt-1.5 border-t border-[var(--vera-border)] flex items-center justify-between">
                    <a
                      href={secondary.directions_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#D45060] text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      Open in Maps &rarr;
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>

            <Polyline
              positions={[
                [incidentLat, incidentLon],
                [secondary.latitude, secondary.longitude],
              ]}
              pathOptions={{
                color: '#D45060',
                weight: 3,
                opacity: 0.9,
                dashArray: '6, 6',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
};

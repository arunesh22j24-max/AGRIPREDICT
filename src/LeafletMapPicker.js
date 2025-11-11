import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in leaflet
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
    dragend(e) {
      // Not needed, marker handles drag
    }
  });
  return position === null ? null : (
    <Marker
      position={position}
      icon={markerIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          setPosition([lat, lng]);
        }
      }}
    />
  );
}

export default function LeafletMapPicker({ lat, lon, onChange }) {
  const [position, setPosition] = React.useState([
    lat || 20.3,
    lon || 85.8
  ]);

  React.useEffect(() => {
    if (onChange && position) {
      onChange(position[0], position[1]);
    }
    // eslint-disable-next-line
  }, [position]);

  return (
    <MapContainer
      center={position}
      zoom={8}
      style={{ height: 250, width: 350 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}

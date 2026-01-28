import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'

// Fix for default marker icons in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom marker icons
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  })
}

const ICONS = {
  amex: createIcon('#f59e0b'), // amber-500
  chase: createIcon('#3b82f6'), // blue-500
}

export default function Map({ restaurants, filters, flyToLocation, onFlyComplete }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const clusterGroupRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState(null)

  // Handle fly to location from search
  useEffect(() => {
    if (!flyToLocation || !mapInstanceRef.current) return
    mapInstanceRef.current.flyTo([flyToLocation.lat, flyToLocation.lon], flyToLocation.zoom || 12, {
      duration: 1.5,
    })
    if (onFlyComplete) onFlyComplete()
  }, [flyToLocation, onFlyComplete])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Center on USA
    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: false,
    })

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Create marker cluster group with custom styling
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        let size = 'small'
        if (count > 100) size = 'large'
        else if (count > 10) size = 'medium'

        const sizes = {
          small: { width: 30, height: 30, fontSize: 12 },
          medium: { width: 40, height: 40, fontSize: 14 },
          large: { width: 50, height: 50, fontSize: 16 },
        }

        const s = sizes[size]
        return L.divIcon({
          html: `<div style="
            background: linear-gradient(135deg, #f59e0b, #ea580c);
            width: ${s.width}px;
            height: ${s.height}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: ${s.fontSize}px;
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          ">${count}</div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(s.width, s.height),
        })
      },
    })

    map.addLayer(clusterGroup)
    clusterGroupRef.current = clusterGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      clusterGroupRef.current = null
    }
  }, [])

  // Update markers when restaurants or filters change
  useEffect(() => {
    const map = mapInstanceRef.current
    const clusterGroup = clusterGroupRef.current
    if (!map || !clusterGroup) return

    // Clear existing markers
    clusterGroup.clearLayers()

    // Filter restaurants
    const filtered = restaurants.filter(r => {
      if (r.program === 'amex' && !filters.amex) return false
      if (r.program === 'chase' && !filters.chase) return false
      return true
    })

    // Add markers to cluster group
    const markers = filtered.map(restaurant => {
      const icon = ICONS[restaurant.program] || ICONS.amex
      return L.marker([restaurant.lat, restaurant.lon], { icon })
        .bindPopup(createPopupContent(restaurant), {
          maxWidth: 280,
          className: 'custom-popup',
        })
    })

    clusterGroup.addLayers(markers)
  }, [restaurants, filters])

  // Handle locate user
  const handleLocate = () => {
    if (!mapInstanceRef.current) return

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        mapInstanceRef.current.setView([latitude, longitude], 12)

        // Remove existing user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.remove()
        }

        // Add user location marker
        const userIcon = L.divIcon({
          className: 'user-marker',
          html: `<div style="
            background: #22c55e;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3), 0 2px 5px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const userMarker = L.marker([latitude, longitude], { icon: userIcon })
          .bindPopup('You are here')
          .addTo(mapInstanceRef.current)

        userMarkerRef.current = userMarker
        setIsLocating(false)
      },
      (error) => {
        setIsLocating(false)
        setLocationError('Unable to get your location')
        console.error('Geolocation error:', error)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Locate button */}
      <button
        onClick={handleLocate}
        disabled={isLocating}
        className="absolute top-4 right-4 z-[1000] bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg shadow-lg border border-slate-600 transition-colors disabled:opacity-50"
        title="Find my location"
      >
        {isLocating ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-sm">
          {locationError}
        </div>
      )}
    </div>
  )
}

function createPopupContent(restaurant) {
  const programLabel = restaurant.program === 'amex'
    ? 'Amex Global Dining'
    : 'Chase Sapphire Reserve'

  const programBg = restaurant.program === 'amex'
    ? 'background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3);'
    : 'background: rgba(59, 130, 246, 0.15); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3);'

  const bookingUrl = restaurant.website || ''
  const bookingPlatform = restaurant.program === 'amex' ? 'Resy' : 'OpenTable'

  const addressLine = restaurant.address || `${restaurant.city}${restaurant.state ? ', ' + restaurant.state : ''}`

  return `
    <div style="padding: 4px;">
      <h3 style="font-weight: 600; color: #1e293b; font-size: 15px; margin-bottom: 4px; line-height: 1.3;">${restaurant.name}</h3>
      <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">${addressLine}</p>
      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; ${programBg} margin-bottom: 10px;">
        ${programLabel}
      </span>
      ${bookingUrl ? `
        <a
          href="${bookingUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="display: block; width: 100%; text-align: center; background: #f59e0b; color: white; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 6px; text-decoration: none;"
          onmouseover="this.style.background='#d97706'"
          onmouseout="this.style.background='#f59e0b'"
        >
          Book on ${bookingPlatform}
        </a>
      ` : ''}
    </div>
  `
}

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { firestoreService } from "../lib/firebase";
import { Location, User } from "../types";

import { getGeocodedAddress, AddressDisplay } from "./map/AddressDisplay";
import { categoryConfig } from "./map/config";
import { Skeleton } from "./map/Skeleton";
import { PhotoGallery } from "./map/PhotoGallery";
import { DeleteDialog } from "./map/DeleteDialog";
import { WarnMapDialog } from "./map/WarnMapDialog";
import { CreateLocationDialog } from "./map/CreateLocationDialog";
import { EditLocationPanel } from "./map/EditLocationPanel";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("មិនអាចផ្ទុក Google Maps បានទេ"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const WarnDialog = WarnMapDialog;
const CreateDialog = CreateLocationDialog;
const EditPanel = EditLocationPanel;

export default function AdminFarmMap() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Farm" | "Market">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [warnTarget, setWarnTarget] = useState<Location | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<User | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const selected = locations.find((l) => l.id === selectedId) || null;

  useEffect(() => {
    if (!selected?.owner?.uuid) { setOwnerProfile(null); return; }
    let cancelled = false;
    firestoreService.getUserById(selected.owner.uuid).then((user) => {
      if (!cancelled) setOwnerProfile(user);
    }).catch(() => { if (!cancelled) setOwnerProfile(null); });
    return () => { cancelled = true; };
  }, [selected?.owner?.uuid]);

  useEffect(() => {
    const unsub = firestoreService.subscribeLocations((locs) => {
      setLocations(locs);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapsError(true);
      setMapsLoaded(false);
      return;
    }
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => setMapsError(true));
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 11.55, lng: 104.92 },
      zoom: 8,
      mapId: "admin_farm_map",
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "simplified" }] },
        { featureType: "water", stylers: [{ color: "#d4f1f9" }] },
      ],
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, [mapsLoaded]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let listener: google.maps.MapsEventListener | null = null;

    if (pickMode) {
      map.setOptions({ draggableCursor: "crosshair" });
      listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setPickedCoords({ lat, lng });

        if (pickMarkerRef.current) pickMarkerRef.current.map = null;

        const el = document.createElement("div");
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #16a34a;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(22,163,74,0.3), 0 2px 8px rgba(0,0,0,0.2);
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.8; }
            }
          </style>
        `;
        const markerEl = el.firstChild as HTMLElement;

        pickMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          content: markerEl,
        });

        setPickMode(false);
        setShowCreate(true);
      });
    } else {
      map.setOptions({ draggableCursor: "" });
    }

    return () => {
      if (listener) google.maps.event.removeListener(listener);
    };
  }, [pickMode]);

  const renderMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !mapsLoaded) return;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const filtered = getFilteredLocations();

    filtered.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const conf = categoryConfig[loc.category] || categoryConfig.Farm;

      const markerEl = document.createElement("div");
      markerEl.style.cssText = `
        width: 42px;
        height: 42px;
        border-radius: 50%;
        cursor: pointer;
        background: ${conf.markerColor};
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      `;
      markerEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${loc.category === "Farm" ? '<path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>' : '<path d="M3 3h18l-2 13H5L3 3z"/><circle cx="9" cy="22" r="1"/><circle cx="17" cy="22" r="1"/>'}</svg>`;

      markerEl.addEventListener("mouseenter", () => {
        markerEl.style.transform = "scale(1.2)";
      });
      markerEl.addEventListener("mouseleave", () => {
        markerEl.style.transform = "scale(1)";
      });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: loc.latitude, lng: loc.longitude },
        map: mapInstanceRef.current!,
        content: markerEl,
        title: loc.name,
      });

      marker.addListener("click", () => {
        setSelectedId(loc.id);
        setIsEditing(false);

        if (infoWindowRef.current) {
          const statusColor = loc.status === "active" ? "#16a34a" : "#dc2626";
          const statusBg = loc.status === "active" ? "#f0fdf4" : "#fef2f2";
          const warned = loc.moderation?.status === "warned";
          infoWindowRef.current.setContent(`
            <div style="font-family: system-ui, -apple-system, 'Inter', sans-serif; padding: 8px; min-width: 220px; max-width: 280px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                ${loc.profileUrl 
                  ? `<img src="${loc.profileUrl}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" />`
                  : `<div style="width: 48px; height: 48px; border-radius: 12px; background: ${conf.markerColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">${loc.name?.charAt(0)?.toUpperCase()}</div>`
                }
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; font-size: 14px; color: #1b1b1b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${loc.name}</div>
                  <div style="display: flex; gap: 6px; margin-top: 4px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: 20px; background: ${conf.bg}; color: ${conf.color}; font-weight: 500;">${loc.category === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}</span>
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: 20px; background: ${statusBg}; color: ${statusColor}; font-weight: 500;">${loc.status === "active" ? "សកម្ម" : "អសកម្ម"}</span>
                    ${warned ? `<span style="font-size: 11px; padding: 2px 8px; border-radius: 20px; background: #fef3c7; color: #d97706; font-weight: 500;">បានព្រមាន</span>` : ""}
                  </div>
                </div>
              </div>
              <div style="font-size: 11px; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                <span id="iw-addr-${loc.id}">${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}</span>
                ${loc.contact?.phoneNumber ? `<span>${loc.contact.phoneNumber}</span>` : ""}
              </div>
            </div>
          `);
          infoWindowRef.current.open({
            anchor: marker,
            map: mapInstanceRef.current,
          });
          if (loc.latitude && loc.longitude) {
            getGeocodedAddress(loc.latitude, loc.longitude).then((addr) => {
              const el = document.getElementById(`iw-addr-${loc.id}`);
              if (el) el.innerText = addr;
            });
          }
        }
      });

      markersRef.current.push(marker);
    });
  }, [locations, filter, statusFilter, search, mapsLoaded]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  useEffect(() => {
    if (!selected || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo({
      lat: selected.latitude,
      lng: selected.longitude,
    });
    mapInstanceRef.current.setZoom(14);
  }, [selected]);

  function getFilteredLocations() {
    return locations.filter((loc) => {
      if (filter !== "all" && loc.category !== filter) return false;
      if (statusFilter !== "all" && loc.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          loc.name?.toLowerCase().includes(q) ||
          loc.detail?.about?.toLowerCase().includes(q) ||
          loc.contact?.phoneNumber?.includes(q)
        );
      }
      return true;
    });
  }

  const filtered = getFilteredLocations();
  const farmCount = locations.filter((l) => l.category === "Farm").length;
  const marketCount = locations.filter((l) => l.category === "Market").length;
  const activeCount = locations.filter((l) => l.status === "active").length;
  const inactiveCount = locations.filter((l) => l.status === "inactive").length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await firestoreService.deleteLocation(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVisibility = async (loc: Location) => {
    try {
      await firestoreService.updateLocationVisibility(
        loc.id,
        !loc.visibility?.isVisible
      );
    } catch (err) {
      console.error("Visibility toggle error:", err);
    }
  };

  const handleToggleStatus = async (loc: Location) => {
    try {
      await firestoreService.updateLocationStatus(
        loc.id,
        loc.status === "active" ? "inactive" : "active"
      );
    } catch (err) {
      console.error("Status toggle error:", err);
    }
  };

  const handleSaveEdit = async (data: Partial<Location>) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await firestoreService.updateLocation(selected.id, data);
      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWarn = async (message: string) => {
    if (!warnTarget) return;
    setIsWarning(true);
    try {
      await firestoreService.warnLocation(warnTarget.id, { adminId: "admin", message });
      setWarnTarget(null);
    } catch (err) {
      console.error("Warn error:", err);
    } finally {
      setIsWarning(false);
    }
  };

  const handleClearWarning = async (loc: Location) => {
    try {
      await firestoreService.clearLocationWarning(loc.id);
    } catch (err) {
      console.error("Clear warning error:", err);
    }
  };

  const handleCreate = async (data: any) => {
    setIsCreating(true);
    try {
      await firestoreService.createLocation(data);
      setShowCreate(false);
      setPickedCoords(null);
      if (pickMarkerRef.current) {
        pickMarkerRef.current.map = null;
        pickMarkerRef.current = null;
      }
    } catch (err) {
      console.error("Create error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative overflow-hidden h-[calc(100vh-64px)]">
      <div className="absolute inset-0">
        {mapsError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1b1b1b] mb-2">ត្រូវការការកំណត់រចនាសម្ព័ន្ធផែនទី</h3>
              <p className="text-sm text-gray-500">សូមបន្ថែម Google Maps API key ទៅក្នុង <code className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono">.env</code> ជា <code className="px-2 py-1 bg-gray-100 rounded-lg text-xs font-mono ml-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code></p>
            </div>
          </div>
        ) : !mapsLoaded ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-3 border-emerald-200 border-t-emerald-600 mx-auto mb-4"
              />
              <p className="text-sm text-gray-500">កំពុងផ្ទុកផែនទី...</p>
            </div>
          </div>
        ) : null}
        <div ref={mapRef} className="w-full h-full" style={{ display: mapsError ? "none" : "block" }} />
      </div>

      <div className="absolute inset-0 pointer-events-none z-10">
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.aside
              initial={{ x: -420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -420, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute left-3 top-3 bottom-3 w-[90vw] sm:w-[440px] flex flex-col rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            >
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#1b1b1b]">គ្រប់គ្រងទីតាំង</h2>
                      <p className="text-xs text-gray-500">កសិដ្ឋាន និងផ្សារ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (pickMode) {
                          setPickMode(false);
                          if (pickMarkerRef.current) pickMarkerRef.current.map = null;
                        } else {
                          setPickMode(true);
                          setSidebarCollapsed(true);
                          setSelectedId(null);
                          setIsEditing(false);
                          setDeleteTarget(null);
                          setWarnTarget(null);
                          setShowCreate(false);
                          setPickedCoords(null);
                          if (pickMarkerRef.current) { pickMarkerRef.current.map = null; pickMarkerRef.current = null; }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-4 py-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        pickMode
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-green-600 text-white hover:bg-green-700 shadow-md"
                      }`}
                    >
                      {pickMode ? (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          បោះបង់
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          បន្ថែមទីតាំង
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-xl font-bold text-[#1b1b1b]">{locations.length}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">សរុប</div>
                  </div>
                  <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-xl font-bold text-green-700">{farmCount}</div>
                    <div className="text-[10px] text-green-600 uppercase tracking-wide">កសិដ្ឋាន</div>
                  </div>
                  <div className="bg-orange-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-xl font-bold text-orange-700">{marketCount}</div>
                    <div className="text-[10px] text-orange-600 uppercase tracking-wide">ទីផ្សារ</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
                    <div className="text-xl font-bold text-blue-700">{activeCount}</div>
                    <div className="text-[10px] text-blue-600 uppercase tracking-wide">សកម្ម</div>
                  </div>
                </div>

                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ស្វែងរកតាមឈ្មោះ ការពិពណ៌នា ឬលេខទូរស័ព្ទ..."
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[#1b1b1b] text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {(["all", "Farm", "Market"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-all ${
                        filter === f
                          ? f === "Farm"
                            ? "bg-green-100 text-green-700 ring-1 ring-green-500"
                            : f === "Market"
                            ? "bg-orange-100 text-orange-700 ring-1 ring-orange-500"
                            : "bg-gray-800 text-white"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {f === "all" ? "ទាំងអស់" : f === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
                    </button>
                  ))}
                  <div className="w-px bg-gray-200 mx-1" />
                  {(["all", "active", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                        statusFilter === s
                          ? s === "active"
                            ? "bg-green-100 text-green-700 ring-1 ring-green-500"
                            : s === "inactive"
                            ? "bg-red-100 text-red-700 ring-1 ring-red-500"
                            : "bg-gray-800 text-white"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {s === "all" ? "ទាំងអស់" : s === "active" ? "សកម្ម" : "អសកម្ម"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                  <Skeleton />
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                    <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium">រកមិនឃើញទីតាំងទេ</p>
                    <p className="text-xs mt-1">ព្យាយាមកែសម្រួលការស្វែងរក ឬបន្ថែមទីតាំងថ្មី</p>
                  </div>
                ) : (
                  filtered.map((loc) => {
                    const conf = categoryConfig[loc.category] || categoryConfig.Farm;
                    const isSelected = selectedId === loc.id;

                    return (
                      <motion.div
                        key={loc.id}
                        layout
                        onClick={() => {
                          setSelectedId(isSelected ? null : loc.id);
                          setIsEditing(false);
                        }}
                        className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-all border-b border-gray-100 ${
                          isSelected
                            ? "bg-green-50 border-l-4 border-l-green-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative shrink-0">
                          {loc.profileUrl ? (
                            <img
                              src={loc.profileUrl}
                              alt={loc.name}
                              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                              style={{ background: conf.markerColor }}
                            >
                              {loc.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                            style={{ background: conf.markerColor }}
                          >
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d={conf.icon} /></svg>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-semibold text-[#1b1b1b] truncate">
                              {loc.name}
                            </p>
                            {!loc.visibility?.isVisible && (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                បានលាក់
                              </span>
                            )}
                            {loc.moderation?.status === "warned" && (
                              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                បានព្រមាន
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {loc.detail?.about || "មិនមានការពិពណ៌នា"}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ background: conf.bg, color: conf.color }}
                          >
                            {loc.category === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
                          </span>
                          <span
                            className={`text-[13px] px-2 py-0.5 rounded-full font-medium ${
                              loc.status === "active"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {loc.status === "active" ? "សកម្ម" : "អសកម្ម"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {sidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-3 top-3 z-20 w-12 h-12 rounded-xl shadow-xl flex items-center justify-center text-gray-600 hover:text-[#1b1b1b] transition-all pointer-events-auto cursor-pointer"
            style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </motion.button>
        )}

        <AnimatePresence>
          {pickMode && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
            >
              <div className="flex items-center gap-4 px-5 py-3 rounded-2xl shadow-xl" style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)" }}>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1b1b1b]">សូមចុចលើផែនទីដើម្បីជ្រើសរើសទីតាំង</p>
                  <p className="text-xs text-gray-500">ជ្រើសរើសកន្លែងដែលទីតាំងថ្មីនឹងត្រូវដាក់</p>
                </div>
                <button
                  onClick={() => {
                    setPickMode(false);
                    if (pickMarkerRef.current) pickMarkerRef.current.map = null;
                  }}
                  className="ml-2 px-4 py-1.5 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  បោះបង់
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: 450, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 450, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute right-3 top-3 bottom-3 w-[90vw] sm:w-[440px] rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            >
              <div className="h-full overflow-y-auto no-scrollbar">
                <div className="relative h-56 bg-gradient-to-br from-green-500 to-green-700">
                  {selected.profileUrl ? (
                    <img
                      src={selected.profileUrl}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">
                        <svg className="w-16 h-16 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={categoryConfig[selected.category]?.icon} /></svg>
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <button
                    onClick={() => {
                      setSelectedId(null);
                      setIsEditing(false);
                    }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="absolute bottom-4 left-5 right-5">
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight drop-shadow-lg">
                        {selected.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm"
                          style={{
                            background:
                              categoryConfig[selected.category]?.bg ||
                              "rgba(255,255,255,0.2)",
                            color: "white",
                          }}
                        >
                          {selected.category === "Farm" ? "កសិដ្ឋាន" : "ទីផ្សារ"}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full backdrop-blur-sm ${
                            selected.status === "active"
                              ? "bg-green-500/40 text-green-100"
                              : "bg-red-500/40 text-red-100"
                          }`}
                        >
                          {selected.status === "active" ? "សកម្ម" : "អសកម្ម"}
                        </span>
                        {selected.moderation?.status === "warned" && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/40 text-amber-100 backdrop-blur-sm">
                            បានព្រមាន
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {isEditing ? (
                      <EditPanel
                        key="edit"
                        location={selected}
                        onSave={handleSaveEdit}
                        onCancel={() => setIsEditing(false)}
                        isSaving={isSaving}
                      />
                    ) : (
                      <motion.div
                        key="view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            កែសម្រួល
                          </button>
                          <button
                            onClick={() => handleToggleVisibility(selected)}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                              selected.visibility?.isVisible
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={selected.visibility?.isVisible ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                            </svg>
                            {selected.visibility?.isVisible ? "លាក់" : "បង្ហាញ"}
                          </button>
                          <button
                            onClick={() => setWarnTarget(selected)}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            ព្រមាន
                          </button>
                          <button
                            onClick={() => setDeleteTarget(selected)}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            លុបចោល
                          </button>
                        </div>

                        {selected.moderation?.status === "warned" && (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span className="text-xs font-semibold text-amber-800">កំពុងមានការព្រមាន</span>
                              </div>
                              <p className="text-xs text-amber-700 line-clamp-2">{selected.moderation.message}</p>
                            </div>
                            <button
                              onClick={() => handleClearWarning(selected)}
                              className="ml-3 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              សម្អាត
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${selected.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-sm font-medium text-gray-700">ស្ថានភាព</span>
                          </div>
                          <button
                            onClick={() => handleToggleStatus(selected)}
                            className={`relative w-12 h-6 cursor-pointer rounded-full transition-colors ${
                              selected.status === "active" ? "bg-green-500" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                selected.status === "active" ? "left-[26px]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>

                        {selected.detail?.about && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              អំពីទីតាំង
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {selected.detail.about}
                            </p>
                          </div>
                        )}

                        {selected.category === "Farm" && selected.detail?.growing && selected.detail.growing.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              ដំណាំដែលដាំដុះ
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {selected.detail.growing.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 rounded-xl bg-green-50 text-green-700 text-xs font-medium"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            ព័ត៌មានទំនាក់ទំនង
                          </h4>
                          <div className="space-y-2">
                            {selected.contact?.phoneNumber && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                </div>
                                <span className="text-sm text-gray-700 font-mono">{selected.contact.phoneNumber}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <AddressDisplay lat={selected.latitude} lng={selected.longitude} className="text-xs text-gray-500 leading-snug" />
                            </div>
                          </div>
                        </div>

                        {selected.photos && selected.photos.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              រូបថត ({selected.photos.length})
                            </h4>
                            <PhotoGallery photos={selected.photos} />
                          </div>
                        )}

                        <div className="pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">ថ្ងៃបង្កើត</p>
                              <p className="text-xs text-gray-600 mt-1 font-medium">
                                {selected.createdAt
                                  ? new Date(selected.createdAt).toLocaleDateString("km-KH", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">ម្ចាស់ទីតាំង</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                {ownerProfile?.profileImageUrl ? (
                                  <img src={ownerProfile.profileImageUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-[#1b1b1b]">
                                    {ownerProfile?.first_name?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-[#1b1b1b] truncate">
                                    {ownerProfile ? `${ownerProfile.first_name || ""} ${ownerProfile.last_name || ""}`.trim() || "មិនស្គាល់" : "កំពុងផ្ទុក..."}
                                  </p>
                                  {ownerProfile?.email && <p className="text-[10px] text-gray-400 truncate">{ownerProfile.email}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">លេខសម្គាល់ទីតាំង</p>
                            <p className="text-xs text-gray-500 mt-1 font-mono truncate">{selected.id}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            location={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {warnTarget && (
          <WarnDialog
            location={warnTarget}
            onConfirm={handleWarn}
            onCancel={() => setWarnTarget(null)}
            isWarning={isWarning}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && pickedCoords && (
          <CreateDialog
            coords={pickedCoords}
            onConfirm={handleCreate}
            onCancel={() => {
              setShowCreate(false);
              setPickedCoords(null);
              if (pickMarkerRef.current) pickMarkerRef.current.map = null;
            }}
            isCreating={isCreating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
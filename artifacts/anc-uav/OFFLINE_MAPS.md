# Offline map tiles

The native map view uses MapLibre Native. Map downloads are performed directly by the iOS or Android app and stored in MapLibre's local offline database; there is no Replit map proxy, account, API key, or app-server dependency. The browser preview retains the schematic map and cannot create native offline packs. Expo Go does not include MapLibre; the app must be rebuilt with its Expo config plugin for device use.

## Available layers

- **OpenStreetMap:** OpenFreeMap Liberty style, derived from OpenStreetMap/OpenMapTiles. OpenFreeMap's terms allow offline downloads up to 3,000 tiles or 50 MB per download, with at most four parallel requests. The app applies MapLibre's 3,000-tile device limit and a 45 MB safety threshold, below the provider's 50 MB cap. Do not switch this source to `tile.openstreetmap.org`; the OSM Foundation explicitly prohibits prefetching and offline area downloads from that server.
- **Topographic:** Geoscience Australia's Australian Topographic Base Map, CC BY 4.0. It is a 1:250,000 base map and may look soft when enlarged. Preset regions are bounding rectangles, not exact state borders.
- **Satellite:** NASA EOSDIS GIBS VIIRS NOAA-21 corrected-reflectance true colour. Tiles are dated browse imagery (the app selects the previous UTC day), not high-resolution aerial photos; acquisition timing, clouds, and coverage vary. It is not current weather or an operational aviation image.

The app presents source attribution in the map and download controls. Estimates are approximate; provider tiles vary in size. Downloads are capped at 3,000 tiles and a 220 MB safety threshold for Geoscience Australia and NASA. An over-limit transfer pauses; delete the partial pack or use a smaller area/zoom.

## Area selection and privacy

Users can download the current map viewport, a preset Australia/state/territory rectangle, or a manually entered WGS84 bounding box. Preset rectangles can include adjacent areas and ocean. Zoom ranges begin at z0, and the selected maximum zoom controls detail and storage. Downloads can be paused, resumed when within limits, or deleted in the app. Tile hosts receive the requested tile coordinates and ordinary connection metadata such as IP address; a set of downloaded/viewed map coordinates can reveal the approximate area. The app does not send raw GPS fixes, route coordinates, or incident notes to map hosts, and does not route map requests through Replit.

## Aviation limitations

These basemaps are visual references only. They do not contain authoritative aeronautical charts, establish CTAF/airspace applicability, show live restrictions, terrain/obstacle clearance, or provide flight planning/clearance. Continue to use current official aviation sources and operator procedures.

## Source terms checked

- OpenStreetMap Foundation tile policy: https://operations.osmfoundation.org/policies/tiles/
- OpenFreeMap terms and offline download limit: https://openfreemap.org/tos/
- Geoscience Australia topographic service metadata: https://services.ga.gov.au/gis/rest/services/Topographic_Base_Map/MapServer
- NASA EOSDIS GIBS: https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs

Review provider terms and source availability again before each public release. These statements describe the current implementation and are not a legal opinion.

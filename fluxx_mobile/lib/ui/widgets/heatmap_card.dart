import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';
import '../../services/socket_service.dart';
import '../screens/full_screen_map_screen.dart';

class HeatmapCard extends ConsumerStatefulWidget {
  const HeatmapCard({super.key});

  @override
  ConsumerState<HeatmapCard> createState() => _HeatmapCardState();
}

class _HeatmapCardState extends ConsumerState<HeatmapCard> {
  MapboxMap? mapboxMap;
  bool isStyleLoaded = false;

  void _onMapCreated(MapboxMap mapboxMap) {
    this.mapboxMap = mapboxMap;
  }

  void _onStyleLoadedListener(StyleLoadedEventData data) async {
    isStyleLoaded = true;

    // 1. Flight Path Source (faint background)
    await mapboxMap?.style.addSource(GeoJsonSource(
      id: "aqi-source",
      data: '{"type":"FeatureCollection","features":[]}',
    ));
    
    await mapboxMap?.style.addLayer(HeatmapLayer(
      id: "aqi-heatmap",
      sourceId: "aqi-source",
      heatmapRadius: 15.0, // smaller
      heatmapOpacity: 0.3, // faint
      heatmapColorExpression: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0.0, "rgba(255, 255, 255, 0)",
        0.5, "rgba(255, 255, 255, 0.2)",
        1.0, "rgba(255, 255, 255, 0.4)",
      ],
    ));

    // 2. Hotspots Source (clustering priority)
    await mapboxMap?.style.addSource(GeoJsonSource(
      id: "hotspots-source",
      data: '{"type":"FeatureCollection","features":[]}',
    ));

    // Hotspot Circles
    await mapboxMap?.style.addLayer(CircleLayer(
      id: "hotspots-circle",
      sourceId: "hotspots-source",
      circleRadius: 12.0,
      circleStrokeWidth: 2.0,
      circleStrokeColor: 0xFFFFFFFF,
      circleColorExpression: [
        "match",
        ["get", "priority"],
        "P1", "rgba(255, 0, 0, 0.9)",     // Red
        "P2", "rgba(255, 128, 0, 0.9)",   // Orange
        "P3", "rgba(255, 255, 0, 0.9)",   // Yellow
        "rgba(0, 255, 0, 0.5)"            // Normal/Default
      ],
    ));

    // Hotspot Text (P1/P2/P3)
    await mapboxMap?.style.addLayer(SymbolLayer(
      id: "hotspots-text",
      sourceId: "hotspots-source",
      textField: "{priority}",
      textSize: 10.0,
      textColor: 0xFFFFFFFF,
    ));

    // If data already arrived before style loaded, update it now
    final initialData = ref.read(spatialTelemetryProvider).valueOrNull;
    if (initialData != null) {
      if (initialData.geoJson != null) {
        mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", initialData.geoJson!);
      }
      if (initialData.hotspotsGeoJson != null) {
        mapboxMap?.style.setStyleSourceProperty("hotspots-source", "data", initialData.hotspotsGeoJson!);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final connectionStateAsync = ref.watch(socketConnectionStreamProvider);
    final connectionState = connectionStateAsync.valueOrNull ?? SocketConnectionState.connecting;

    ref.listen(spatialTelemetryProvider, (previous, next) {
      final data = next.valueOrNull;
      if (isStyleLoaded && mapboxMap != null && data != null) {
        if (data.geoJson != null) {
          mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", data.geoJson!);
          
          // Parse the GeoJSON to find the center coordinate and recenter the map
          try {
            final parsed = jsonDecode(data.geoJson!);
            if (parsed['features'] != null && parsed['features'].isNotEmpty) {
              final firstFeature = parsed['features'].first;
              if (firstFeature['geometry'] != null && firstFeature['geometry']['coordinates'] != null) {
                final coords = firstFeature['geometry']['coordinates'];
                if (coords.length >= 2) {
                  final lon = coords[0] is double ? coords[0] : double.parse(coords[0].toString());
                  final lat = coords[1] is double ? coords[1] : double.parse(coords[1].toString());
                  print('[Mapbox] Recentering map to Mission Coordinate: Lat=$lat, Lon=$lon');
                  mapboxMap?.setCamera(CameraOptions(
                    center: Point(coordinates: Position(lon, lat)),
                    zoom: 12.0,
                  ));
                }
              }
            }
          } catch (e) {
            print('[Mapbox] Error parsing GeoJSON to recenter map: $e');
          }
        }
        if (data.hotspotsGeoJson != null) {
          mapboxMap?.style.setStyleSourceProperty("hotspots-source", "data", data.hotspotsGeoJson!);
        }
      }
    });

    return Container(
      height: 200,
      decoration: ShapeDecoration(
        shape: ContinuousRectangleBorder(
          borderRadius: BorderRadius.circular(38.0),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          RepaintBoundary(
            child: IgnorePointer(
              child: MapWidget(
                viewport: CameraViewportState(
                  center: Point(coordinates: Position(73.01, 19.01)),
                  zoom: 12.0,
                ),
                onMapCreated: _onMapCreated,
                onStyleLoadedListener: _onStyleLoadedListener,
              ),
            ),
          ),
          if (connectionState == SocketConnectionState.disconnected)
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: Text(
                'Offline - Disconnected from backend.',
                style: FluxxTypography.secondaryMetric.copyWith(color: Colors.redAccent),
              ),
            )
          else if (connectionState == SocketConnectionState.connecting)
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 16),
                  Text(
                    'Connecting to telemetry socket...',
                    style: FluxxTypography.secondaryMetric.copyWith(color: Colors.white),
                  ),
                ],
              ),
            ),
          Positioned(
            bottom: 16,
            left: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Air Quality Heatmap',
                  style: FluxxTypography.secondaryMetric.copyWith(fontWeight: FontWeight.w600, color: Colors.white),
                ),
                Text(
                  'हवेची गुणवत्ता उष्णतानका',
                  style: FluxxTypography.cardBody.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: AppleGlassCard(
              padding: EdgeInsets.zero,
              borderRadius: 24,
              child: IconButton(
                icon: const Icon(Icons.fullscreen, color: Colors.white),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const FullScreenMapScreen(),
                    ),
                  );
                },
              ),
            ),
          ),
          // Metric Selector
          Positioned(
            top: 12,
            left: 12,
            right: 64, // leave space for fullscreen button
            child: Row(
              children: [
                _buildMetricChip(context, ref, 'AQI', 'aqi'),
                const SizedBox(width: 8),
                _buildMetricChip(context, ref, 'PM2.5', 'pm25'),
                const SizedBox(width: 8),
                _buildMetricChip(context, ref, 'PM10', 'pm10'),
              ],
            ),
          ),
          // Priority Legend
          Positioned(
            bottom: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('P1: Critical', style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                  Text('P2: High', style: TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold)),
                  Text('P3: Mod', style: TextStyle(color: Colors.yellow, fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricChip(BuildContext context, WidgetRef ref, String label, String value) {
    final currentMetric = ref.watch(heatmapMetricProvider);
    final isSelected = currentMetric == value;
    
    return GestureDetector(
      onTap: () {
        ref.read(heatmapMetricProvider.notifier).state = value;
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.black45,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? Colors.transparent : Colors.white24),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

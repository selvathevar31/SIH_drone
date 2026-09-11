import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';

class FullScreenMapScreen extends ConsumerStatefulWidget {
  const FullScreenMapScreen({super.key});

  @override
  ConsumerState<FullScreenMapScreen> createState() => _FullScreenMapScreenState();
}

class _FullScreenMapScreenState extends ConsumerState<FullScreenMapScreen> {
  MapboxMap? mapboxMap;
  bool isStyleLoaded = false;

  void _onMapCreated(MapboxMap mapboxMap) {
    this.mapboxMap = mapboxMap;
  }

  void _onStyleLoadedListener(StyleLoadedEventData data) async {
    isStyleLoaded = true;

    // 1. Flight Path Source
    await mapboxMap?.style.addSource(GeoJsonSource(
      id: "aqi-source",
      data: '{"type":"FeatureCollection","features":[]}',
    ));
    
    await mapboxMap?.style.addLayer(HeatmapLayer(
      id: "aqi-heatmap",
      sourceId: "aqi-source",
      heatmapRadius: 15.0,
      heatmapOpacity: 0.3,
      heatmapColorExpression: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0.0, "rgba(255, 255, 255, 0)",
        0.5, "rgba(255, 255, 255, 0.2)",
        1.0, "rgba(255, 255, 255, 0.4)",
      ],
    ));

    // 2. Hotspots Source
    await mapboxMap?.style.addSource(GeoJsonSource(
      id: "hotspots-source",
      data: '{"type":"FeatureCollection","features":[]}',
    ));

    await mapboxMap?.style.addLayer(CircleLayer(
      id: "hotspots-circle",
      sourceId: "hotspots-source",
      circleRadius: 14.0,
      circleStrokeWidth: 2.0,
      circleStrokeColor: 0xFFFFFFFF,
      circleColorExpression: [
        "match",
        ["get", "priority"],
        "P1", "rgba(255, 0, 0, 0.9)",
        "P2", "rgba(255, 128, 0, 0.9)",
        "P3", "rgba(255, 255, 0, 0.9)",
        "rgba(0, 255, 0, 0.5)"
      ],
    ));

    await mapboxMap?.style.addLayer(SymbolLayer(
      id: "hotspots-text",
      sourceId: "hotspots-source",
      textField: "{priority}",
      textSize: 12.0,
      textColor: 0xFFFFFFFF,
    ));

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
    ref.listen(spatialTelemetryProvider, (previous, next) {
      final data = next.valueOrNull;
      if (isStyleLoaded && mapboxMap != null && data != null) {
        if (data.geoJson != null) {
          mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", data.geoJson!);
          
          try {
            final parsed = jsonDecode(data.geoJson!);
            if (parsed['features'] != null && parsed['features'].isNotEmpty) {
              final firstFeature = parsed['features'].first;
              if (firstFeature['geometry'] != null && firstFeature['geometry']['coordinates'] != null) {
                final coords = firstFeature['geometry']['coordinates'];
                if (coords.length >= 2) {
                  final lon = coords[0] is double ? coords[0] : double.parse(coords[0].toString());
                  final lat = coords[1] is double ? coords[1] : double.parse(coords[1].toString());
                  mapboxMap?.setCamera(CameraOptions(
                    center: Point(coordinates: Position(lon, lat)),
                    zoom: 12.0,
                  ));
                }
              }
            }
          } catch (_) {
            // Silently ignore GeoJSON parse errors for recentering
          }
        }
        if (data.hotspotsGeoJson != null) {
          mapboxMap?.style.setStyleSourceProperty("hotspots-source", "data", data.hotspotsGeoJson!);
        }
      }
    });

    return Scaffold(
      body: Stack(
        children: [
          MapWidget(
            viewport: CameraViewportState(
              center: Point(coordinates: Position(77.2090, 28.6139)),
              zoom: 11.0,
            ),
            onMapCreated: _onMapCreated,
            onStyleLoadedListener: _onStyleLoadedListener,
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  AppleGlassCard(
                    padding: EdgeInsets.zero,
                    borderRadius: 24,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  const SizedBox(width: 16),
                  _buildMetricChip(context, ref, 'AQI', 'aqi'),
                  const SizedBox(width: 8),
                  _buildMetricChip(context, ref, 'PM2.5', 'pm25'),
                  const SizedBox(width: 8),
                  _buildMetricChip(context, ref, 'PM10', 'pm10'),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 32,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('P1: Critical Hotspot', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                  Text('P2: High Priority', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
                  Text('P3: Moderate', style: TextStyle(color: Colors.yellow, fontSize: 12, fontWeight: FontWeight.bold)),
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.black45,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? Colors.transparent : Colors.white24),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

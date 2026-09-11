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

    await mapboxMap?.style.addSource(GeoJsonSource(
      id: "aqi-source",
      data: '{"type":"FeatureCollection","features":[]}',
    ));
    
    await mapboxMap?.style.addLayer(HeatmapLayer(
      id: "aqi-heatmap",
      sourceId: "aqi-source",
      heatmapRadius: 25.0,
      heatmapColorExpression: [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0.0, "rgba(0, 255, 0, 0)",
        0.2, "rgba(0, 255, 0, 1)",
        0.5, "rgba(255, 255, 0, 1)",
        0.8, "rgba(255, 191, 0, 1)",
        1.0, "rgba(255, 0, 255, 1)",
      ],
    ));

    final initialData = ref.read(liveTelemetryStreamProvider).valueOrNull?.geoJson;
    if (initialData != null) {
      mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", initialData);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(liveTelemetryStreamProvider, (previous, next) {
      final geoJsonString = next.valueOrNull?.geoJson;
      if (isStyleLoaded && mapboxMap != null && geoJsonString != null) {
        mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", geoJsonString);
      }
    });

    return Scaffold(
      body: Stack(
        children: [
          MapWidget(
            viewport: CameraViewportState(
              center: Point(coordinates: Position(73.01, 19.01)),
              zoom: 12.0,
            ),
            onMapCreated: _onMapCreated,
            onStyleLoadedListener: _onStyleLoadedListener,
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: AppleGlassCard(
                padding: EdgeInsets.zero,
                borderRadius: 24,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

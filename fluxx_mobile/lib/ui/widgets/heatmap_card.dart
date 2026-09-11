import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';

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

    // Initialize the source and layer so that updates can patch it
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

    // If data already arrived before style loaded, update it now
    final initialData = ref.read(liveTelemetryStreamProvider).valueOrNull?.geoJson;
    if (initialData != null) {
      mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", initialData);
    }
  }

  @override
  Widget build(BuildContext context) {
    final connectionStateAsync = ref.watch(socketConnectionStreamProvider);
    final isConnected = connectionStateAsync.valueOrNull ?? false;

    ref.listen(liveTelemetryStreamProvider, (previous, next) {
      final geoJsonString = next.valueOrNull?.geoJson;
      if (isStyleLoaded && mapboxMap != null && geoJsonString != null) {
        mapboxMap?.style.setStyleSourceProperty("aqi-source", "data", geoJsonString);
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
          MapWidget(
            viewport: CameraViewportState(
              center: Point(coordinates: Position(73.01, 19.01)),
              zoom: 12.0,
            ),
            onMapCreated: _onMapCreated,
            onStyleLoadedListener: _onStyleLoadedListener,
          ),
          if (!isConnected)
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: Text(
                'Offline - Waiting for backend socket connection...',
                style: FluxxTypography.secondaryMetric.copyWith(color: Colors.redAccent),
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
          )
        ],
      ),
    );
  }
}

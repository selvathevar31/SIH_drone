import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';

class HeatmapCard extends ConsumerWidget {
  const HeatmapCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final telemetryAsync = ref.watch(spatialTelemetryProvider);

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
          telemetryAsync.when(
            data: (telemetry) {
              return MapWidget(
                viewport: CameraViewportState(
                  center: Point(coordinates: Position(73.01, 19.01)),
                  zoom: 12.0,
                ),
                onMapCreated: (MapboxMap mapboxMap) async {
                  if (telemetry.geoJson != null) {
                    await mapboxMap.style.addSource(GeoJsonSource(
                      id: "aqi-source",
                      data: telemetry.geoJson!,
                    ));
                    
                    await mapboxMap.style.addLayer(HeatmapLayer(
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
                  }
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
            error: (e, st) => Center(
              child: Text(
                'Error loading map data',
                style: FluxxTypography.secondaryMetric.copyWith(color: Colors.red),
              ),
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

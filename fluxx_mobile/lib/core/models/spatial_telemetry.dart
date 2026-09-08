import 'package:flutter/foundation.dart';

/// A single geo-referenced AQI measurement.
@immutable
class TelemetryPoint {
  final double latitude;
  final double longitude;

  /// Normalised AQI value in range [0, 1] for heatmap intensity scaling.
  final double value;

  const TelemetryPoint({
    required this.latitude,
    required this.longitude,
    required this.value,
  });

  factory TelemetryPoint.fromJson(Map<String, dynamic> json) => TelemetryPoint(
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        value: (json['value'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'value': value,
      };

  TelemetryPoint copyWith({
    double? latitude,
    double? longitude,
    double? value,
  }) =>
      TelemetryPoint(
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        value: value ?? this.value,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TelemetryPoint &&
          runtimeType == other.runtimeType &&
          latitude == other.latitude &&
          longitude == other.longitude &&
          value == other.value;

  @override
  int get hashCode => Object.hash(latitude, longitude, value);

  @override
  String toString() =>
      'TelemetryPoint(latitude: $latitude, longitude: $longitude, value: $value)';
}

/// Collection of geo-referenced AQI data points for the heatmap layer.
@immutable
class SpatialTelemetry {
  final List<TelemetryPoint> points;

  /// Remote GeoJSON URL served by Supabase Storage for the Mapbox source.
  final String geoJsonUrl;

  /// Raw GeoJSON FeatureCollection data.
  final String? geoJson;

  const SpatialTelemetry({
    required this.points,
    required this.geoJsonUrl,
    this.geoJson,
  });

  factory SpatialTelemetry.fromJson(Map<String, dynamic> json) =>
      SpatialTelemetry(
        points: (json['points'] as List<dynamic>)
            .map((e) => TelemetryPoint.fromJson(e as Map<String, dynamic>))
            .toList(),
        geoJsonUrl: json['geoJsonUrl'] as String,
        geoJson: json['geoJson'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'points': points.map((p) => p.toJson()).toList(),
        'geoJsonUrl': geoJsonUrl,
        if (geoJson != null) 'geoJson': geoJson,
      };

  SpatialTelemetry copyWith({
    List<TelemetryPoint>? points,
    String? geoJsonUrl,
    String? geoJson,
  }) =>
      SpatialTelemetry(
        points: points ?? this.points,
        geoJsonUrl: geoJsonUrl ?? this.geoJsonUrl,
        geoJson: geoJson ?? this.geoJson,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SpatialTelemetry &&
          runtimeType == other.runtimeType &&
          geoJsonUrl == other.geoJsonUrl &&
          geoJson == other.geoJson;

  @override
  int get hashCode => Object.hash(geoJsonUrl, points.length, geoJson);

  @override
  String toString() =>
      'SpatialTelemetry(geoJsonUrl: $geoJsonUrl, points: ${points.length}, hasGeoJson: ${geoJson != null})';
}

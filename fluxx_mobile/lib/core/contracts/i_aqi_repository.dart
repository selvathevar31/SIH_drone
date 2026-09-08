import 'dart:async';
import 'package:fluxx_mobile/core/models/aqi_data.dart';
import 'package:fluxx_mobile/core/models/hourly_forecast.dart';
import 'package:fluxx_mobile/core/models/spatial_telemetry.dart';

abstract class IAqiRepository {
  /// Fetches the current AQI and primary pollutant metrics.
  /// Maps to: Supabase RPC 'get_current_aqi'
  Future<AqiData> getCurrentAqi();

  /// Fetches the rolling hourly forecast for the strip.
  /// Maps to: Supabase RPC 'get_hourly_forecast'
  Future<List<HourlyForecast>> getHourlyForecast();

  /// Fetches GeoJSON or tile data for the Mapbox HeatmapCard.
  /// Maps to: Supabase RPC 'get_spatial_telemetry'
  Future<SpatialTelemetry> getSpatialTelemetry();
}

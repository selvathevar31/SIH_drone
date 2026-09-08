import 'package:flutter/foundation.dart';

/// Represents the full environmental snapshot for a given location.
@immutable
class AqiData {
  /// US-AQI composite index (0–500).
  final int aqi;

  /// Human-readable health category (e.g. "Good", "Moderate", "Unhealthy").
  final String status;

  final String locationName;

  /// Ambient temperature in degrees Celsius.
  final double temperature;

  /// Sky condition label (e.g. "Sunny", "Hazy", "Overcast").
  final String condition;

  /// PM2.5 concentration in µg/m³.
  final double pm25;

  /// PM10 concentration in µg/m³.
  final double pm10;

  /// CO₂ concentration in ppm.
  final double co2;

  /// Relative humidity percentage (0–100).
  final double humidity;

  const AqiData({
    required this.aqi,
    required this.status,
    required this.locationName,
    required this.temperature,
    required this.condition,
    required this.pm25,
    required this.pm10,
    required this.co2,
    required this.humidity,
  });

  factory AqiData.fromJson(Map<String, dynamic> json) => AqiData(
        aqi: json['aqi'] as int,
        status: json['status'] as String,
        locationName: json['locationName'] as String,
        temperature: (json['temperature'] as num).toDouble(),
        condition: json['condition'] as String,
        pm25: (json['pm25'] as num).toDouble(),
        pm10: (json['pm10'] as num).toDouble(),
        co2: (json['co2'] as num).toDouble(),
        humidity: (json['humidity'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'aqi': aqi,
        'status': status,
        'locationName': locationName,
        'temperature': temperature,
        'condition': condition,
        'pm25': pm25,
        'pm10': pm10,
        'co2': co2,
        'humidity': humidity,
      };

  AqiData copyWith({
    int? aqi,
    String? status,
    String? locationName,
    double? temperature,
    String? condition,
    double? pm25,
    double? pm10,
    double? co2,
    double? humidity,
  }) =>
      AqiData(
        aqi: aqi ?? this.aqi,
        status: status ?? this.status,
        locationName: locationName ?? this.locationName,
        temperature: temperature ?? this.temperature,
        condition: condition ?? this.condition,
        pm25: pm25 ?? this.pm25,
        pm10: pm10 ?? this.pm10,
        co2: co2 ?? this.co2,
        humidity: humidity ?? this.humidity,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AqiData &&
          runtimeType == other.runtimeType &&
          aqi == other.aqi &&
          status == other.status &&
          locationName == other.locationName &&
          temperature == other.temperature &&
          condition == other.condition &&
          pm25 == other.pm25 &&
          pm10 == other.pm10 &&
          co2 == other.co2 &&
          humidity == other.humidity;

  @override
  int get hashCode => Object.hash(
      aqi, status, locationName, temperature, condition, pm25, pm10, co2, humidity);

  @override
  String toString() =>
      'AqiData(aqi: $aqi, status: $status, locationName: $locationName, '
      'temperature: $temperature, condition: $condition, pm25: $pm25, '
      'pm10: $pm10, co2: $co2, humidity: $humidity)';
}

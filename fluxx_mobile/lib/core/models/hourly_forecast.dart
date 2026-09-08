import 'package:flutter/foundation.dart';

/// A single hourly AQI + weather forecast data point.
@immutable
class HourlyForecast {
  final DateTime time;

  /// Ambient temperature in degrees Celsius for this hour.
  final double temperature;

  /// US-AQI composite index predicted for this hour.
  final int aqi;

  /// Sky/weather condition icon key (maps to an IconData lookup table).
  final String conditionIcon;

  const HourlyForecast({
    required this.time,
    required this.temperature,
    required this.aqi,
    required this.conditionIcon,
  });

  factory HourlyForecast.fromJson(Map<String, dynamic> json) => HourlyForecast(
        time: DateTime.parse(json['time'] as String),
        temperature: (json['temperature'] as num).toDouble(),
        aqi: json['aqi'] as int,
        conditionIcon: json['conditionIcon'] as String,
      );

  Map<String, dynamic> toJson() => {
        'time': time.toIso8601String(),
        'temperature': temperature,
        'aqi': aqi,
        'conditionIcon': conditionIcon,
      };

  HourlyForecast copyWith({
    DateTime? time,
    double? temperature,
    int? aqi,
    String? conditionIcon,
  }) =>
      HourlyForecast(
        time: time ?? this.time,
        temperature: temperature ?? this.temperature,
        aqi: aqi ?? this.aqi,
        conditionIcon: conditionIcon ?? this.conditionIcon,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HourlyForecast &&
          runtimeType == other.runtimeType &&
          time == other.time &&
          temperature == other.temperature &&
          aqi == other.aqi &&
          conditionIcon == other.conditionIcon;

  @override
  int get hashCode => Object.hash(time, temperature, aqi, conditionIcon);

  @override
  String toString() =>
      'HourlyForecast(time: $time, temperature: $temperature, '
      'aqi: $aqi, conditionIcon: $conditionIcon)';
}

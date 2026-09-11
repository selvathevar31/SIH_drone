import 'package:fluxx_mobile/core/contracts/i_aqi_repository.dart';
import 'package:fluxx_mobile/core/models/aqi_data.dart';
import 'package:fluxx_mobile/core/models/hourly_forecast.dart';
import 'package:fluxx_mobile/core/models/spatial_telemetry.dart';

/// In-memory mock of [IAqiRepository].
/// Simulates 2-second network latency on every call.
/// Replace the constructor body in the Riverpod provider when wiring
/// to the real Supabase RPC implementation.
class MockAqiRepository implements IAqiRepository {
  const MockAqiRepository();

  static const Duration _networkDelay = Duration(seconds: 2);

  @override
  Future<AqiData> getCurrentAqi() async {
    await Future<void>.delayed(_networkDelay);
    return const AqiData(
      aqi: 65,
      status: 'Moderate',
      locationName: 'Mumbai, IN',
      temperature: 66.0,
      condition: 'Sunny',
      pm25: 21.3,
      pm10: 45.2,
      co2: 418.3,
      humidity: 68.0,
    );
  }

  @override
  Future<List<HourlyForecast>> getHourlyForecast() async {
    await Future<void>.delayed(_networkDelay);
    final now = DateTime.now();
    return List.generate(24, (i) {
      final hour = now.add(Duration(hours: i));
      // Slight sinusoidal variation for realism.
      final tempOffset = (i % 6 < 3) ? i * 0.4 : -(i * 0.3);
      final aqiOffset = (i % 8 < 4) ? i * 1.5 : -(i * 1.2);
      return HourlyForecast(
        time: hour,
        temperature: 31.4 + tempOffset,
        aqi: (72 + aqiOffset).round().clamp(0, 300),
        conditionIcon: i < 6 || i > 18 ? 'moon_stars' : 'sun',
      );
    });
  }

  @override
  Future<SpatialTelemetry> getSpatialTelemetry({String metric = 'aqi'}) async {
    // 1-second delay as requested
    await Future<void>.delayed(const Duration(seconds: 1));

    // Wahal, Maharashtra (19.01 N, 73.01 E)
    const points = [
      TelemetryPoint(latitude: 19.010, longitude: 73.010, value: 0.65), // AQI 65
      TelemetryPoint(latitude: 19.015, longitude: 73.005, value: 1.30), // AQI 130
      TelemetryPoint(latitude: 19.005, longitude: 73.015, value: 0.30), // AQI 30
      TelemetryPoint(latitude: 19.008, longitude: 73.008, value: 0.80), // AQI 80
      TelemetryPoint(latitude: 19.012, longitude: 73.012, value: 1.50), // AQI 150
    ];

    // Generate GeoJSON FeatureCollection
    final features = points.map((p) => '''
    {
      "type": "Feature",
      "properties": {
        "aqi": ${p.value * 100},
        "intensity": ${p.value}
      },
      "geometry": {
        "type": "Point",
        "coordinates": [${p.longitude}, ${p.latitude}]
      }
    }
    ''').join(',');

    final geoJson = '''
    {
      "type": "FeatureCollection",
      "features": [$features]
    }
    ''';

    return SpatialTelemetry(
      geoJsonUrl: 'https://mock.fluxx.io/telemetry/wahal.geojson', // Dummy URL
      points: points,
      geoJson: geoJson,
    );
  }
}

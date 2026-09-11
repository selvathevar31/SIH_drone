import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:fluxx_mobile/core/contracts/i_aqi_repository.dart';
import 'package:fluxx_mobile/core/models/aqi_data.dart';
import 'package:fluxx_mobile/core/models/hourly_forecast.dart';
import 'package:fluxx_mobile/core/models/spatial_telemetry.dart';
import 'package:fluxx_mobile/data/repositories/mock_aqi_repository.dart';
import 'package:fluxx_mobile/services/api_service.dart';
import 'package:fluxx_mobile/services/location_service.dart';
import 'package:geolocator/geolocator.dart';

class ApiAqiRepository implements IAqiRepository {
  final MockAqiRepository _fallback = const MockAqiRepository();

  const ApiAqiRepository();

  @override
  Future<AqiData> getCurrentAqi() async {
    try {
      // 1. Get Location
      Position position = await LocationService.getCurrentLocation();
      String? userLocName = await LocationService.getLocationName(position.latitude, position.longitude);

      // 2. Query nearby air quality
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/aqi/nearby?lat=${position.latitude}&lon=${position.longitude}'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Define simple logic for category
        final aqiVal = data['aqi'] ?? 0;
        String cat = 'Good';
        if (aqiVal > 50) cat = 'Moderate';
        if (aqiVal > 100) cat = 'Unhealthy for Sensitive';
        if (aqiVal > 150) cat = 'Unhealthy';
        if (aqiVal > 200) cat = 'Very Unhealthy';
        if (aqiVal > 300) cat = 'Hazardous';

        return AqiData(
          aqi: aqiVal,
          status: cat,
          locationName: data['dataLocation'] != null ? data['dataLocation']['name'] : 'Unknown Source',
          userLocationName: userLocName,
          source: data['source'] ?? 'UNKNOWN',
          temperature: (data['temperature'] as num?)?.toDouble() ?? 30.0,
          condition: 'Clear',
          pm25: (data['pm25'] as num?)?.toDouble() ?? 0.0, 
          pm10: (data['pm10'] as num?)?.toDouble() ?? 0.0,
          co2: (data['co2'] as num?)?.toDouble() ?? 400.0,
          humidity: (data['humidity'] as num?)?.toDouble() ?? 50.0,
        );
      }
    } catch (e) {
      // Ignore and fallback
    }
    return _fallback.getCurrentAqi();
  }

  @override
  Future<List<HourlyForecast>> getHourlyForecast() async {
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/forecast/anand-vihar'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final forecastObj = data['forecast'];
        final predictedAqi = forecastObj['predicted_aqi'];
        
        final now = DateTime.now();
        List<HourlyForecast> list = [];
        
        // We have a 6h forecast, pad the rest via interpolation
        for (int i = 0; i < 24; i++) {
          final hour = now.add(Duration(hours: i));
          int aqi = data['current_aqi'] ?? 0;
          
          if (i == 6 && predictedAqi != null) {
            aqi = (predictedAqi as num).round();
          } else if (i > 0 && i < 6 && predictedAqi != null) {
            final curr = data['current_aqi'] as num;
            final step = ((predictedAqi as num) - curr) / 6;
            aqi = (curr + step * i).round();
          } else if (i > 6 && predictedAqi != null) {
            aqi = (predictedAqi as num).round(); // Hold at forecast
          }
          
          list.add(HourlyForecast(
            time: hour,
            temperature: 31.0,
            aqi: aqi,
            conditionIcon: i < 6 || i > 18 ? 'moon_stars' : 'sun',
          ));
        }
        return list;
      }
    } catch (e) {
      // Ignore and fallback
    }
    return _fallback.getHourlyForecast();
  }

  @override
  Future<SpatialTelemetry> getSpatialTelemetry({String metric = 'aqi'}) async {
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/heatmap?metric=$metric'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body); 
        return SpatialTelemetry(
          geoJson: jsonEncode(data['flight_path']),
          hotspotsGeoJson: jsonEncode(data['hotspots'])
        );
      }
    } catch (e) {
      // Ignore and fallback to graceful offline state
    }
    return _fallback.getSpatialTelemetry(); 
  }
}

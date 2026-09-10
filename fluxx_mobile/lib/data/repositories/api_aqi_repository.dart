import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:fluxx_mobile/core/contracts/i_aqi_repository.dart';
import 'package:fluxx_mobile/core/models/aqi_data.dart';
import 'package:fluxx_mobile/core/models/hourly_forecast.dart';
import 'package:fluxx_mobile/core/models/spatial_telemetry.dart';
import 'package:fluxx_mobile/data/repositories/mock_aqi_repository.dart';
import 'package:fluxx_mobile/services/api_service.dart';

class ApiAqiRepository implements IAqiRepository {
  final MockAqiRepository _fallback = const MockAqiRepository();

  const ApiAqiRepository();

  @override
  Future<AqiData> getCurrentAqi() async {
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/forecast/anand-vihar'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        return AqiData(
          aqi: data['current_aqi'] ?? 0,
          status: data['aqi_category'] ?? 'Unknown',
          locationName: data['location'] != null ? data['location']['name'] : 'Anand Vihar',
          temperature: 30.0, // Can be updated from backend later
          condition: 'Clear',
          pm25: 0.0, 
          pm10: 0.0,
          co2: 400.0,
          humidity: 50.0,
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
  Future<SpatialTelemetry> getSpatialTelemetry() async {
    try {
      final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/heatmap'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = response.body; // Mapbox Map GL layer expects GeoJSON string
        return SpatialTelemetry(geoJson: data);
      }
    } catch (e) {
      // Ignore and fallback to graceful offline state
    }
    return _fallback.getSpatialTelemetry(); 
  }
}

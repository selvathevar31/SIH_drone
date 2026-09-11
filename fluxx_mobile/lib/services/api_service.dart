import 'dart:convert';
import 'package:http/http.dart' as http;

/// Static HTTP client for the FLUXX Express backend.
///
/// All backend calls are centralised here so the base URL and
/// request format only need to change in one place.
class ApiService {
  /// Express server address (local network).
  /// For Android emulators use `http://10.0.2.2:8000` instead.
  static const String defaultUrl = 'http://10.0.2.2:8000';
  static const String baseUrl = String.fromEnvironment('API_URL', defaultValue: defaultUrl);

  /// Sends [prompt] to the AI query endpoint and returns the full JSON map.
  ///
  /// [missionId] scopes the query to a specific drone mission context.
  static Future<Map<String, dynamic>> queryAqiChat(
    String prompt, {
    String missionId = 'default',
  }) async {
    try {
      final url = Uri.parse('$baseUrl/api/aqi/chat');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': prompt,
          'mission_id': missionId,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        return decoded;
      }

      return {'answer': 'Server returned status ${response.statusCode}. Please try again.'};
    } catch (e) {
      return {
        'answer': 'Unable to reach the FLUXX server. Please check your connection and try again.'
      };
    }
  }
}

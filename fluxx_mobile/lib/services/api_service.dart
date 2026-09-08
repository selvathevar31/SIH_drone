import 'dart:convert';
import 'package:http/http.dart' as http;

/// Static HTTP client for the FLUXX Express backend.
///
/// All backend calls are centralised here so the base URL and
/// request format only need to change in one place.
class ApiService {
  /// Express server address (local network).
  /// For Android emulators use `http://10.0.2.2:8000` instead.
  static const String baseUrl = 'http://192.168.0.105:8000';

  /// Sends [prompt] to the AI query endpoint and returns the answer string.
  ///
  /// [missionId] scopes the query to a specific drone mission context.
  /// Returns a user-friendly fallback message if the server is unreachable.
  static Future<String> queryAiAssistant(
    String prompt, {
    String missionId = 'default',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ai/query'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'question': prompt,
          'mission_id': missionId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['answer'] as String;
      }

      return 'Server returned status ${response.statusCode}. Please try again.';
    } catch (e) {
      return 'Unable to reach the FLUXX server. '
          'Please check your connection and try again.';
    }
  }
}

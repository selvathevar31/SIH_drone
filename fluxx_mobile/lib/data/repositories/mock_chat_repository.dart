import 'package:fluxx_mobile/core/contracts/i_chat_repository.dart';
import 'package:fluxx_mobile/core/models/chat_response.dart';

/// In-memory mock of [IChatRepository].
/// Simulates 2-second RAG pipeline latency on every query.
/// Replace the provider binding when wiring to the real n8n webhook.
class MockChatRepository implements IChatRepository {
  const MockChatRepository();

  static const Duration _networkDelay = Duration(seconds: 2);

  @override
  Future<ChatResponse> queryRag(String prompt) async {
    await Future<void>.delayed(_networkDelay);

    // Deterministic mock responses keyed on simple keyword matching.
    final String reply;
    final lower = prompt.toLowerCase();
    if (lower.contains('pm2.5') || lower.contains('particulate')) {
      reply = 'assistant_response_pm25';
    } else if (lower.contains('aqi') || lower.contains('air quality')) {
      reply = 'assistant_response_aqi';
    } else if (lower.contains('humidity')) {
      reply = 'assistant_response_humidity';
    } else {
      reply = 'assistant_greeting';
    }

    return ChatResponse(
      message: reply,
      source: 'mock',
      timestamp: DateTime.now(),
    );
  }
}

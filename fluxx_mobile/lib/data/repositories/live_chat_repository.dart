import 'package:fluxx_mobile/core/contracts/i_chat_repository.dart';
import 'package:fluxx_mobile/core/models/chat_response.dart';
import 'package:fluxx_mobile/services/api_service.dart';

/// Live implementation of [IChatRepository] that calls the Express backend
/// via [ApiService].
///
/// Drop-in replacement for [MockChatRepository] — swap the provider
/// binding in `repository_providers.dart` to activate.
class LiveChatRepository implements IChatRepository {
  const LiveChatRepository();

  @override
  Future<ChatResponse> queryRag(String prompt) async {
    final answer = await ApiService.queryAiAssistant(prompt);

    return ChatResponse(
      message: answer,
      source: 'express',
      timestamp: DateTime.now(),
    );
  }
}

import 'dart:async';
import 'package:fluxx_mobile/core/models/chat_response.dart';

abstract class IChatRepository {
  /// Submits a query to the RAG backend and streams/returns the response.
  /// Maps to: n8n webhook / LangChain API endpoint
  Future<ChatResponse> queryRag(String prompt);
}

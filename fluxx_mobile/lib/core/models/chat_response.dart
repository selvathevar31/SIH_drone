import 'package:flutter/foundation.dart';

/// A single turn response from the n8n/LangChain RAG pipeline.
@immutable
class ChatResponse {
  /// The assistant's markdown-formatted reply text.
  final String message;

  /// Identifier of the backend source (e.g. "n8n", "langchain", "mock").
  final String source;

  final DateTime timestamp;

  const ChatResponse({
    required this.message,
    required this.source,
    required this.timestamp,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> json) => ChatResponse(
        message: json['message'] as String,
        source: json['source'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
      );

  Map<String, dynamic> toJson() => {
        'message': message,
        'source': source,
        'timestamp': timestamp.toIso8601String(),
      };

  ChatResponse copyWith({
    String? message,
    String? source,
    DateTime? timestamp,
  }) =>
      ChatResponse(
        message: message ?? this.message,
        source: source ?? this.source,
        timestamp: timestamp ?? this.timestamp,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatResponse &&
          runtimeType == other.runtimeType &&
          message == other.message &&
          source == other.source &&
          timestamp == other.timestamp;

  @override
  int get hashCode => Object.hash(message, source, timestamp);

  @override
  String toString() =>
      'ChatResponse(source: $source, timestamp: $timestamp, '
      'message: ${message.substring(0, message.length.clamp(0, 40))}...)';
}

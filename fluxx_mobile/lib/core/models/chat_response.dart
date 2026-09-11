import 'package:flutter/foundation.dart';

/// A single turn response from the n8n/LangChain RAG pipeline.
@immutable
class ChatResponse {
  /// The assistant's markdown-formatted reply text.
  final String message;

  /// Identifier of the backend source (e.g. "n8n", "langchain", "mock").
  final String source;

  final DateTime timestamp;

  final List<String> sources;
  final bool dataUsed;
  final bool ragUsed;

  const ChatResponse({
    required this.message,
    required this.source,
    required this.timestamp,
    this.sources = const [],
    this.dataUsed = false,
    this.ragUsed = false,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> json) => ChatResponse(
        message: json['message'] as String? ?? json['answer'] as String? ?? '',
        source: json['source'] as String? ?? 'express',
        timestamp: json['timestamp'] != null ? DateTime.parse(json['timestamp'] as String) : DateTime.now(),
        sources: (json['sources'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
        dataUsed: json['dataUsed'] as bool? ?? false,
        ragUsed: json['ragUsed'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'message': message,
        'source': source,
        'timestamp': timestamp.toIso8601String(),
        'sources': sources,
        'dataUsed': dataUsed,
        'ragUsed': ragUsed,
      };

  ChatResponse copyWith({
    String? message,
    String? source,
    DateTime? timestamp,
    List<String>? sources,
    bool? dataUsed,
    bool? ragUsed,
  }) =>
      ChatResponse(
        message: message ?? this.message,
        source: source ?? this.source,
        timestamp: timestamp ?? this.timestamp,
        sources: sources ?? this.sources,
        dataUsed: dataUsed ?? this.dataUsed,
        ragUsed: ragUsed ?? this.ragUsed,
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatResponse &&
          runtimeType == other.runtimeType &&
          message == other.message &&
          source == other.source &&
          timestamp == other.timestamp &&
          dataUsed == other.dataUsed &&
          ragUsed == other.ragUsed;

  @override
  int get hashCode => Object.hash(message, source, timestamp, dataUsed, ragUsed);

  @override
  String toString() =>
      'ChatResponse(source: $source, timestamp: $timestamp, '
      'message: ${message.substring(0, message.length.clamp(0, 40))}...)';
}

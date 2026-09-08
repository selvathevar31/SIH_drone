import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._(); // Private constructor to prevent instantiation

  // Base API Configuration
  static const String supabaseUrl = ''; // Paste your Supabase Project URL
  static const String supabaseAnonKey = ''; // Paste your Supabase Anon Key

  // Mapbox Integration
  // TODO: Paste your real Mapbox Public Access Token here for production.
  // The UI HeatmapCard will immediately reference this key to load the Mapbox Map GL view.
  static const String mapboxToken = 'INSERT_PUBLIC_TOKEN';

  // N8N RAG Webhook Endpoint
  static const String n8nRagWebhookUrl = ''; // Paste your N8N Webhook URL

  // Additional Services (Placeholders)
  static const String googleTranslateApiKey = ''; 

  static const bool isDevelopment = !kReleaseMode;
}

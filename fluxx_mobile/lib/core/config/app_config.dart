import 'package:flutter/foundation.dart';

class AppConfig {
  AppConfig._(); // Private constructor to prevent instantiation

  // Base API Configuration
  static const String supabaseUrl = ''; // Paste your Supabase Project URL
  static const String supabaseAnonKey = ''; // Paste your Supabase Anon Key

  // Mapbox Integration
  // TODO: Paste your real Mapbox Public Access Token here for production.
  static const String mapboxToken = String.fromEnvironment('MAPBOX_TOKEN', defaultValue: 'pk.eyJ1Ijoic2lkZGhhbntiYW5zb2QiLCJhIjoiY210bG4yaXZhMDE2cDJ4cjFlNHRuMW94NCJ9.OJj5qf2KoIzCDAl9dz6kaw');

  // N8N RAG Webhook Endpoint
  static const String n8nRagWebhookUrl = ''; // Paste your N8N Webhook URL

  // Additional Services (Placeholders)
  static const String googleTranslateApiKey = ''; 

  static const bool isDevelopment = !kReleaseMode;
}

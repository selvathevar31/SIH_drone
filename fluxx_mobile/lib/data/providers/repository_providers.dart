import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fluxx_mobile/core/contracts/i_aqi_repository.dart';
import 'package:fluxx_mobile/core/contracts/i_chat_repository.dart';
import 'package:fluxx_mobile/core/contracts/i_localization_repository.dart';
import 'package:fluxx_mobile/core/models/aqi_data.dart';
import 'package:fluxx_mobile/core/models/hourly_forecast.dart';
import 'package:fluxx_mobile/core/models/spatial_telemetry.dart';
import 'package:fluxx_mobile/core/models/chat_response.dart';
import 'package:fluxx_mobile/data/repositories/mock_aqi_repository.dart';
import 'package:fluxx_mobile/data/repositories/api_aqi_repository.dart';
import 'package:fluxx_mobile/data/repositories/live_chat_repository.dart';
import 'package:fluxx_mobile/data/repositories/mock_localization_repository.dart';
import 'package:fluxx_mobile/services/socket_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Repository Singleton Providers  (keepAlive equivalent: use .autoDispose
// on the data providers below if you want scoped lifecycle instead)
//
// NOTE: These two providers are the ONLY lines that change when wiring to
// real Supabase / n8n implementations. No consumer widget is touched.
// ─────────────────────────────────────────────────────────────────────────────

/// Provides the singleton [IAqiRepository] implementation.
/// Swap [MockAqiRepository] for [SupabaseAqiRepository] here when ready.
final aqiRepositoryProvider = Provider<IAqiRepository>(
  (_) => const ApiAqiRepository(),
);

/// Provides the singleton [IChatRepository] implementation.
/// Swap [MockChatRepository] for [N8nChatRepository] here when ready.
final chatRepositoryProvider = Provider<IChatRepository>(
  (_) => const LiveChatRepository(),
);

// ─────────────────────────────────────────────────────────────────────────────
// Data Providers
// Each provider delegates entirely to the repository interface, keeping
// all business logic and network concerns out of the UI layer.
// ─────────────────────────────────────────────────────────────────────────────

/// Fetches the current AQI snapshot.
/// Consumed via: ref.watch(currentAqiProvider)
final currentAqiProvider = FutureProvider<AqiData>((ref) {
  return ref.watch(aqiRepositoryProvider).getCurrentAqi();
});

/// Fetches the 24-hour hourly forecast strip.
/// Consumed via: ref.watch(hourlyForecastProvider)
final hourlyForecastProvider = FutureProvider<List<HourlyForecast>>((ref) {
  return ref.watch(aqiRepositoryProvider).getHourlyForecast();
});

/// Fetches geo-referenced heatmap telemetry for the Mapbox layer.
/// Consumed via: ref.watch(spatialTelemetryProvider)
final spatialTelemetryProvider = FutureProvider<SpatialTelemetry>((ref) {
  return ref.watch(aqiRepositoryProvider).getSpatialTelemetry();
});

/// WebSockets real-time telemetry stream
final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  service.init();
  ref.onDispose(() => service.dispose());
  return service;
});

final liveTelemetryStreamProvider = StreamProvider<SpatialTelemetry>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  return socketService.telemetryStream;
});

final socketConnectionStreamProvider = StreamProvider<bool>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  return socketService.connectionStream;
});

// ─────────────────────────────────────────────────────────────────────────────
// Chat / RAG Provider — parameterised via ProviderFamily
//
// Usage in a widget:
//   ref.watch(chatQueryProvider('What is the current AQI?'))
// ─────────────────────────────────────────────────────────────────────────────

/// Executes a single RAG query against [IChatRepository].
/// Each unique [prompt] string gets its own cached [AsyncValue<ChatResponse>].
final chatQueryProvider =
    FutureProvider.family<ChatResponse, String>((ref, prompt) {
  return ref.watch(chatRepositoryProvider).queryRag(prompt);
});

// ─────────────────────────────────────────────────────────────────────────────
// Localization Providers
// ─────────────────────────────────────────────────────────────────────────────

final localizationRepositoryProvider = Provider<ILocalizationRepository>(
  (_) => const MockLocalizationRepository(),
);

/// StateProvider to hold the currently selected language code.
final currentLanguageProvider = StateProvider<String>((ref) => 'en');

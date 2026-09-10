import 'dart:async';
import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../core/models/spatial_telemetry.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  
  IO.Socket? _socket;
  final _telemetryController = StreamController<SpatialTelemetry>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  SocketService._internal();

  void init() {
    const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://192.168.0.105:8000');
    
    _socket = IO.io(apiUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket']) // Force WebSocket transport
        .disableAutoConnect() // We manually connect
        .build()
    );

    _socket?.onConnect((_) {
      print('[Socket] Connected to $apiUrl');
      _connectionStateController.add(true);
    });

    _socket?.onDisconnect((_) {
      print('[Socket] Disconnected from $apiUrl');
      _connectionStateController.add(false);
    });

    _socket?.on('telemetry_update', (data) {
      try {
        final geoJsonString = data is String ? data : jsonEncode(data);
        final telemetry = SpatialTelemetry(
          points: const [], // GeoJSON points handled directly in Mapbox source
          geoJsonUrl: '',
          geoJson: geoJsonString
        );
        _telemetryController.add(telemetry);
      } catch (e) {
        print('[Socket] Error parsing telemetry_update: $e');
      }
    });

    _socket?.connect();
  }

  Stream<SpatialTelemetry> get telemetryStream => _telemetryController.stream;
  Stream<bool> get connectionStream => _connectionStateController.stream;

  void dispose() {
    _socket?.dispose();
    _telemetryController.close();
    _connectionStateController.close();
  }
}

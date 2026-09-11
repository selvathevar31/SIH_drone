import 'dart:async';
import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../core/models/spatial_telemetry.dart';

enum SocketConnectionState { connecting, connected, disconnected }

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  
  IO.Socket? _socket;
  final _telemetryController = StreamController<SpatialTelemetry>.broadcast();
  final _connectionStateController = StreamController<SocketConnectionState>.broadcast();

  SocketService._internal();

  void init() {
    const String defaultUrl = 'http://10.0.2.2:8000'; // Default emulator URL
    const String apiUrl = String.fromEnvironment('API_URL', defaultValue: defaultUrl);
    
    _connectionStateController.add(SocketConnectionState.connecting);
    
    _socket = IO.io(apiUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket']) // Force WebSocket transport
        .disableAutoConnect() // We manually connect
        .build()
    );

    _socket?.onConnect((_) {
      print('[Socket] Connected to $apiUrl');
      _connectionStateController.add(SocketConnectionState.connected);
    });

    _socket?.onDisconnect((_) {
      print('[Socket] Disconnected from $apiUrl');
      _connectionStateController.add(SocketConnectionState.disconnected);
    });

    _socket?.onConnectError((err) {
      print('[Socket] Connect error to $apiUrl: $err');
      _connectionStateController.add(SocketConnectionState.disconnected);
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
  Stream<SocketConnectionState> get connectionStream => _connectionStateController.stream;

  void dispose() {
    _socket?.dispose();
    _telemetryController.close();
    _connectionStateController.close();
  }
}

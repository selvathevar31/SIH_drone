import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Request permissions and get current position.
  /// Throws exceptions if permissions are denied or services disabled.
  static Future<Position> getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled.');
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied, we cannot request permissions.');
    }

    return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium);
  }

  /// Get the city/locality name from coordinates (disabled due to plugin crash)
  static Future<String?> getLocationName(double lat, double lon) async {
    // Geocoding plugin removed due to Android API 33 compatibility crash.
    // The backend should return dataLocation.name. We'll use formatting for userLocation.
    return '${lat.toStringAsFixed(4)}, ${lon.toStringAsFixed(4)}';
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

class UserLocation {
  final String city;
  final String state;
  UserLocation(this.city, this.state);
}

final locationProvider = FutureProvider<UserLocation>((ref) async {
  bool serviceEnabled;
  LocationPermission permission;

  serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    return UserLocation('Location disabled', 'Unknown');
  }

  permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      return UserLocation('Permission denied', 'Unknown');
    }
  }
  
  if (permission == LocationPermission.deniedForever) {
    return UserLocation('Permission permanently denied', 'Unknown');
  }

  Position? position;
  try {
    position = await Geolocator.getLastKnownPosition();
    position ??= await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  } catch (e) {
    return UserLocation('Location unavailable', 'Unknown');
  }

  return UserLocation(
    '${position.latitude.toStringAsFixed(4)}',
    '${position.longitude.toStringAsFixed(4)}',
  );

  return UserLocation('Wahal', 'Maharashtra'); // Default fallback
});

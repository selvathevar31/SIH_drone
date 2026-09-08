import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

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

  try {
    // Reverse geocode to extract locality (City) and administrativeArea (State)
    final placemarks = await Geocoding().placemarkFromCoordinates(
      position.latitude,
      position.longitude,
    ).timeout(const Duration(seconds: 10));

    if (placemarks.isNotEmpty) {
      final place = placemarks.first;
      return UserLocation(
        place.locality ?? 'Unknown City',
        place.administrativeArea ?? 'Unknown State',
      );
    }
  } catch (e) {
    // Fallback if geocoding fails (e.g. timeout or no connection)
    return UserLocation(
      '${position.latitude.toStringAsFixed(2)}, ${position.longitude.toStringAsFixed(2)}',
      'Coordinates',
    );
  }

  return UserLocation('Wahal', 'Maharashtra'); // Default fallback
});

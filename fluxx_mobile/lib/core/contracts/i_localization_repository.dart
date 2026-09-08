import 'dart:async';
import 'dart:ui';

abstract class ILocalizationRepository {
  /// Updates the application's locale preferences.
  /// Maps to: Local SharedPreferences & backend user profile sync
  Future<void> changeLocale(Locale locale);
}

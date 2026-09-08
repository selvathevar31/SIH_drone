import 'dart:ui';
import 'package:fluxx_mobile/core/contracts/i_localization_repository.dart';

class MockLocalizationRepository implements ILocalizationRepository {
  const MockLocalizationRepository();

  @override
  Future<void> changeLocale(Locale locale) async {
    // Mock implementation: simulate network delay
    await Future.delayed(const Duration(milliseconds: 500));
  }
}

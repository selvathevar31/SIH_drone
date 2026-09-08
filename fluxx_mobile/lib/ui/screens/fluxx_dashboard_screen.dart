import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/models/aqi_data.dart';
import '../../core/models/hourly_forecast.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';
import '../../data/providers/location_provider.dart';
import '../widgets/aqi_hero_header.dart';
import '../widgets/hourly_forecast_strip.dart';
import '../widgets/heatmap_card.dart';
import '../widgets/metrics_grid.dart';
import '../widgets/floating_chat_button.dart';

enum LocationStatus { enabled, disabled }

class FluxxDashboardScreen extends ConsumerStatefulWidget {
  const FluxxDashboardScreen({super.key});

  @override
  ConsumerState<FluxxDashboardScreen> createState() => _FluxxDashboardScreenState();
}

class _FluxxDashboardScreenState extends ConsumerState<FluxxDashboardScreen> {
  WeatherCondition _currentCondition = WeatherCondition.sunny;

  void _cycleWeatherCondition() {
    setState(() {
      final nextIndex = (_currentCondition.index + 1) % WeatherCondition.values.length;
      _currentCondition = WeatherCondition.values[nextIndex];
    });
  }

  void _showLanguageSelector(BuildContext context, String detectedState) {
    String regionalLanguage = '';
    String regionalCode = '';

    switch (detectedState.toLowerCase()) {
      case 'maharashtra':
        regionalLanguage = 'मराठी (Marathi)';
        regionalCode = 'mr';
        break;
      case 'west bengal':
        regionalLanguage = 'বাংলা (Bengali)';
        regionalCode = 'bn';
        break;
      case 'karnataka':
        regionalLanguage = 'ಕನ್ನಡ (Kannada)';
        regionalCode = 'kn';
        break;
      case 'tamil nadu':
        regionalLanguage = 'தமிழ் (Tamil)';
        regionalCode = 'ta';
        break;
      case 'gujarat':
        regionalLanguage = 'ગુજરાતી (Gujarati)';
        regionalCode = 'gu';
        break;
      case 'telangana':
      case 'andhra pradesh':
        regionalLanguage = 'తెలుగు (Telugu)';
        regionalCode = 'te';
        break;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          margin: const EdgeInsets.all(16),
          child: AppleGlassCard(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('select_language'.tr(), style: FluxxTypography.sectionHeader),
                const SizedBox(height: 16),
                const _LanguageTile(title: 'English', code: 'en'),
                const _LanguageTile(title: 'हिंदी (Hindi)', code: 'hi'),
                if (regionalLanguage.isNotEmpty)
                  _LanguageTile(title: regionalLanguage, code: regionalCode),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final locationAsync = ref.watch(locationProvider);
    final userLocation = locationAsync.valueOrNull;
    final isLocationDisabled = userLocation == null ||
        userLocation.city == 'Location disabled' ||
        userLocation.city.toLowerCase().contains('denied') ||
        userLocation.city.toLowerCase().contains('unavailable');
    final locationStatus = isLocationDisabled ? LocationStatus.disabled : LocationStatus.enabled;

    final mockAqiData = const AqiData(
      aqi: 65,
      status: 'Moderate',
      locationName: 'Cupertino',
      temperature: 66,
      condition: 'Sunny',
      pm25: 12.5,
      pm10: 25.0,
      co2: 412.0,
      humidity: 61.0,
    );

    final temperature = ((mockAqiData.temperature - 32) * 5 / 9).round();
    final condition = mockAqiData.condition.tr();

    final mockForecast = List.generate(
      12,
      (index) => HourlyForecast(
        time: DateTime.now().add(Duration(hours: index)),
        temperature: 66 + (index % 5).toDouble(),
        aqi: 65 + index,
        conditionIcon: 'sun',
      ),
    );

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onTap: _cycleWeatherCondition,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          children: [
            DynamicAtmosphereBackground(
              condition: _currentCondition,
            ),
            CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                SliverToBoxAdapter(
                  child: AqiHeroHeader(data: mockAqiData),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      HourlyForecastStrip(forecast: mockForecast),
                      const SizedBox(height: 12),
                      const HeatmapCard(),
                      const SizedBox(height: 12),
                      const MetricsGrid(),
                      const SizedBox(height: 100), // Bottom padding for floating button
                    ]),
                  ),
                ),
              ],
            ),
            // Header Bar: Location Status and Globe Icon
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (locationStatus == LocationStatus.disabled)
                          const Text(
                            'Location disabled',
                            style: TextStyle(color: Colors.redAccent, fontSize: 12),
                          )
                        else if (userLocation != null)
                          Text(
                            '${userLocation.city}, ${userLocation.state}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        Text(
                          '$temperature°C | $condition',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.language, color: Colors.white, size: 28),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        final currentState = ref.read(locationProvider).valueOrNull?.state ?? 'Unknown';
                        _showLanguageSelector(context, currentState);
                      },
                    ),
                  ],
                ),
              ),
            ),
            // Floating Circular Glass AI Trigger
            SafeArea(
              child: Align(
                alignment: Alignment.bottomRight,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24, right: 20),
                  child: const FloatingChatButton(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageTile extends ConsumerWidget {
  final String title;
  final String code;

  const _LanguageTile({required this.title, required this.code});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLang = ref.watch(currentLanguageProvider);
    final isSelected = currentLang == code;

    return ListTile(
      title: Text(
        title,
        style: FluxxTypography.secondaryMetric.copyWith(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      trailing: isSelected ? const Icon(Icons.check, color: Colors.white) : null,
      onTap: () {
        ref.read(currentLanguageProvider.notifier).state = code;
        ref.read(localizationRepositoryProvider).changeLocale(Locale(code));
        context.setLocale(Locale(code)); // Update EasyLocalization engine natively
        Navigator.pop(context);
      },
    );
  }
}

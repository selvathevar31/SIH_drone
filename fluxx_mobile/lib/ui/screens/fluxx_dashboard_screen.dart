import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/models/aqi_data.dart';
import '../../core/models/hourly_forecast.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';
import '../widgets/aqi_hero_header.dart';
import '../widgets/hourly_forecast_strip.dart';
import '../widgets/heatmap_card.dart';
import '../widgets/metrics_grid.dart';
import '../widgets/floating_chat_button.dart';
import '../widgets/learn_aqi_section.dart';
import 'package:geolocator/geolocator.dart';

class FluxxDashboardScreen extends ConsumerStatefulWidget {
  const FluxxDashboardScreen({super.key});

  @override
  ConsumerState<FluxxDashboardScreen> createState() => _FluxxDashboardScreenState();
}

class _FluxxDashboardScreenState extends ConsumerState<FluxxDashboardScreen> {
  bool _isLoadingWeather = true;
  List<HourlyForecast> _forecast = [];
  String _currentConditionStr = 'Sunny';
  int _isDay = 1;

  @override
  void initState() {
    super.initState();
    _fetchWeatherData();
    _fetchLatestTelemetry();
  }

  String _mapWmoToConditionStr(int wmoCode) {
    if (wmoCode <= 1) return 'Sunny';
    if (wmoCode <= 3) return 'Cloudy';
    if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) return 'Rainy';
    if ((wmoCode >= 71 && wmoCode <= 77) || (wmoCode >= 85 && wmoCode <= 86)) return 'Snow';
    if (wmoCode >= 95) return 'Thunderstorm';
    return 'Cloudy';
  }

  String _mapWmoToIcon(int wmoCode) {
    if (wmoCode <= 1) return 'sun';
    if (wmoCode <= 3) return 'cloud';
    if ((wmoCode >= 51 && wmoCode <= 67) || (wmoCode >= 80 && wmoCode <= 82)) return 'rain';
    if ((wmoCode >= 71 && wmoCode <= 77) || (wmoCode >= 85 && wmoCode <= 86)) return 'snow';
    if (wmoCode >= 95) return 'storm';
    return 'cloud';
  }

  Future<void> _fetchWeatherData() async {
    try {
      double lat = 19.0330;
      double lon = 73.0297;

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (serviceEnabled) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
          try {
            Position position = await Geolocator.getCurrentPosition(
              desiredAccuracy: LocationAccuracy.low,
              timeLimit: const Duration(seconds: 5),
            );
            lat = position.latitude;
            lon = position.longitude;
          } catch (_) {
            // Timeout or error, fallback to defaults
          }
        }
      }

      final url = Uri.parse(
          'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&hourly=temperature_2m,weather_code&current_weather=true&temperature_unit=fahrenheit');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final currentWmo = data['current_weather']['weathercode'] as int;
        final currentIsDay = data['current_weather']['is_day'] as int;
        final conditionStr = _mapWmoToConditionStr(currentWmo);

        final hourlyTimes = data['hourly']['time'] as List;
        final hourlyTemps = data['hourly']['temperature_2m'] as List;
        final hourlyCodes = data['hourly']['weather_code'] as List;

        final now = DateTime.now();
        List<HourlyForecast> fetchedForecast = [];
        for (int i = 0; i < hourlyTimes.length; i++) {
          final time = DateTime.parse(hourlyTimes[i] as String);
          if (time.isAfter(now.subtract(const Duration(hours: 1))) && fetchedForecast.length < 5) {
            fetchedForecast.add(HourlyForecast(
              time: time,
              temperature: (hourlyTemps[i] as num).toDouble(),
              aqi: 65, // Mock AQI placeholder
              conditionIcon: _mapWmoToIcon(hourlyCodes[i] as int),
            ));
          }
        }
        
        if (mounted) {
          setState(() {
            _currentConditionStr = conditionStr;
            _isDay = currentIsDay;
            _forecast = fetchedForecast;
            _isLoadingWeather = false;
          });
        }
      } else {
        _setMockWeather();
      }
    } catch (e) {
      _setMockWeather();
    }
  }

  void _setMockWeather() {
    if (!mounted) return;
    setState(() {
      _currentConditionStr = 'Sunny';
      _isDay = 1;
      _forecast = List.generate(
        5,
        (index) => HourlyForecast(
          time: DateTime.now().add(Duration(hours: index)),
          temperature: 30 + (index % 5).toDouble(),
          aqi: 65 + index,
          conditionIcon: 'sun',
        ),
      );
      _isLoadingWeather = false;
    });
  }

  Future<void> _fetchLatestTelemetry() async {
    try {
      const String defaultUrl = 'http://10.0.2.2:8000';
      const String apiUrl = String.fromEnvironment('API_URL', defaultValue: defaultUrl);
      final url = Uri.parse('$apiUrl/api/telemetry/latest');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data != null && data['features'] != null && (data['features'] as List).isNotEmpty) {
           // Cold-start telemetry fetched; Mapbox source update is handled via provider
        }
      }
    } catch (_) {
      // Cold-start fetch failed silently; real-time socket will hydrate on connect
    }
  }

  WeatherCondition _getWeatherCondition(String condition) {
    if (_isDay == 0) return WeatherCondition.night;

    final lower = condition.toLowerCase();
    if (lower.contains('rain') || lower.contains('drizzle') || lower.contains('storm') || lower.contains('thunder')) {
      return WeatherCondition.lightRain;
    }
    if (lower.contains('clear') || lower.contains('sun') || lower.contains('cloud')) {
      return WeatherCondition.sunny;
    }
    return WeatherCondition.sunny;
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
    final aqiAsyncValue = ref.watch(currentAqiProvider);
    final aqiData = aqiAsyncValue.valueOrNull;

    final displayAqiData = aqiData != null 
        ? aqiData.copyWith(condition: _currentConditionStr)
        : const AqiData(
            aqi: 0,
            status: 'Loading',
            locationName: 'Loading',
            temperature: 30.0,
            condition: 'Sunny',
            pm25: 0.0,
            pm10: 0.0,
            co2: 0.0,
            humidity: 50.0,
          );

    final temperature = (displayAqiData.temperature).round();
    final condition = displayAqiData.condition.tr();

    final dynamicCondition = _getWeatherCondition(_currentConditionStr);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          DynamicAtmosphereBackground(
            condition: dynamicCondition,
          ),
            CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                SliverToBoxAdapter(
                  child: AqiHeroHeader(data: displayAqiData),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      if (_isLoadingWeather)
                        const SizedBox(
                          height: 140,
                          child: Center(child: CircularProgressIndicator(color: Colors.white)),
                        )
                      else
                        HourlyForecastStrip(forecast: _forecast),
                      const SizedBox(height: 12),
                      const HeatmapCard(),
                      const SizedBox(height: 12),
                      const LearnAQISection(),
                      const SizedBox(height: 16.0),
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
                        const Text(
                          'Delhi NCR',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
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
                        final currentState = 'Delhi NCR';
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

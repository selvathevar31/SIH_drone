import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/apple_theme.dart';
import '../../../../data/providers/repository_providers.dart';

/// Hourly forecast strip displaying a 24-hour horizontal list of predictions.
/// Housed within an [AppleGlassCard] and wired to [hourlyForecastProvider].
class HourlyForecastStrip extends ConsumerWidget {
  const HourlyForecastStrip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final forecastState = ref.watch(hourlyForecastProvider);

    return AppleGlassCard(
      height: 160,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.access_time, 
                color: Colors.white.withValues(alpha: 0.6), 
                size: 14
              ),
              const SizedBox(width: 4),
              Text(
                'HOURLY FORECAST', 
                style: FluxxTypography.sectionHeader
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: forecastState.when(
              data: (forecast) {
                return ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: forecast.length,
                  itemBuilder: (context, index) {
                    final item = forecast[index];
                    final isNow = index == 0;
                    
                    return Padding(
                      padding: const EdgeInsets.only(right: 28.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isNow ? 'NOW' : _formatTime(item.time),
                            style: FluxxTypography.secondaryMetric.copyWith(
                              fontWeight: isNow ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                          Icon(
                            _getConditionIcon(item.conditionIcon),
                            color: Colors.white,
                            size: 28,
                          ),
                          Text(
                            '${item.aqi} AQI',
                            style: FluxxTypography.secondaryMetric.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
              error: (err, stack) => Center(
                child: Text(
                  'Failed to load forecast.',
                  style: FluxxTypography.cardBody,
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  /// Formats a [DateTime] into a short AM/PM string (e.g. "1 PM").
  String _formatTime(DateTime time) {
    final hour = time.hour;
    final period = hour < 12 ? 'AM' : 'PM';
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return '$displayHour $period';
  }

  /// Resolves the condition string to an appropriate Material icon.
  IconData _getConditionIcon(String condition) {
    final lower = condition.toLowerCase();
    if (lower.contains('sun') || lower.contains('clear')) return Icons.wb_sunny;
    if (lower.contains('cloud')) return Icons.cloud;
    if (lower.contains('smog') || lower.contains('smoke')) return Icons.blur_on;
    if (lower.contains('rain')) return Icons.water_drop;
    return Icons.wb_cloudy;
  }
}

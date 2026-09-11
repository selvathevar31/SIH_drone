import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/models/hourly_forecast.dart';
import '../../core/theme/apple_theme.dart';

class HourlyForecastStrip extends StatelessWidget {
  final List<HourlyForecast> forecast;

  const HourlyForecastStrip({super.key, required this.forecast});

  @override
  Widget build(BuildContext context) {
    return AppleGlassCard(
      height: 140,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.access_time, color: Colors.white.withValues(alpha: 0.6), size: 14),
              const SizedBox(width: 4),
              Text('hourly_forecast'.tr(), style: FluxxTypography.sectionHeader),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: forecast.length,
              separatorBuilder: (context, index) => const SizedBox(width: 24),
              itemBuilder: (context, index) {
                final item = forecast[index];
                final tempCelsius = ((item.temperature - 32) * 5 / 9).round();
                
                return Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${item.time.hour}:00',
                      style: FluxxTypography.secondaryMetric,
                    ),
                    Icon(
                      _getIcon(item.conditionIcon),
                      color: _getIconColor(item.conditionIcon),
                      size: 24,
                    ),
                    Text(
                      '$tempCelsius°C',
                      style: FluxxTypography.secondaryMetric.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                );
              },
            ),
          )
        ],
      ),
    );
  }

  IconData _getIcon(String condition) {
    if (condition.toLowerCase().contains('sun')) return Icons.wb_sunny;
    if (condition.toLowerCase().contains('rain') || condition.toLowerCase().contains('water') || condition.toLowerCase().contains('storm')) return Icons.water_drop;
    if (condition.toLowerCase().contains('cloud')) return Icons.cloud;
    return Icons.wb_cloudy;
  }

  Color _getIconColor(String condition) {
    if (condition.toLowerCase().contains('sun')) return Colors.yellow;
    if (condition.toLowerCase().contains('rain') || condition.toLowerCase().contains('water') || condition.toLowerCase().contains('storm')) return Colors.blue;
    return Colors.white70;
  }
}

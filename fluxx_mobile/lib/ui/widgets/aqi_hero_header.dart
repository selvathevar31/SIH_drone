import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/theme/apple_theme.dart';
import '../../core/models/aqi_data.dart';

class AqiHeroHeader extends ConsumerWidget {
  final AqiData data;

  const AqiHeroHeader({super.key, required this.data});

  String _getAqiStatusKey(int aqi) {
    if (aqi <= 50) return 'aqi_status.good';
    if (aqi <= 100) return 'aqi_status.moderate';
    if (aqi <= 150) return 'aqi_status.poor';
    if (aqi <= 200) return 'aqi_status.severe';
    return 'aqi_status.toxic';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(left: 24.0, right: 24.0, top: 68.0, bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Primary Metric: AQI Score
          Text(
            '${data.aqi}',
            style: FluxxTypography.heroDisplay,
          ),
          // Status Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _getAqiStatusKey(data.aqi).tr(),
              style: FluxxTypography.secondaryMetric,
            ),
          )
        ],
      ),
    );
  }
}

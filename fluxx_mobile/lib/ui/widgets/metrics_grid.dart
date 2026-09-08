
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/theme/apple_theme.dart';
import '../../data/providers/repository_providers.dart';

class MetricsGrid extends ConsumerWidget {
  const MetricsGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final aqiAsync = ref.watch(currentAqiProvider);

    return aqiAsync.when(
      data: (data) {
        return GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.0,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _MetricCard(title: 'metrics_labels.pm25'.tr(), value: '${data.pm25}', unit: 'µg/m³', icon: Icons.scatter_plot),
            _MetricCard(title: 'metrics_labels.pm10'.tr(), value: '${data.pm10}', unit: 'µg/m³', icon: Icons.grain),
            _MetricCard(title: 'metrics_labels.co2'.tr(), value: '${data.co2}', unit: 'ppm', icon: Icons.cloud_queue),
            _MetricCard(title: 'metrics_labels.humidity'.tr(), value: '${data.humidity}%', unit: '', icon: Icons.water_drop),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
      error: (err, stack) => Center(child: Text('error_connecting'.tr(), style: FluxxTypography.subtitle)),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String unit;
  final IconData icon;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.unit,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return AppleGlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white.withValues(alpha: 0.6), size: 14),
              const SizedBox(width: 4),
              Text(title, style: FluxxTypography.sectionHeader),
            ],
          ),
          const Spacer(),
          Text(value, style: FluxxTypography.title),
          Text(unit, style: FluxxTypography.secondaryMetric.copyWith(color: Colors.white.withValues(alpha: 0.7))),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:fl_chart/fl_chart.dart';
import 'dart:ui' as ui;
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
    return GestureDetector(
      onTap: () {
        showGeneralDialog(
          context: context,
          barrierDismissible: true,
          barrierLabel: 'Dismiss',
          barrierColor: Colors.black.withOpacity(0.35),
          transitionDuration: const Duration(milliseconds: 250),
          pageBuilder: (context, anim1, anim2) => const SizedBox.shrink(),
          transitionBuilder: (context, anim1, anim2, child) {
            return FadeTransition(
              opacity: anim1,
              child: ScaleTransition(
                scale: Tween<double>(begin: 0.85, end: 1.0).animate(
                  CurvedAnimation(parent: anim1, curve: Curves.easeOutBack),
                ),
                child: _MetricDetailModal(
                  title: title,
                  value: value,
                  unit: unit,
                  icon: icon,
                ),
              ),
            );
          },
        );
      },
      child: AppleGlassCard(
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
      ),
    );
  }
}

class _MetricDetailModal extends StatelessWidget {
  final String title;
  final String value;
  final String unit;
  final IconData icon;

  const _MetricDetailModal({
    required this.title,
    required this.value,
    required this.unit,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final List<FlSpot> spots = List.generate(24, (index) {
      double baseVal = double.tryParse(value) ?? 50.0;
      return FlSpot(index.toDouble(), baseVal + (index % 5 - 2) * 2.0);
    });

    final screenWidth = MediaQuery.of(context).size.width;

    return Stack(
      children: [
        Positioned.fill(
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: const SizedBox.shrink(),
          ),
        ),
        Center(
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: screenWidth * 0.88,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.4),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(icon, color: Colors.white, size: 24),
                          const SizedBox(width: 8),
                          Text(title, style: FluxxTypography.title),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '$value $unit',
                    style: FluxxTypography.title.copyWith(fontSize: 32, color: Colors.tealAccent),
                  ),
                  Text(
                    'Safe limit: < 50 $unit',
                    style: FluxxTypography.subtitle.copyWith(fontSize: 12, color: Colors.white70),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    height: 200,
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: 20,
                          getDrawingHorizontalLine: (value) => FlLine(
                            color: Colors.white.withOpacity(0.06),
                            strokeWidth: 1,
                          ),
                        ),
                        titlesData: FlTitlesData(
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 22,
                              interval: 4,
                              getTitlesWidget: (val, meta) {
                                if (val % 4 == 0) {
                                  return Text(
                                    '${val.toInt().toString().padLeft(2, '0')}:00', 
                                    style: const TextStyle(color: Colors.white54, fontSize: 10)
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        lineTouchData: LineTouchData(
                          touchTooltipData: LineTouchTooltipData(
                            getTooltipColor: (spot) => Colors.black87,
                            getTooltipItems: (touchedSpots) {
                              return touchedSpots.map((spot) {
                                return LineTooltipItem(
                                  '${spot.y.toStringAsFixed(1)} $unit',
                                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                );
                              }).toList();
                            },
                          ),
                          getTouchedSpotIndicator: (LineChartBarData barData, List<int> spotIndexes) {
                            return spotIndexes.map((index) {
                              return TouchedSpotIndicatorData(
                                const FlLine(color: Colors.transparent),
                                FlDotData(
                                  show: true,
                                  getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
                                    radius: 6,
                                    color: Colors.tealAccent,
                                    strokeWidth: 2,
                                    strokeColor: Colors.white,
                                  ),
                                ),
                              );
                            }).toList();
                          },
                        ),
                        lineBarsData: [
                          LineChartBarData(
                            spots: spots,
                            isCurved: true,
                            curveSmoothness: 0.35,
                            color: Colors.tealAccent,
                            barWidth: 3.0,
                            isStrokeCapRound: true,
                            dotData: const FlDotData(show: false),
                            belowBarData: BarAreaData(
                              show: true,
                              gradient: LinearGradient(
                                colors: [
                                  Colors.tealAccent.withOpacity(0.35),
                                  Colors.tealAccent.withOpacity(0.0),
                                ],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

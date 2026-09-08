import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/apple_theme.dart';
import '../../../../data/providers/repository_providers.dart';

/// 2×2 grid of environmental metric cards, each containing a mini sparkline.
/// Wired directly to [currentAqiProvider].
class MetricsGrid extends ConsumerWidget {
  const MetricsGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final aqiState = ref.watch(currentAqiProvider);

    return aqiState.when(
      data: (data) => GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.05,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _MetricCard(
            label: 'PM2.5',
            value: data.pm25,
            unit: 'µg/m³',
            // Simulated recent trend — in production this feeds from
            // a TimeSeries provider. Seed anchors to live value.
            history: _syntheticHistory(data.pm25, seed: 1),
          ),
          _MetricCard(
            label: 'PM10',
            value: data.pm10,
            unit: 'µg/m³',
            history: _syntheticHistory(data.pm10, seed: 2),
          ),
          _MetricCard(
            label: 'CO2',
            value: data.co2,
            unit: 'ppm',
            history: _syntheticHistory(data.co2, seed: 3),
          ),
          _MetricCard(
            label: 'HUMIDITY',
            value: data.humidity,
            unit: '%',
            history: _syntheticHistory(data.humidity, seed: 4),
          ),
        ],
      ),
      loading: () => const SizedBox(
        height: 260,
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      ),
      error: (err, _) => SizedBox(
        height: 260,
        child: Center(
          child: Text(
            'Metrics unavailable.',
            style: FluxxTypography.cardBody,
          ),
        ),
      ),
    );
  }

  /// Generates a synthetic 12-point trend history anchored to [value].
  /// Replaced by live time-series data when the real data layer is wired.
  static List<double> _syntheticHistory(double value, {required int seed}) {
    // Deterministic pseudo-random deltas so the chart looks realistic
    // without any dart:math Random state leaking between rebuilds.
    const deltas = [
      [0.0, -2.1, 1.4, -0.8, 2.3, -1.1, 0.6, -1.7, 2.0, -0.5, 1.2, 0.0],
      [0.0, 1.8, -0.9, 2.2, -1.5, 0.7, -2.0, 1.1, 0.4, -1.9, 0.8, 0.0],
      [0.0, -1.3, 2.0, -0.6, 1.5, -2.2, 0.9, 1.4, -1.0, 0.5, -1.7, 0.0],
      [0.0, 0.7, -1.4, 1.9, -0.8, 2.1, -1.6, 0.3, -1.2, 1.8, -0.4, 0.0],
    ];
    final row = deltas[(seed - 1) % deltas.length];
    return row.map((d) => (value + d).clamp(0.0, double.infinity)).toList();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private card widget
// ─────────────────────────────────────────────────────────────────────────────

class _MetricCard extends StatelessWidget {
  final String label;
  final double value;
  final String unit;
  final List<double> history;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.unit,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    return AppleGlassCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Label ────────────────────────────────────────────────
          Text(
            label,
            style: FluxxTypography.sectionHeader, // 12pt SemiBold CAPS 0.6α
          ),
          const SizedBox(height: 8),
          // ── Primary value ─────────────────────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                _formatValue(value),
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700, // Bold 28pt
                  color: Colors.white,
                  height: 1.0,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                unit,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w400,
                  color: Colors.white.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
          const Spacer(),
          // ── Sparkline ─────────────────────────────────────────────
          SizedBox(
            height: 42,
            child: LineChart(
              _buildSparklineData(),
              duration: const Duration(milliseconds: 600),
              curve: const Cubic(0.25, 0.1, 0.25, 1.0),
            ),
          ),
        ],
      ),
    );
  }

  /// Formats the value: integers for whole numbers, 1dp for decimals.
  String _formatValue(double v) =>
      v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(1);

  LineChartData _buildSparklineData() {
    final spots = history
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value))
        .toList();

    // Derive Y bounds with a small margin so the line never clips
    final minY = history.reduce((a, b) => a < b ? a : b);
    final maxY = history.reduce((a, b) => a > b ? a : b);
    final range = (maxY - minY).clamp(1.0, double.infinity);

    return LineChartData(
      // ── No grid ──────────────────────────────────────────────────
      gridData: const FlGridData(show: false),
      // ── No axis labels / titles ───────────────────────────────────
      titlesData: const FlTitlesData(show: false),
      // ── No border ────────────────────────────────────────────────
      borderData: FlBorderData(show: false),
      // ── Y bounds ─────────────────────────────────────────────────
      minY: minY - range * 0.15,
      maxY: maxY + range * 0.15,
      // ── Chart touch / tooltip — completely disabled ───────────────
      lineTouchData: const LineTouchData(enabled: false),
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          // Smooth spline, Apple-spec smoothness
          isCurved: true,
          curveSmoothness: 0.35,
          // Solid white line 2.5px
          color: Colors.white,
          barWidth: 2.5,
          isStrokeCapRound: true,
          // No interaction dots
          dotData: const FlDotData(show: false),
          // Fill below: vertical gradient white → transparent
          belowBarData: BarAreaData(
            show: true,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.white.withValues(alpha: 0.25),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }
}

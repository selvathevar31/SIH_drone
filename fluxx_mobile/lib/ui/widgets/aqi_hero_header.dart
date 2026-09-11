import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'dart:math' as math;
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

  Color _getAqiColor(int aqi) {
    if (aqi <= 50) return Colors.green;
    if (aqi <= 100) return Colors.lightGreen;
    if (aqi <= 200) return Colors.yellow;
    if (aqi <= 300) return Colors.orange;
    if (aqi <= 400) return Colors.red;
    return const Color(0xFF800000); // Maroon for Severe/Toxic
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(left: 24.0, right: 24.0, top: 68.0, bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Primary Metric: AQI Score with Arc
          SizedBox(
            width: 200,
            height: 120,
            child: CustomPaint(
              painter: AQIArcPainter(
                aqi: data.aqi,
                progressColor: _getAqiColor(data.aqi),
              ),
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 20.0),
                  child: Text(
                    '${data.aqi}',
                    style: FluxxTypography.heroDisplay,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Status text (unboxed)
          Text(
            _getAqiStatusKey(data.aqi).tr(),
            style: FluxxTypography.secondaryMetric,
          ),
        ],
      ),
    );
  }
}

class AQIArcPainter extends CustomPainter {
  final int aqi;
  final Color progressColor;

  AQIArcPainter({required this.aqi, required this.progressColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2;

    final Paint backgroundPaint = Paint()
      ..color = Colors.white.withOpacity(0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8.0
      ..strokeCap = StrokeCap.round;

    final Paint progressPaint = Paint()
      ..color = progressColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8.0
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);

    // Draw background track arc (180 degrees)
    canvas.drawArc(rect, math.pi, math.pi, false, backgroundPaint);

    // Draw progress arc based on AQI value (0 to 500)
    double progress = (aqi / 500).clamp(0.0, 1.0);
    double sweepAngle = progress * math.pi;

    canvas.drawArc(rect, math.pi, sweepAngle, false, progressPaint);
  }

  @override
  bool shouldRepaint(covariant AQIArcPainter oldDelegate) {
    return oldDelegate.aqi != aqi || oldDelegate.progressColor != progressColor;
  }
}

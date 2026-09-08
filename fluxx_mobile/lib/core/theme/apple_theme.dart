import 'dart:ui' as ui;
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:google_fonts/google_fonts.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// FLUXX APPLE THEME — iOS HIG-compliant visual token system
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPOGRAPHY TOKENS
// ─────────────────────────────────────────────────────────────────────────────

class FluxxTypography {
  FluxxTypography._();

  static TextStyle get heroDisplay => GoogleFonts.inter(
        fontSize: 96,
        fontWeight: FontWeight.w200,
        letterSpacing: -2.0,
        height: 1.0,
        color: Colors.white,
      );

  static TextStyle get title => GoogleFonts.inter(
        fontSize: 34,
        fontWeight: FontWeight.w400,
        color: Colors.white,
      );

  static TextStyle get subtitle => GoogleFonts.inter(
        fontSize: 20,
        fontWeight: FontWeight.w500,
        color: Colors.white,
      );

  static TextStyle get sectionHeader => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.2,
        color: Colors.white.withValues(alpha: 0.6),
      );

  static TextStyle get secondaryMetric => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w400,
        color: Colors.white,
      );

  static TextStyle get cardMetric => GoogleFonts.inter(
        fontSize: 48,
        fontWeight: FontWeight.w100,
        height: 1.1,
        color: Colors.white,
      );

  static TextStyle get cardBody => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: Colors.white.withValues(alpha: 0.7),
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APPLE GLASS CARD
// ─────────────────────────────────────────────────────────────────────────────

class AppleGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? width;
  final double? height;
  final double blurSigma;
  final double fillAlpha;
  final double borderWidth;
  final double borderRadius;

  const AppleGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.width,
    this.height,
    this.blurSigma = 6.0,
    this.fillAlpha = 0.16,
    this.borderWidth = 1.0,
    this.borderRadius = 38.0,
  });

  @override
  Widget build(BuildContext context) {
    final squircle = ContinuousRectangleBorder(
      borderRadius: BorderRadius.circular(borderRadius),
    );

    return Container(
      width: width,
      height: height,
      decoration: ShapeDecoration(
        shape: squircle,
        shadows: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            spreadRadius: -5,
          ),
        ],
      ),
      child: ClipPath(
        clipper: ShapeBorderClipper(shape: squircle),
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
          child: CustomPaint(
            foregroundPainter: _SpecularRimPainter(
              borderRadius: borderRadius,
              borderWidth: borderWidth,
            ),
            child: Container(
              padding: padding,
              decoration: ShapeDecoration(
                color: Colors.white.withValues(alpha: fillAlpha),
                shape: squircle,
              ),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class _SpecularRimPainter extends CustomPainter {
  final double borderRadius;
  final double borderWidth;

  _SpecularRimPainter({
    required this.borderRadius,
    required this.borderWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(borderWidth / 2),
      Radius.circular(borderRadius * 0.6),
    );

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth
      ..shader = ui.Gradient.linear(
        Offset(size.width / 2, 0),
        Offset(size.width / 2, size.height),
        [
          Colors.white.withValues(alpha: 0.35),
          Colors.white.withValues(alpha: 0.05),
        ],
      );

    canvas.drawRRect(rrect, paint);
  }

  @override
  bool shouldRepaint(covariant _SpecularRimPainter old) =>
      old.borderRadius != borderRadius || old.borderWidth != borderWidth;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PHOTOREALISTIC WEATHER ENGINE
// ─────────────────────────────────────────────────────────────────────────────

enum WeatherCondition {
  sunny,
  lightRain,
  heavyStorm,
  smog,
  night,
}

class DynamicAtmosphereBackground extends StatefulWidget {
  final WeatherCondition condition;

  const DynamicAtmosphereBackground({
    super.key,
    required this.condition,
  });

  @override
  State<DynamicAtmosphereBackground> createState() =>
      _DynamicAtmosphereBackgroundState();
}

class _DynamicAtmosphereBackgroundState
    extends State<DynamicAtmosphereBackground>
    with SingleTickerProviderStateMixin {
  late Ticker _ticker;
  final ValueNotifier<double> _timeNotifier = ValueNotifier(0.0);

  @override
  void initState() {
    super.initState();
    // Continuous infinite time for seamless particle physics
    _ticker = createTicker((elapsed) {
      _timeNotifier.value = elapsed.inMicroseconds / 1000000.0;
    })..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _timeNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    CustomPainter painter;
    switch (widget.condition) {
      case WeatherCondition.sunny:
        painter = AppleSunnySkyPainter();
        break;
      case WeatherCondition.lightRain:
        painter = LightRainPainter(timeNotifier: _timeNotifier);
        break;
      case WeatherCondition.heavyStorm:
        painter = HeavyStormPainter(timeNotifier: _timeNotifier);
        break;
      case WeatherCondition.smog:
        painter = SmogPainter(timeNotifier: _timeNotifier);
        break;
      case WeatherCondition.night:
        painter = NightSkyPainter();
        break;
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 1200),
      child: CustomPaint(
        key: ValueKey(widget.condition),
        painter: painter,
        size: Size.infinite,
      ),
    );
  }
}

class AppleSunnySkyPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    // Atmospheric Sky Wash
    final skyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        [
          const Color(0xFF1B60C1),
          const Color(0xFF113E80),
        ],
      );
    canvas.drawRect(rect, skyPaint);

    // Light source high and slightly tucked under the status bar
    final sunCenter = Offset(size.width * 0.24, size.height * 0.06);

    // Corona Aura: fading from soft golden-white into transparent
    final coronaPaint = Paint()
      ..shader = ui.Gradient.radial(
        sunCenter,
        260.0,
        [
          const Color(0xFFFFF8E7).withValues(alpha: 0.35),
          const Color(0xFFFFF8E7).withValues(alpha: 0.0),
        ],
      );
    canvas.drawCircle(sunCenter, 260.0, coronaPaint);

    // Inner Core Bloom: smooth falloff, no hard edge
    final coreBloomPaint = Paint()
      ..shader = ui.Gradient.radial(
        sunCenter,
        90.0,
        [
          Colors.white.withValues(alpha: 0.95),
          Colors.white.withValues(alpha: 0.25),
          Colors.white.withValues(alpha: 0.0),
        ],
        [0.0, 0.5, 1.0],
      );
    canvas.drawCircle(sunCenter, 90.0, coreBloomPaint);

    final screenCenter = Offset(size.width * 0.5, size.height * 0.5);
    final dx = screenCenter.dx - sunCenter.dx;
    final dy = screenCenter.dy - sunCenter.dy;
    final dist = math.sqrt(dx * dx + dy * dy);
    final nx = dx / dist;
    final ny = dy / dist;

    final orbs = [
      (0.35, 45.0),
      (0.65, 25.0),
    ];

    for (final (t, radius) in orbs) {
      final orbCenter = Offset(
        sunCenter.dx + nx * dist * t,
        sunCenter.dy + ny * dist * t,
      );
      final orbPaint = Paint()
        ..shader = ui.Gradient.radial(
          orbCenter,
          radius,
          [
            Colors.white.withValues(alpha: 0.10),
            Colors.white.withValues(alpha: 0.0),
          ],
        );
      canvas.drawCircle(orbCenter, radius, orbPaint);
    }
  }

  @override
  bool shouldRepaint(covariant AppleSunnySkyPainter old) => false;
}

class LightRainPainter extends CustomPainter {
  final ValueNotifier<double> timeNotifier;
  static final List<double> _seedsX = List.generate(60, (i) => (i * 13.0) % 100 / 100.0);
  static final List<double> _seedsY = List.generate(60, (i) => (i * 23.0) % 100 / 100.0);
  static final List<double> _speeds = List.generate(60, (i) => 1.0 + ((i * 7.0) % 100 / 100.0) * 0.5);

  LightRainPainter({required this.timeNotifier}) : super(repaint: timeNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    final time = timeNotifier.value;
    final rect = Offset.zero & size;

    final skyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        [
          const Color(0xFF1A2536),
          const Color(0xFF2C3E50),
        ],
      );
    canvas.drawRect(rect, skyPaint);

    final rainPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.15)
      ..strokeWidth = 1.0
      ..strokeCap = StrokeCap.round;

    final totalHeight = size.height;
    const buffer = 50.0;

    for (int i = 0; i < 60; i++) {
      final initialY = _seedsY[i] * totalHeight;
      final speed = _speeds[i];
      final fallSpeed = 300.0 * speed; // pixels per second

      // Continuous independent wrapping
      final y = (initialY + (time * fallSpeed)) % (totalHeight + buffer) - buffer;
      
      // Use y and seed to pseudorandomize X across the wrap
      final wrapCount = ((initialY + (time * fallSpeed)) / (totalHeight + buffer)).floor();
      final currentSeedX = (_seedsX[i] + wrapCount * 0.37) % 1.0;
      final startX = currentSeedX * size.width;

      canvas.drawLine(
        Offset(startX, y),
        Offset(startX - 10.0, y + 30.0),
        rainPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant LightRainPainter old) => false;
}

class HeavyStormPainter extends CustomPainter {
  final ValueNotifier<double> timeNotifier;
  static final List<double> _seedsX = List.generate(120, (i) => (i * 17.0) % 100 / 100.0);
  static final List<double> _seedsY = List.generate(120, (i) => (i * 31.0) % 100 / 100.0);
  static final List<double> _speeds = List.generate(120, (i) => 1.5 + ((i * 11.0) % 100 / 100.0) * 1.0);

  HeavyStormPainter({required this.timeNotifier}) : super(repaint: timeNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    final time = timeNotifier.value;
    final rect = Offset.zero & size;

    final skyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        [
          const Color(0xFF0F141C),
          const Color(0xFF1B222C),
        ],
      );
    canvas.drawRect(rect, skyPaint);

    final rainPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    final totalHeight = size.height;
    const buffer = 80.0;

    for (int i = 0; i < 120; i++) {
      final initialY = _seedsY[i] * totalHeight;
      final speed = _speeds[i];
      final fallSpeed = 500.0 * speed; // pixels per second

      final y = (initialY + (time * fallSpeed)) % (totalHeight + buffer) - buffer;
      
      final wrapCount = ((initialY + (time * fallSpeed)) / (totalHeight + buffer)).floor();
      final currentSeedX = (_seedsX[i] + wrapCount * 0.43) % 1.0;
      final startX = currentSeedX * size.width;

      canvas.drawLine(
        Offset(startX, y),
        Offset(startX - 20.0, y + 60.0),
        rainPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant HeavyStormPainter old) => false;
}

class SmogPainter extends CustomPainter {
  final ValueNotifier<double> timeNotifier;
  static final List<double> _seedsX = List.generate(50, (i) => (i * 19.0) % 100 / 100.0);
  static final List<double> _seedsY = List.generate(50, (i) => (i * 29.0) % 100 / 100.0);
  static final List<double> _speeds = List.generate(50, (i) => 0.2 + ((i * 5.0) % 100 / 100.0) * 0.3);

  SmogPainter({required this.timeNotifier}) : super(repaint: timeNotifier);

  @override
  void paint(Canvas canvas, Size size) {
    final time = timeNotifier.value;
    final rect = Offset.zero & size;

    // Dark slate fading into soft warm-amber horizon glow
    final skyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        [
          const Color(0xFF1C232B),
          const Color(0xFF3B3127),
        ],
      );
    canvas.drawRect(rect, skyPaint);

    final dustPaint = Paint()..color = const Color(0xFFFFCCAA).withValues(alpha: 0.3);

    final totalHeight = size.height;
    final totalWidth = size.width;
    const buffer = 20.0;

    for (int i = 0; i < 50; i++) {
      final initialY = _seedsY[i] * totalHeight;
      final initialX = _seedsX[i] * totalWidth;
      final speed = _speeds[i];
      
      final driftSpeedY = -30.0 * speed; // Slowly drifting up
      final driftSpeedX = 20.0 * speed;  // Slowly drifting right

      // Wrap Y
      final y = (initialY + (time * driftSpeedY)) % (totalHeight + buffer * 2) - buffer;
      // Wrap X
      final x = (initialX + (time * driftSpeedX)) % (totalWidth + buffer * 2) - buffer;

      canvas.drawCircle(Offset(x, y), 1.5 + (_seedsX[i] * 2.0), dustPaint);
    }
  }

  @override
  bool shouldRepaint(covariant SmogPainter old) => false;
}

class NightSkyPainter extends CustomPainter {
  static final List<Offset> _stars = List.generate(
      30,
      (i) => Offset(
            ((i * 31.0) % 100 / 100.0),
            ((i * 47.0) % 100 / 100.0),
          ));
  static final List<double> _starRadii = List.generate(
      30, (i) => 0.8 + ((i * 13.0) % 100 / 100.0) * 0.7); // 0.8px to 1.5px
  static final List<double> _starOpacities = List.generate(
      30, (i) => 0.15 + ((i * 17.0) % 100 / 100.0) * 0.30); // 0.15 to 0.45

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    // Deep California midnight navy blending into deep royal indigo
    final skyPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        [
          const Color(0xFF080E1E),
          const Color(0xFF16223B),
        ],
      );
    canvas.drawRect(rect, skyPaint);

    for (int i = 0; i < 30; i++) {
      final starPaint = Paint()
        ..color = Colors.white.withValues(alpha: _starOpacities[i]);
      final x = _stars[i].dx * size.width;
      final y = _stars[i].dy * size.height;
      canvas.drawCircle(Offset(x, y), _starRadii[i], starPaint);
    }
  }

  @override
  bool shouldRepaint(covariant NightSkyPainter old) => false;
}

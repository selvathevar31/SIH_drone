import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/apple_theme.dart';
import '../../../../data/providers/repository_providers.dart';

/// Hero header displaying the primary AQI score and location information.
/// Hooks directly into [currentAqiProvider] for real-time updates.
class AqiHeroHeader extends ConsumerWidget {
  const AqiHeroHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final aqiState = ref.watch(currentAqiProvider);

    return aqiState.when(
      data: (data) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 48.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Location Name (Inter 34pt Regular)
              Text(
                data.locationName,
                style: FluxxTypography.title,
                textAlign: TextAlign.center,
              ),
              // Current Temperature & Condition
              Text(
                '${data.temperature.round()}° | ${data.condition}',
                style: FluxxTypography.subtitle,
              ),
              const SizedBox(height: 16),
              // Primary AQI Number (Inter 96pt UltraLight)
              Text(
                '${data.aqi}',
                style: FluxxTypography.heroDisplay,
              ),
              // Atmospheric health status tag (tinted badge)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${data.status.toUpperCase()} - ${data.pm25.round()} PM2.5',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600, // SemiBold
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
              )
            ],
          ),
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 24.0, vertical: 80.0),
        child: Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      ),
      error: (err, stack) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 80.0),
        child: Center(
          child: Text(
            'Unable to load AQI data.',
            style: FluxxTypography.cardBody,
          ),
        ),
      ),
    );
  }
}

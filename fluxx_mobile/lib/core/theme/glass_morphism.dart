// Barrel re-export — all tokens live in apple_theme.dart.
import 'apple_theme.dart';
export 'apple_theme.dart' show AppleGlassCard;

/// Legacy alias for backward compatibility with existing widget imports.
/// Prefer [AppleGlassCard] in new code.
typedef GlassCard = AppleGlassCard;

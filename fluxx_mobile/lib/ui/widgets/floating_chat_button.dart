import 'package:flutter/material.dart';
import '../../core/theme/apple_theme.dart';
import 'rag_assistant_sheet.dart';

class FloatingChatButton extends StatefulWidget {
  const FloatingChatButton({super.key});

  @override
  State<FloatingChatButton> createState() => _FloatingChatButtonState();
}

class _FloatingChatButtonState extends State<FloatingChatButton> with TickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;
  
  late final AnimationController _bottomSheetController;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    
    // Spring physics for button tap
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeOutCubic),
    );

    // Bottom sheet modal controller
    _bottomSheetController = BottomSheet.createAnimationController(this)
      ..duration = const Duration(milliseconds: 600)
      ..reverseDuration = const Duration(milliseconds: 400);
      
    // Apply spring simulation curve
    _bottomSheetController.drive(CurveTween(curve: const SpringCurve()));
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _bottomSheetController.dispose();
    super.dispose();
  }

  void _showChatAssistant(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      transitionAnimationController: _bottomSheetController,
      builder: (context) => const RagAssistantSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _scaleController.forward(),
      onTapUp: (_) {
        _scaleController.reverse();
        _showChatAssistant(context);
      },
      onTapCancel: () => _scaleController.reverse(),
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: AppleGlassCard(
          width: 56,
          height: 56,
          borderRadius: 28,
          blurSigma: 12.0,
          fillAlpha: 0.25,
          borderWidth: 1.5,
          padding: EdgeInsets.zero,
          child: Center(
            child: Icon(
              Icons.auto_awesome,
              color: Colors.white,
              size: 28,
              shadows: [
                Shadow(
                  color: Colors.white.withValues(alpha: 0.5),
                  blurRadius: 8.0,
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A custom Curve that behaves like a Spring.
class SpringCurve extends Curve {
  const SpringCurve([this.a = 0.15, this.w = 19.4]);
  final double a;
  final double w;

  @override
  double transformInternal(double t) {
    return (-(1 - t) * (1 - t) * (1 - t) * (1 - t) + 1.0);
  }
}

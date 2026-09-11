import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../core/theme/apple_theme.dart';

class LearnAQISection extends StatefulWidget {
  const LearnAQISection({super.key});

  @override
  State<LearnAQISection> createState() => _LearnAQISectionState();
}

class _LearnAQISectionState extends State<LearnAQISection> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  
  static const List<String> _facts = [
    "Trees in urban areas can reduce street-level particulate matter by up to 60%.",
    "PM2.5 particles are 30 times smaller than a single human hair.",
    "Rain can 'wash' the atmosphere, temporarily reducing AQI levels.",
    "Indoor air can be 2-5 times more polluted than outdoor air.",
    "Cold winter air traps pollution closer to the ground in a temperature inversion."
  ];
  
  late String _selectedFact;

  @override
  void initState() {
    super.initState();
    _selectedFact = _facts[math.Random().nextInt(_facts.length)];
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppleGlassCard(
      height: 140,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentPage = index;
                });
              },
              physics: const BouncingScrollPhysics(),
              children: [
                _buildFactSlide(),
                _buildAqiScaleSlide(),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(2, (index) => _buildDot(index)),
          ),
        ],
      ),
    );
  }

  Widget _buildDot(int index) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.symmetric(horizontal: 4),
      height: 6,
      width: _currentPage == index ? 16 : 6,
      decoration: BoxDecoration(
        color: _currentPage == index ? Colors.white : Colors.white.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(3),
      ),
    );
  }

  Widget _buildAqiScaleSlide() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.info_outline, color: Colors.white.withValues(alpha: 0.6), size: 14),
            const SizedBox(width: 4),
            Text('CPCB AQI SCALE', style: FluxxTypography.sectionHeader),
          ],
        ),
        const SizedBox(height: 8),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: const [
                    _AqiScaleItem(color: Colors.green, label: 'Good (0-50)'),
                    _AqiScaleItem(color: Colors.lightGreen, label: 'Satisfactory (51-100)'),
                    _AqiScaleItem(color: Colors.yellow, label: 'Moderate (101-200)'),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: const [
                    _AqiScaleItem(color: Colors.orange, label: 'Poor (201-300)'),
                    _AqiScaleItem(color: Colors.red, label: 'Very Poor (301-400)'),
                    _AqiScaleItem(color: Color(0xFF800000), label: 'Severe (401-500)'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFactSlide() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.lightbulb_outline, color: Colors.white.withValues(alpha: 0.6), size: 14),
            const SizedBox(width: 4),
            Text('DID YOU KNOW?', style: FluxxTypography.sectionHeader),
          ],
        ),
        const Spacer(),
        Center(
          child: Text(
            _selectedFact,
            textAlign: TextAlign.center,
            style: FluxxTypography.secondaryMetric.copyWith(
              fontStyle: FontStyle.italic,
              fontSize: 14,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const Spacer(),
      ],
    );
  }
}

class _AqiScaleItem extends StatelessWidget {
  final Color color;
  final String label;

  const _AqiScaleItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

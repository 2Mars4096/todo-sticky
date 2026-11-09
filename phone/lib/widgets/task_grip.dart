import 'package:flutter/material.dart';

import '../app.dart';

// Compact horizontal slot; retain the full first-line height for dragging.
class TaskGrip extends StatelessWidget {
  final double height;
  final bool visible;
  const TaskGrip({super.key, required this.height, this.visible = true});
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 24,
    height: height,
    child: Padding(
      padding: const EdgeInsets.only(right: 1),
      child: Align(
        alignment: Alignment.centerRight,
        child: SizedBox(
          width: 10,
          height: 14,
          child: CustomPaint(
            painter: _GripPainter(visible ? mutedInk : Colors.transparent),
          ),
        ),
      ),
    ),
  );
}

class _GripPainter extends CustomPainter {
  final Color color;
  const _GripPainter(this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    for (final x in [2.0, 8.0]) {
      for (final y in [2.0, 7.0, 12.0]) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_GripPainter old) => old.color != color;
}

double taskControlHeight(BuildContext context, {int depth = 0}) =>
    28 + MediaQuery.textScalerOf(context).scale(depth == 0 ? 16 : 15) * 1.4;

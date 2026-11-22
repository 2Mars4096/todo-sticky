import 'package:flutter/material.dart';

/// The three amber folder tabs and dark inbox from the Dockit mark.
/// The spaces between folders show the current notebook material.
class DockitFooterMark extends StatelessWidget {
  const DockitFooterMark({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox.square(
    dimension: 24,
    child: CustomPaint(painter: _FolderTray()),
  );
}

class _FolderTray extends CustomPainter {
  const _FolderTray();

  @override
  void paint(Canvas canvas, Size size) {
    // Preserve the proportions of the tray in the original 192 px icon.
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(size.shortestSide / 138);
    canvas.translate(-96, -93.5);

    final tabs = Path();
    void addTab(double x, double y, double height) {
      tabs
        ..moveTo(x, y)
        ..lineTo(x + 3, y - height + 3)
        ..quadraticBezierTo(x + 4, y - height, x + 8, y - height)
        ..lineTo(x + 25, y - height)
        ..quadraticBezierTo(x + 28, y - height, x + 30, y - height + 3)
        ..lineTo(x + 33, y)
        ..close();
    }

    addTab(104, 47, 11);
    addTab(82, 71, 9);
    addTab(53, 95, 9);
    canvas.drawPath(tabs, Paint()..color = const Color(0xfff5a000));

    final tray = Path()
      ..fillType = PathFillType.evenOdd
      ..moveTo(66, 46)
      ..lineTo(132, 46)
      ..quadraticBezierTo(142, 46, 142, 56)
      ..lineTo(142, 82)
      ..quadraticBezierTo(154, 86, 154, 98)
      ..lineTo(154, 136)
      ..quadraticBezierTo(154, 151, 139, 151)
      ..lineTo(53, 151)
      ..quadraticBezierTo(38, 151, 38, 136)
      ..lineTo(38, 98)
      ..quadraticBezierTo(38, 87, 47, 83)
      ..lineTo(47, 80)
      ..quadraticBezierTo(47, 71, 58, 70)
      ..lineTo(58, 56)
      ..quadraticBezierTo(58, 46, 66, 46)
      ..close()
      // Open areas above the front lip and between the two rear folders.
      ..moveTo(62, 70)
      ..lineTo(62, 56)
      ..quadraticBezierTo(62, 50, 68, 50)
      ..lineTo(132, 50)
      ..quadraticBezierTo(138, 50, 138, 56)
      ..lineTo(138, 70)
      ..close()
      ..moveTo(50, 95)
      ..lineTo(50, 80)
      ..quadraticBezierTo(50, 74, 57, 74)
      ..lineTo(132, 74)
      ..quadraticBezierTo(138, 74, 138, 81)
      ..lineTo(138, 95)
      ..close()
      ..moveTo(47, 105)
      ..quadraticBezierTo(47, 99, 53, 99)
      ..lineTo(133, 99)
      ..quadraticBezierTo(140, 99, 140, 106)
      ..lineTo(140, 114)
      ..quadraticBezierTo(140, 120, 134, 120)
      ..quadraticBezierTo(126, 120, 123, 128)
      ..quadraticBezierTo(121, 135, 114, 135)
      ..lineTo(76, 135)
      ..quadraticBezierTo(69, 135, 66, 128)
      ..quadraticBezierTo(63, 121, 56, 121)
      ..quadraticBezierTo(47, 121, 47, 113)
      ..close();
    canvas.drawPath(tray, Paint()..color = const Color(0xff1b1916));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_FolderTray oldDelegate) => false;
}

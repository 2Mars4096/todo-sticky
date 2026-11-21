import 'package:flutter/material.dart';

/// Identifies the destination while the enclosing native button owns the action.
class SuiteDestinationLabel extends StatelessWidget {
  const SuiteDestinationLabel({
    super.key,
    required this.product,
    required this.label,
  });

  final String product;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Image.asset(
        'assets/brand/suite-$product.png',
        width: 18,
        height: 18,
        excludeFromSemantics: true,
      ),
      const SizedBox(width: 8),
      Flexible(child: Text(label)),
    ],
  );
}

import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

// Dockit's motion and material vocabulary for the phone notebook.
// Motion confirms state (added, finished, undone, page changed); it never
// decorates. Every effect collapses to an instant change with reduced motion.

const motionState = Duration(milliseconds: 220);
const motionStrike = Duration(milliseconds: 280);
const motionFresh = Duration(milliseconds: 1100);
const easeOutQuart = Cubic(.25, 1, .5, 1);
const easeOutExpo = Cubic(.16, 1, .3, 1);

const _ink = Color(0xff3d3520);
const _freshWash = Color(0xfff3dc8a);

bool reduceMotion(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;

Duration motion(BuildContext context, Duration value) =>
    reduceMotion(context) ? Duration.zero : value;

abstract final class NotebookHaptics {
  /// A task or step was written into the notebook.
  static void commit() => HapticFeedback.lightImpact();

  /// A completion, selection or page change.
  static void tick() => HapticFeedback.selectionClick();
}

/// Paper fibres for the working note. Painted once per size and cached.
class PaperGrain extends StatelessWidget {
  const PaperGrain({super.key, required this.child, this.enabled = true});

  final Widget child;
  final bool enabled;

  @override
  Widget build(BuildContext context) => !enabled
      ? child
      : CustomPaint(
          painter: const _GrainPainter(),
          isComplex: true,
          willChange: false,
          child: child,
        );
}

class _GrainPainter extends CustomPainter {
  const _GrainPainter();

  static final Map<Size, (Float32List, Float32List)> _cache = {};

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final points = _cache.putIfAbsent(size, () {
      if (_cache.length > 6) _cache.clear();
      final random = math.Random(7);
      final count =
          (size.width * size.height / 240).clamp(0, 9000).round() & ~1;
      final dark = Float32List(count);
      final light = Float32List(count);
      for (var i = 0; i < count; i += 2) {
        dark[i] = random.nextDouble() * size.width;
        dark[i + 1] = random.nextDouble() * size.height;
        light[i] = random.nextDouble() * size.width;
        light[i + 1] = random.nextDouble() * size.height;
      }
      return (dark, light);
    });
    canvas.drawRawPoints(
      ui.PointMode.points,
      points.$1,
      Paint()
        ..color = _ink.withValues(alpha: .05)
        ..strokeWidth = 1,
    );
    canvas.drawRawPoints(
      ui.PointMode.points,
      points.$2,
      Paint()
        ..color = const Color(0xffffffff).withValues(alpha: .35)
        ..strokeWidth = 1.2,
    );
  }

  @override
  bool shouldRepaint(_GrainPainter oldDelegate) => false;
}

/// Task text with a hand-ruled strike that is drawn across each line when
/// the task finishes, and lifted again when it reopens.
class InkStrikeText extends StatefulWidget {
  const InkStrikeText(
    this.text, {
    super.key,
    required this.style,
    required this.struck,
  });

  final String text;
  final TextStyle style;
  final bool struck;

  @override
  State<InkStrikeText> createState() => _InkStrikeTextState();
}

class _InkStrikeTextState extends State<InkStrikeText>
    with SingleTickerProviderStateMixin {
  final textKey = GlobalKey();
  late final AnimationController strike = AnimationController(
    vsync: this,
    duration: motionStrike,
    reverseDuration: motionState,
    value: widget.struck ? 1 : 0,
  );

  @override
  void didUpdateWidget(InkStrikeText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.struck == widget.struck) return;
    if (reduceMotion(context)) {
      strike.value = widget.struck ? 1 : 0;
    } else if (widget.struck) {
      strike.forward();
    } else {
      strike.reverse();
    }
  }

  @override
  void dispose() {
    strike.dispose();
    super.dispose();
  }

  /// Line boxes from the laid-out paragraph, so the strike follows the
  /// text exactly at every scale, font and width.
  List<Rect> _lines() {
    final paragraph = textKey.currentContext?.findRenderObject();
    if (paragraph is! RenderParagraph || !paragraph.hasSize) return const [];
    final boxes = paragraph.getBoxesForSelection(
      TextSelection(baseOffset: 0, extentOffset: widget.text.length),
    );
    final lines = <Rect>[];
    for (final box in boxes) {
      final rect = box.toRect();
      if (rect.width <= 0) continue;
      final index = lines.indexWhere(
        (line) => (line.center.dy - rect.center.dy).abs() < rect.height / 2,
      );
      if (index < 0) {
        lines.add(rect);
      } else {
        lines[index] = lines[index].expandToInclude(rect);
      }
    }
    return lines;
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: strike,
    builder: (context, child) => CustomPaint(
      foregroundPainter: strike.value == 0
          ? null
          : _StrikePainter(
              lines: _lines,
              progress: easeOutQuart.transform(strike.value),
              rtl: Directionality.of(context) == TextDirection.rtl,
              width: math.max(1.4, (widget.style.fontSize ?? 16) / 10),
              color: (widget.style.color ?? _ink).withValues(alpha: .7),
            ),
      child: child,
    ),
    child: Text(widget.text, key: textKey, style: widget.style),
  );
}

class _StrikePainter extends CustomPainter {
  _StrikePainter({
    required this.lines,
    required this.progress,
    required this.rtl,
    required this.width,
    required this.color,
  });

  final List<Rect> Function() lines;
  final double progress;
  final bool rtl;
  final double width;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final rows = lines();
    final total = rows.fold<double>(0, (sum, line) => sum + line.width);
    if (total == 0) return;
    var remaining = total * progress;
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = width;
    for (final line in rows) {
      if (remaining <= 0) break;
      final length = math.min(line.width, remaining);
      remaining -= length;
      final y = line.top + line.height * .55;
      final start = rtl ? line.right + 1 : line.left - 1;
      final end = rtl ? start - length - 2 : start + length + 2;
      // A slight rise and settle reads as a pen stroke, not a rule.
      final path = Path()
        ..moveTo(start, y + .6)
        ..quadraticBezierTo((start + end) / 2, y - .9, end, y + .2);
      canvas.drawPath(path, stroke);
    }
  }

  @override
  bool shouldRepaint(_StrikePainter old) =>
      old.progress != progress || old.color != color || old.width != width;
}

/// Briefly washes a newly written row so the eye finds where it landed.
class FreshInk extends StatelessWidget {
  const FreshInk({super.key, required this.fresh, required this.child});

  final bool fresh;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!fresh || reduceMotion(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1, end: 0),
      duration: motionFresh,
      curve: Curves.easeOutCubic,
      builder: (context, value, child) => DecoratedBox(
        decoration: BoxDecoration(
          color: _freshWash.withValues(alpha: .55 * value),
        ),
        child: child,
      ),
      child: child,
    );
  }
}

/// A short receipt above the footer with one recovery action. It stays
/// visible long enough to read and leaves the list in place.
class UndoReceipt extends StatefulWidget {
  const UndoReceipt({
    super.key,
    required this.label,
    required this.actionLabel,
    required this.onAction,
    this.visibleFor = const Duration(seconds: 6),
  });

  final String? label;
  final String actionLabel;
  final VoidCallback onAction;
  final Duration visibleFor;

  @override
  State<UndoReceipt> createState() => _UndoReceiptState();
}

class _UndoReceiptState extends State<UndoReceipt> {
  Timer? timer;
  String? shown;
  int generation = 0;

  @override
  void initState() {
    super.initState();
    _show(widget.label);
  }

  @override
  void didUpdateWidget(UndoReceipt oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.label != widget.label) _show(widget.label);
  }

  void _show(String? label) {
    timer?.cancel();
    shown = label;
    generation++;
    if (label == null) return;
    timer = Timer(widget.visibleFor, () {
      if (mounted) setState(() => shown = null);
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final label = shown;
    return AnimatedSwitcher(
      duration: motion(context, motionState),
      reverseDuration: motion(context, const Duration(milliseconds: 160)),
      switchInCurve: easeOutExpo,
      switchOutCurve: Curves.easeIn,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, .35),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: label == null
          ? const SizedBox.shrink(key: ValueKey('undo-hidden'))
          : Padding(
              key: ValueKey('undo-$generation'),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Semantics(
                liveRegion: true,
                child: Material(
                  color: _ink,
                  elevation: 6,
                  shadowColor: _ink.withValues(alpha: .4),
                  shape: const StadiumBorder(),
                  child: Padding(
                    padding: const EdgeInsets.only(left: 20, right: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            label,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xfffff8dc)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xfff3cf66),
                            minimumSize: const Size(48, 48),
                          ),
                          onPressed: () {
                            NotebookHaptics.tick();
                            timer?.cancel();
                            widget.onAction();
                          },
                          child: Text(widget.actionLabel),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

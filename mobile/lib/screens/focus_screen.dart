import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../state/sticky_store.dart';

class FocusScreen extends StatefulWidget {
  final StickyStore store;
  final void Function(String id, String text)? onReview;
  const FocusScreen({super.key, required this.store, this.onReview});
  @override
  State<FocusScreen> createState() => _FocusScreenState();
}

class _FocusScreenState extends State<FocusScreen> {
  Timer? timer;
  final scroll = ScrollController();
  String? selected;
  bool allHistory = false;
  String? reviewId;
  String? reviewText;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && widget.store.focus.activeSession != null) setState(() {});
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final focus = store.focus;
    final session = focus.activeSession;
    final tasks = store.planningTasks;
    if (!tasks.any((t) => '${t.date}/${t.task.id}' == selected)) {
      selected = tasks.isEmpty
          ? null
          : '${tasks.first.date}/${tasks.first.task.id}';
    }
    final remaining =
        (session?.remaining() ?? focus.sessionDurationMinutes * 60000) ~/ 1000;
    final ratio = session == null
        ? 0.0
        : (1 - session.remaining() / (session.durationMinutes * 60000)).clamp(
            0.0,
            1.0,
          );
    final next = [
      'Moon',
      'Venus',
      'Mars',
      'Saturn',
      'Earth',
    ][focus.lastOrbitIndex % 5];
    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        if (reviewId != null && session == null && widget.onReview != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => widget.onReview!(reviewId!, reviewText!),
              icon: const Icon(Icons.checklist),
              label: const Text('Review task'),
            ),
          ),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xff3e321b), Color(0xff1c241f)],
            ),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.route_outlined,
                    color: Color(0xffd9c98b),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'SOLAR ROUTE · $next',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xffd9c98b),
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
              if (session != null) ...[
                const SizedBox(height: 24),
                Text(
                  session.taskText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    color: paper,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Semantics(
                label:
                    '${remaining ~/ 60} minutes ${remaining % 60} seconds remaining',
                child: Text(
                  '${(remaining ~/ 60).toString().padLeft(2, '0')}:${(remaining % 60).toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 56,
                    fontWeight: FontWeight.w300,
                    color: paper,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
              if (session != null)
                Text(
                  session.pausedAt != null
                      ? 'Paused'
                      : remaining == 0
                      ? 'Ready to finish'
                      : ratio < .15
                      ? 'Ignition'
                      : ratio < .35
                      ? 'Ascent'
                      : ratio < .55
                      ? 'Heating'
                      : ratio < .8
                      ? 'Staging'
                      : 'Orbit',
                  style: const TextStyle(color: Color(0xffd9c98b)),
                ),
              if (session != null) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: session.pausedAt == null
                            ? store.pauseFocus
                            : store.resumeFocus,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: paper,
                          side: const BorderSide(color: Color(0xff9e9474)),
                          minimumSize: const Size(48, 48),
                        ),
                        child: Text(
                          session.pausedAt == null ? 'Pause' : 'Resume',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () {
                          setState(() {
                            reviewId = session.taskId;
                            reviewText = session.taskText;
                          });
                          store.finishFocus();
                          WidgetsBinding.instance.addPostFrameCallback((_) {
                            if (mounted && scroll.hasClients) scroll.jumpTo(0);
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Session saved. Task unchanged.'),
                            ),
                          );
                        },
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xffd9c98b),
                          foregroundColor: ink,
                        ),
                        child: const Text('Finish session'),
                      ),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () async {
                    final discard = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Discard this session?'),
                        content: const Text(
                          'The session will not enter your travel log. Your task stays unchanged.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Keep focusing'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Discard'),
                          ),
                        ],
                      ),
                    );
                    if (discard == true) store.cancelFocus();
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xffd9c98b),
                  ),
                  child: const Text('Discard session'),
                ),
              ],
              const SizedBox(height: 20),
              Semantics(
                label:
                    'Solar route to $next, ${(ratio * 100).round()} percent complete',
                child: SizedBox(
                  height: 190,
                  child: InteractiveViewer(
                    minScale: 1,
                    maxScale: 3,
                    child: CustomPaint(
                      size: const Size(double.infinity, 190),
                      painter: SolarRoutePainter(
                        progress: ratio,
                        mission: focus.lastOrbitIndex,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (session == null) ...[
          const SizedBox(height: 24),
          DropdownButtonFormField<String>(
            initialValue: selected,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Focus on'),
            items: [
              for (final t in tasks)
                DropdownMenuItem(
                  value: '${t.date}/${t.task.id}',
                  child: Text(
                    t.task.text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: (value) => setState(() => selected = value),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('Minutes'),
              Expanded(
                child: Slider(
                  value: focus.sessionDurationMinutes.toDouble(),
                  min: 1,
                  max: 240,
                  divisions: 239,
                  label: '${focus.sessionDurationMinutes}',
                  onChanged: (value) {
                    focus.sessionDurationMinutes = value.round();
                    store.changed();
                  },
                ),
              ),
              SizedBox(
                width: 32,
                child: Text(
                  '${focus.sessionDurationMinutes}',
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
          FilledButton.icon(
            onPressed: selected == null
                ? null
                : () {
                    final t = tasks.firstWhere(
                      (t) => '${t.date}/${t.task.id}' == selected,
                    );
                    store.startFocus(t.task, focus.sessionDurationMinutes);
                  },
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Start focus'),
          ),
        ],
        const SizedBox(height: 32),
        Row(
          children: [
            Expanded(
              child: Text(
                'Travel log',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            TextButton(
              onPressed: () => setState(() => allHistory = !allHistory),
              child: Text(allHistory ? 'Recent' : 'Full archive'),
            ),
          ],
        ),
        if (focus.missionHistory.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('No sessions yet', style: TextStyle(color: mutedInk)),
          ),
        for (final mission in focus.missionHistory.take(
          allHistory ? focus.missionHistory.length : 3,
        ))
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.public, color: amber),
            title: Text(mission.taskText),
            subtitle: Text(
              '${mission.orbitLabel} · ${mission.durationMinutes} min planned\n${DateFormat('d MMM, HH:mm').format(DateTime.fromMillisecondsSinceEpoch(mission.completedAt))}',
            ),
            isThreeLine: true,
            trailing: Text(
              mission.vehicleCode,
              style: const TextStyle(fontSize: 11, color: mutedInk),
            ),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            const Expanded(
              child: Text(
                'Keep completed sessions',
                style: TextStyle(fontSize: 12, color: mutedInk),
              ),
            ),
            DropdownButton<int>(
              value: focus.archiveRetentionLimit,
              items: [
                for (final n in [6, 12, 24])
                  DropdownMenuItem(value: n, child: Text('$n')),
              ],
              onChanged: (n) {
                if (n != null) store.setRetention(n);
              },
            ),
          ],
        ),
      ],
    );
  }
}

class SolarRoutePainter extends CustomPainter {
  final double progress;
  final int mission;
  SolarRoutePainter({required this.progress, required this.mission});
  @override
  void paint(Canvas canvas, Size size) {
    final random = Random(7);
    for (var i = 0; i < 45; i++) {
      canvas.drawCircle(
        Offset(
          random.nextDouble() * size.width,
          random.nextDouble() * size.height,
        ),
        random.nextDouble() * .9 + .3,
        Paint()
          ..color = paper.withValues(alpha: random.nextDouble() * .5 + .15),
      );
    }
    final center = Offset(size.width / 2, size.height / 2);
    final orbit = Rect.fromCenter(
      center: center,
      width: size.width * .84,
      height: size.height * .64,
    );
    canvas.drawOval(
      orbit,
      Paint()
        ..color = const Color(0xffa09a75).withValues(alpha: .3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    const colors = [
      Color(0xff4b9bb5),
      Color(0xffb7b2a1),
      Color(0xffd5aa64),
      Color(0xffc67450),
      Color(0xffc1aa75),
    ];
    for (var i = 0; i < 5; i++) {
      final angle = -pi / 2 + i * 2 * pi / 5;
      final point = Offset(
        center.dx + orbit.width / 2 * cos(angle),
        center.dy + orbit.height / 2 * sin(angle),
      );
      final radius = i == 4
          ? 14.0
          : i == 1
          ? 6.0
          : 10.0;
      canvas.drawCircle(
        point,
        radius,
        Paint()
          ..shader = RadialGradient(
            center: const Alignment(-.5, -.5),
            colors: [
              Color.lerp(colors[i], Colors.white, .4)!,
              colors[i],
              Color.lerp(colors[i], Colors.black, .7)!,
            ],
          ).createShader(Rect.fromCircle(center: point, radius: radius)),
      );
      if (i == 4) {
        canvas.drawOval(
          Rect.fromCenter(center: point, width: 44, height: 12),
          Paint()
            ..color = colors[i].withValues(alpha: .7)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3,
        );
      }
    }
    final angle = -pi / 2 + ((mission % 5) + progress) * 2 * pi / 5;
    final point = Offset(
      center.dx + orbit.width / 2 * cos(angle),
      center.dy + orbit.height / 2 * sin(angle),
    );
    canvas.drawCircle(
      point,
      9,
      Paint()..color = const Color(0xffffe5a2).withValues(alpha: .16),
    );
    canvas.drawCircle(point, 3, Paint()..color = const Color(0xffffe5a2));
  }

  @override
  bool shouldRepaint(SolarRoutePainter old) =>
      old.progress != progress || old.mission != mission;
}

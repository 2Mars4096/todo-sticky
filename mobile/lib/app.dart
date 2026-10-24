import 'dart:async';
import 'package:flutter/material.dart';
import 'state/sticky_store.dart';
import 'services/ai_service.dart';
import 'screens/home_screen.dart';
import 'screens/goals_screen.dart';
import 'screens/focus_screen.dart';
import 'screens/settings_screen.dart';

const paper = Color(0xfffff8dc);
const ink = Color(0xff3d3520);
const amber = Color(0xff856519);
const mutedInk = Color(0xff756747);

class StickyApp extends StatefulWidget {
  final StickyStore store;
  final Widget Function(StickyStore store)? accountBuilder;
  const StickyApp({super.key, required this.store, this.accountBuilder});
  @override
  State<StickyApp> createState() => _StickyAppState();
}

class _StickyAppState extends State<StickyApp> with WidgetsBindingObserver {
  late final AiService ai = AiService(widget.store.credentials);
  Timer? clock;
  int tab = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    clock = Timer.periodic(
      const Duration(seconds: 15),
      (_) => widget.store.refreshClock(),
    );
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    clock?.cancel();
    ai.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) widget.store.refreshClock();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final store = widget.store;
      final background = switch (store.preferences.material) {
        'frosted' => const Color(0xfff1f2e7),
        'liquid' => const Color(0xffedf2e9),
        _ => paper,
      };
      return MaterialApp(
        title: 'Sticky Todo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: amber,
            brightness: Brightness.light,
            surface: background,
            onSurface: ink,
            primary: amber,
          ),
          scaffoldBackgroundColor: background,
          appBarTheme: AppBarTheme(
            backgroundColor: background,
            foregroundColor: ink,
            centerTitle: false,
            scrolledUnderElevation: 0,
          ),
          textTheme: const TextTheme(
            titleLarge: TextStyle(fontWeight: FontWeight.w700),
            bodyLarge: TextStyle(fontSize: 16, height: 1.4),
            bodyMedium: TextStyle(fontSize: 14, height: 1.4),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white.withValues(alpha: .45),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xffe8d9a0)),
            ),
          ),
          navigationBarTheme: const NavigationBarThemeData(
            indicatorColor: Color(0xffeadba5),
            height: 70,
          ),
          dividerTheme: DividerThemeData(
            color: ink.withValues(alpha: .12),
            thickness: 1,
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
          ),
        ),
        home: Builder(
          builder: (context) => Scaffold(
            appBar: AppBar(
              title: Text(['Sticky Todo', 'Goals & routines', 'Focus'][tab]),
              actions: [
                IconButton(
                  tooltip: 'Settings',
                  icon: const Icon(Icons.tune_rounded),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => SettingsScreen(
                        store: store,
                        ai: ai,
                        accountBuilder: widget.accountBuilder,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            body: SafeArea(
              top: false,
              child: Column(
                children: [
                  if (store.saveError != null)
                    MaterialBanner(
                      content: Text(store.saveError!),
                      leading: const Icon(Icons.cloud_off_outlined),
                      actions: [
                        TextButton(
                          onPressed: store.retrySave,
                          child: const Text('Retry save'),
                        ),
                      ],
                    ),
                  if (store.notice != null)
                    MaterialBanner(
                      content: Text(store.notice!),
                      actions: [
                        TextButton(
                          onPressed: () {
                            store.notice = null;
                            store.changed();
                          },
                          child: const Text('Dismiss'),
                        ),
                      ],
                    ),
                  Expanded(
                    child: !store.ready
                        ? Center(
                            child: store.loadError == null
                                ? const CircularProgressIndicator()
                                : Padding(
                                    padding: const EdgeInsets.all(24),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.folder_off_outlined,
                                          size: 40,
                                        ),
                                        const SizedBox(height: 16),
                                        Text(store.loadError!),
                                        const SizedBox(height: 16),
                                        FilledButton(
                                          onPressed: store.initialize,
                                          child: const Text('Retry'),
                                        ),
                                      ],
                                    ),
                                  ),
                          )
                        : switch (tab) {
                            1 => GoalsScreen(store: store),
                            2 => FocusScreen(store: store),
                            _ => HomeScreen(
                              store: store,
                              ai: ai,
                              openFocus: () => setState(() => tab = 2),
                            ),
                          },
                  ),
                ],
              ),
            ),
            bottomNavigationBar: NavigationBar(
              selectedIndex: tab,
              onDestinationSelected: (value) => setState(() => tab = value),
              destinations: [
                const NavigationDestination(
                  icon: Icon(Icons.sticky_note_2_outlined),
                  selectedIcon: Icon(Icons.sticky_note_2_rounded),
                  label: 'Notes',
                ),
                const NavigationDestination(
                  icon: Icon(Icons.flag_outlined),
                  selectedIcon: Icon(Icons.flag_rounded),
                  label: 'Goals',
                ),
                NavigationDestination(
                  icon: Badge(
                    isLabelVisible: store.focus.activeSession != null,
                    child: const Icon(Icons.nightlight_outlined),
                  ),
                  selectedIcon: const Icon(Icons.nightlight_round),
                  label: 'Focus',
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

void showError(BuildContext context, Object error) =>
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error.toString().replaceFirst('Bad state: ', '')),
        duration: const Duration(seconds: 8),
      ),
    );
Future<T?> showNoteSheet<T>(BuildContext context, Widget child) =>
    showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: child,
      ),
    );

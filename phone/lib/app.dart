import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart';

import 'interface_locale.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show ValueListenable;

import 'state/sticky_store.dart';
import 'services/ai_service.dart';
import 'screens/home_screen.dart';
import 'screens/archive_screen.dart';
import 'models/workflow.dart';
import 'screens/goals_screen.dart';
import 'screens/focus_screen.dart';
import 'screens/settings_screen.dart';
import 'widgets/dockit_footer_mark.dart';

const double _footerHeight = 48;
const paper = Color(0xfffff8dc);
const ink = Color(0xff3d3520);
const amber = Color(0xff856519);
const mutedInk = Color(0xff756747);

class StickyApp extends StatefulWidget {
  final StickyStore store;
  final GlobalKey<NavigatorState>? navigatorKey;
  final ValueListenable<int>? externalFocusRequests;
  final WidgetBuilder? meetingBuilder;
  final SharedAgentRequest? sharedAgent;
  final Widget Function(StickyStore store)? accountBuilder;
  final WidgetBuilder? syncIndicatorBuilder;
  final WidgetBuilder? accountStatusBuilder;
  const StickyApp({
    super.key,
    required this.store,
    this.navigatorKey,
    this.externalFocusRequests,
    this.meetingBuilder,
    this.sharedAgent,
    this.accountBuilder,
    this.syncIndicatorBuilder,
    this.accountStatusBuilder,
  });
  @override
  State<StickyApp> createState() => _StickyAppState();
}

class _StickyAppState extends State<StickyApp> with WidgetsBindingObserver {
  late final AiService ai = AiService(
    widget.store.credentials,
    sharedRequest: widget.sharedAgent,
  );
  Timer? clock;
  int tab = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.externalFocusRequests?.addListener(_openExternalFocus);
    clock = Timer.periodic(
      const Duration(seconds: 15),
      (_) => widget.store.refreshClock(),
    );
  }

  void _openExternalFocus() {
    widget.navigatorKey?.currentState?.popUntil((route) => route.isFirst);
    if (mounted) setState(() => tab = 2);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.externalFocusRequests?.removeListener(_openExternalFocus);
    clock?.cancel();
    ai.dispose();
    super.dispose();
  }

  @override
  void didChangeLocales(List<Locale>? locales) {
    if (mounted && widget.store.preferences.interfaceLanguage == 'system') {
      setState(() {});
    }
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
      final contentText = ThemeData(useMaterial3: true).textTheme.bodyLarge!
          .copyWith(fontWeight: FontWeight.w400, height: 1.4, color: ink);
      final emphasisText = contentText.copyWith(fontWeight: FontWeight.w600);
      final bodyText = contentText.copyWith(fontSize: 14);
      currentLanguage = resolveLanguage(store.preferences.interfaceLanguage);
      final locale = materialLocale(currentLanguage);
      Intl.defaultLocale = locale.toString();
      return DockitLocaleScope(
        tag: currentLanguage,
        child: MaterialApp(
          locale: locale,
          supportedLocales: languageNames.keys.map(materialLocale).toList(),
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          title: 'Dockit',
          navigatorKey: widget.navigatorKey,
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
            textTheme: TextTheme(
              titleLarge: emphasisText.copyWith(fontSize: 22, height: 1.3),
              titleMedium: emphasisText,
              bodyLarge: contentText,
              bodyMedium: bodyText,
            ),
            listTileTheme: ListTileThemeData(
              titleTextStyle: contentText.copyWith(color: ink),
              subtitleTextStyle: bodyText.copyWith(color: mutedInk),
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
              height: _footerHeight,
              backgroundColor: Colors.transparent,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
            ),
            dividerTheme: DividerThemeData(
              color: ink.withValues(alpha: .12),
              thickness: 1,
            ),
            filledButtonTheme: FilledButtonThemeData(
              style: FilledButton.styleFrom(
                minimumSize: const Size(48, 48),
                textStyle: emphasisText.copyWith(fontSize: 14),
              ),
            ),
          ),
          home: Builder(
            builder: (context) => Scaffold(
              drawer: Drawer(
                child: SafeArea(
                  child: ListView(
                    children: [
                      ListTile(
                        title: Text(
                          'Dockit',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      ListTile(
                        leading: const Icon(Icons.settings_outlined),
                        title: Text(tr(context, "Settings")),
                        onTap: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => SettingsScreen(
                                store: store,
                                ai: ai,
                                accountBuilder: widget.accountBuilder,
                                accountStatusBuilder:
                                    widget.accountStatusBuilder,
                                syncIndicatorBuilder:
                                    widget.syncIndicatorBuilder,
                              ),
                            ),
                          );
                        },
                      ),
                      if (widget.accountBuilder != null)
                        ListTile(
                          leading: const Icon(Icons.account_circle_outlined),
                          title: Text(tr(context, "Account & sync")),
                          onTap: () {
                            Navigator.pop(context);
                            Navigator.push(
                              context,
                              MaterialPageRoute<void>(
                                builder: (_) => widget.accountBuilder!(store),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),
              body: SafeArea(
                bottom: false,
                child: Column(
                  children: [
                    if (store.saveError != null)
                      MaterialBanner(
                        content: Text(store.saveError!),
                        leading: const Icon(Icons.cloud_off_outlined),
                        actions: [
                          TextButton(
                            onPressed: store.retrySave,
                            child: Text(tr(context, "Retry save")),
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
                            child: Text(tr(context, "Dismiss")),
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
                                            child: Text(tr(context, "Retry")),
                                          ),
                                        ],
                                      ),
                                    ),
                            )
                          : switch (tab) {
                              1 => GoalsScreen(
                                store: store,
                                ai: ai,
                                openFocus: () {
                                  Navigator.of(context)
                                      .popUntil((route) => route.isFirst);
                                  setState(() => tab = 2);
                                },
                                openDay: (date) {
                                  store.selectDate(date);
                                  Navigator.of(context)
                                      .popUntil((route) => route.isFirst);
                                  setState(() => tab = 0);
                                },
                              ),
                              2 => FocusScreen(
                                store: store,
                                onReview: (id, text) {
                                  final matches = archiveRows(store.days)
                                      .where(
                                        (row) =>
                                            row.task.id == id ||
                                            '${row.date}:${row.task.id}' == id,
                                      )
                                      .toList();
                                  void focusFromRoute() {
                                    Navigator.of(context)
                                        .popUntil((route) => route.isFirst);
                                    setState(() => tab = 2);
                                  }

                                  Navigator.push(
                                    context,
                                    MaterialPageRoute<void>(
                                      builder: (_) => matches.length == 1
                                          ? TaskReviewScreen(
                                              store: store,
                                              ai: ai,
                                              row: matches.single,
                                              openFocus: focusFromRoute,
                                            )
                                          : ArchiveScreen(
                                              store: store,
                                              ai: ai,
                                              initialQuery: text,
                                              openFocus: focusFromRoute,
                                            ),
                                    ),
                                  );
                                },
                              ),
                              _ => HomeScreen(
                                meetingBuilder: widget.meetingBuilder,
                                openArchive: (progress) => Navigator.push(
                                  context,
                                  MaterialPageRoute<void>(
                                    builder: (_) => ArchiveScreen(
                                      store: store,
                                      ai: ai,
                                      progress: progress,
                                      openFocus: () {
                                        Navigator.of(context)
                                            .popUntil((route) => route.isFirst);
                                        setState(() => tab = 2);
                                      },
                                    ),
                                  ),
                                ),
                                store: store,
                                ai: ai,
                                openFocus: () => setState(() => tab = 2),
                              ),
                            },
                    ),
                  ],
                ),
              ),
              bottomNavigationBar: Material(
                color: background,
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      SizedBox.square(
                        dimension: _footerHeight,
                        child: Builder(
                          builder: (scaffold) => IconButton(
                            tooltip: MaterialLocalizations.of(scaffold)
                                .openAppDrawerTooltip,
                            onPressed: () => Scaffold.of(scaffold).openDrawer(),
                            icon: const DockitFooterMark(),
                          ),
                        ),
                      ),
                      Expanded(
                        child: MediaQuery.removePadding(
                          context: context,
                          removeTop: true,
                          removeLeft: true,
                          removeRight: true,
                          removeBottom: true,
                          child: NavigationBar(
                            selectedIndex: tab,
                            onDestinationSelected: (value) =>
                                setState(() => tab = value),
                            destinations: [
                              NavigationDestination(
                                icon: Icon(Icons.sticky_note_2_outlined),
                                selectedIcon: Icon(Icons.sticky_note_2_rounded),
                                label: tr(context, "Notes"),
                              ),
                              NavigationDestination(
                                icon: Icon(Icons.flag_outlined),
                                selectedIcon: Icon(Icons.flag_rounded),
                                label: tr(context, "Goals"),
                              ),
                              NavigationDestination(
                                icon: Badge(
                                  isLabelVisible:
                                      store.focus.activeSession != null,
                                  child: const Icon(Icons.nightlight_outlined),
                                ),
                                selectedIcon: const Icon(
                                  Icons.nightlight_round,
                                ),
                                label: tr(context, "Focus"),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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

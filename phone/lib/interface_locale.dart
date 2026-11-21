import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';

import 'interface_labels.dart';

const languageNames = {
  'en': 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  'yue': '廣東話',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'pt': 'Português',
};
const systemNames = {
  'en': 'System default',
  'zh-Hans': '跟随系统',
  'zh-Hant': '跟隨系統',
  'yue': '跟系統',
  'ja': 'システム設定',
  'ko': '시스템 기본값',
  'fr': 'Langue du système',
  'de': 'Systemsprache',
  'es': 'Idioma del sistema',
  'pt': 'Idioma do sistema',
};
const globeNames = {
  'en': 'Display language',
  'zh-Hans': '显示语言',
  'zh-Hant': '顯示語言',
  'yue': '顯示語言',
  'ja': '表示言語',
  'ko': '표시 언어',
  'fr': 'Langue d’affichage',
  'de': 'Anzeigesprache',
  'es': 'Idioma de visualización',
  'pt': 'Idioma de exibição',
};
String currentLanguage = 'en';
String resolveLanguage(String choice, [List<Locale>? devices]) {
  if (languageNames.containsKey(choice)) return choice;
  for (final device in devices ?? PlatformDispatcher.instance.locales) {
    final lang = device.languageCode.toLowerCase();
    if (lang == 'yue') return 'yue';
    if (lang == 'zh') {
      return device.scriptCode == 'Hans'
          ? 'zh-Hans'
          : device.scriptCode == 'Hant' ||
                ['HK', 'TW', 'MO'].contains(device.countryCode)
          ? 'zh-Hant'
          : 'zh-Hans';
    }
    if (languageNames.containsKey(lang)) return lang;
  }
  return 'en';
}

Locale materialLocale(String tag) => switch (tag) {
  'zh-Hans' => const Locale.fromSubtags(
    languageCode: 'zh',
    scriptCode: 'Hans',
    countryCode: 'CN',
  ),
  'zh-Hant' => const Locale.fromSubtags(
    languageCode: 'zh',
    scriptCode: 'Hant',
    countryCode: 'TW',
  ),
  'yue' => const Locale.fromSubtags(
    languageCode: 'zh',
    scriptCode: 'Hant',
    countryCode: 'HK',
  ),
  _ => Locale(tag),
};
String translateLabel(String tag, String source, List<Object?> args) {
  final row = interfaceRows[source], i = interfaceTags.indexOf(tag);
  final value = source == 'System default'
      ? systemNames[tag]!
      : source == 'Display language'
      ? globeNames[tag]!
      : row != null && i >= 0
      ? row[i]
      : source;
  return args.isEmpty
      ? value
      : value.replaceAllMapped(RegExp(r'\{(\d+)\}'), (m) {
          final n = int.parse(m[1]!);
          return n < args.length ? '${args[n]}' : m[0]!;
        });
}

String ui(String source, [List<Object?> args = const []]) =>
    translateLabel(currentLanguage, source, args);
String tr(
  BuildContext context,
  String source, [
  List<Object?> args = const [],
]) => translateLabel(
  context.dependOnInheritedWidgetOfExactType<DockitLocaleScope>()?.tag ??
      currentLanguage,
  source,
  args,
);

class DockitLocaleScope extends InheritedWidget {
  final String tag;
  const DockitLocaleScope({super.key, required this.tag, required super.child});
  @override
  bool updateShouldNotify(DockitLocaleScope old) => old.tag != tag;
}

class InterfaceLanguageButton extends StatelessWidget {
  final String choice;
  final ValueChanged<String> onChanged;
  const InterfaceLanguageButton({
    super.key,
    required this.choice,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) => PopupMenuButton<String>(
    tooltip: tr(context, 'Display language'),
    icon: const Icon(Icons.language_outlined),
    initialValue: choice,
    onSelected: onChanged,
    itemBuilder: (_) => [
      CheckedPopupMenuItem(
        value: 'system',
        checked: choice == 'system',
        child: Text(tr(context, 'System default')),
      ),
      for (final entry in languageNames.entries)
        CheckedPopupMenuItem(
          value: entry.key,
          checked: choice == entry.key,
          child: Text(entry.value),
        ),
    ],
  );
}

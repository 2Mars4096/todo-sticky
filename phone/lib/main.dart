import 'interface_locale.dart';

import 'package:flutter/material.dart';

import 'services/persistence.dart';
import 'state/sticky_store.dart';
import 'screens/account_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    final persistence = await FilePersistence.create();
    final store = StickyStore(
      persistence: persistence,
      credentials: const SecureCredentials(),
    );
    runApp(AccountEnabledApp(store: store));
  } catch (_) {
    currentLanguage = resolveLanguage('system');
    runApp(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  ui(
                    "Dockit could not open its local storage. Please reopen the app. Your existing files have not been replaced.",
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

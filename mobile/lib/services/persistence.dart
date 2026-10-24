import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

import '../models/models.dart';

abstract interface class StatePersistence {
  Future<Map<String, dynamic>?> load();
  Future<void> save(Map<String, dynamic> data);
}

class MemoryPersistence implements StatePersistence {
  Map<String, dynamic>? data;
  @override
  Future<Map<String, dynamic>?> load() async =>
      data == null ? null : object(jsonDecode(jsonEncode(data)));
  @override
  Future<void> save(Map<String, dynamic> value) async {
    data = object(jsonDecode(jsonEncode(value)));
  }
}

class FilePersistence implements StatePersistence {
  final Directory directory;
  String? recoveryNotice;
  FilePersistence(this.directory);
  static Future<FilePersistence> create() async =>
      FilePersistence(await getApplicationSupportDirectory());
  File get _file => File('${directory.path}/sticky-todo.json');
  File get _backup => File('${directory.path}/sticky-todo.previous.json');
  @override
  Future<Map<String, dynamic>?> load() async {
    if (!await _file.exists()) {
      if (await _backup.exists()) {
        return object(jsonDecode(await _backup.readAsString()));
      }
      return null;
    }
    try {
      return object(jsonDecode(await _file.readAsString()));
    } catch (error) {
      if (!await _backup.exists()) rethrow;
      final data = object(jsonDecode(await _backup.readAsString()));
      await _file.copy(
        '${directory.path}/sticky-todo.corrupt-${DateTime.now().millisecondsSinceEpoch}.json',
      );
      recoveryNotice = 'Recovered the previous local save. The unreadable file was kept for recovery.';
      return data;
    }
  }

  @override
  Future<void> save(Map<String, dynamic> data) async {
    await directory.create(recursive: true);
    final temp = File('${directory.path}/sticky-todo.pending.json');
    await temp.writeAsString(jsonEncode(data), flush: true);
    // Validate bytes before publishing. Never truncate the last readable file.
    object(jsonDecode(await temp.readAsString()));
    if (await _file.exists()) {
      try {
        object(jsonDecode(await _file.readAsString()));
        await _file.copy(_backup.path);
      } catch (_) {
        /* preserve prior readable backup */
      }
    }
    await temp.rename(_file.path);
  }
}

abstract interface class CredentialStore {
  Future<String?> read(String provider);
  Future<void> write(String provider, String value);
}

class SecureCredentials implements CredentialStore {
  final FlutterSecureStorage storage;
  const SecureCredentials({this.storage = const FlutterSecureStorage()});
  @override
  Future<String?> read(String provider) =>
      storage.read(key: 'sticky-ai-$provider');
  @override
  Future<void> write(String provider, String value) => value.isEmpty
      ? storage.delete(key: 'sticky-ai-$provider')
      : storage.write(key: 'sticky-ai-$provider', value: value);
}

class MemoryCredentials implements CredentialStore {
  final Map<String, String> values = {};
  @override
  Future<String?> read(String provider) async => values[provider];
  @override
  Future<void> write(String provider, String value) async {
    values[provider] = value;
  }
}

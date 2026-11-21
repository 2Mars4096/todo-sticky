import 'package:flutter/material.dart';

Future<DateTime?> showNotebookDatePicker(
  BuildContext context,
  DateTime selected,
) {
  return showDatePicker(
    context: context,
    initialDate: selected,
    firstDate: DateTime(selected.year < 1970 ? selected.year : 1970),
    lastDate: DateTime(selected.year > 2100 ? selected.year : 2100, 12, 31),
  );
}

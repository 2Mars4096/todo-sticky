import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NotebookCaptureField extends StatelessWidget {
  const NotebookCaptureField({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.hint,
    required this.actionLabel,
    required this.icon,
    required this.onAdd,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String hint;
  final String actionLabel;
  final IconData icon;
  final VoidCallback onAdd;
  final bool autofocus;

  bool canAdd(TextEditingValue value) =>
      value.text.trim().isNotEmpty &&
      !(value.isComposingRangeValid && !value.composing.isCollapsed);

  void submit() {
    if (canAdd(controller.value)) onAdd();
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      canRequestFocus: false,
      onKeyEvent: (_, event) {
        final keyboard = HardwareKeyboard.instance;
        if (!focusNode.hasFocus ||
            event is! KeyDownEvent ||
            !(keyboard.isControlPressed || keyboard.isMetaPressed) ||
            (event.logicalKey != LogicalKeyboardKey.enter &&
                event.logicalKey != LogicalKeyboardKey.numpadEnter) ||
            !canAdd(controller.value)) {
          return KeyEventResult.ignored;
        }
        submit();
        return KeyEventResult.handled;
      },
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        autofocus: autofocus,
        textInputAction: TextInputAction.newline,
        keyboardType: TextInputType.multiline,
        minLines: 1,
        maxLines: View.of(context).viewInsets.bottom > 0 ? 3 : 6,
        decoration: InputDecoration(
          hintText: hint,
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (_, value, _) => IconButton(
              tooltip: actionLabel,
              onPressed: canAdd(value) ? submit : null,
              icon: Icon(icon),
            ),
          ),
        ),
      ),
    );
  }
}

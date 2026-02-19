import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggleSecure,
  editable = true,
  leftIcon,
  inputRef,
  onFocus,
  onBlur,
  autoComplete,
  textContentType,
  importantForAutofill,
  autoCorrect = false,
  spellCheck = false,
  ...props
}) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = useMemo(() => {
    if (!editable) return palette.surface.border;
    if (focused) return palette.primary.solid;
    return palette.surface.borderStrong;
  }, [editable, focused, palette]);

  const defaultAutofillProps = Platform.select({
    android: {
      autoComplete: autoComplete || 'off',
      textContentType: textContentType || 'none',
      importantForAutofill: importantForAutofill || 'noExcludeDescendants',
    },
    ios: {
      autoComplete: autoComplete || 'off',
      textContentType: textContentType || 'none',
    },
    default: {
      autoComplete: autoComplete || 'off',
    },
  });

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: palette.text.primary }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: focused ? palette.surface.light : palette.surface.glass,
          },
          focused && styles.inputFocused,
          !editable && styles.inputDisabled,
          !editable && { backgroundColor: palette.surface.soft },
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={palette.text.tertiary} style={styles.leftIcon} />
        ) : null}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.text.tertiary}
          secureTextEntry={!!secureTextEntry}
          editable={editable}
          style={[styles.input, { color: palette.text.primary }]}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          {...defaultAutofillProps}
          onFocus={(event) => {
            setFocused(true);
            if (typeof onFocus === 'function') onFocus(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            if (typeof onBlur === 'function') onBlur(event);
          }}
          {...props}
        />
        {typeof secureTextEntry !== 'undefined' && onToggleSecure ? (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={secureTextEntry ? 'eye-off' : 'eye'} size={18} color={palette.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputFocused: {
    transform: [{ scale: 1 }],
  },
  input: {
    flex: 1,
    ...typography.body,
  },
  inputDisabled: {
    opacity: 0.85,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
});

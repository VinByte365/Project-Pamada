import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

/**
 * EnhancedInput Component
 * Improved input with error states, hints, character counter, and better styling
 */
export default function EnhancedInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  maxLength,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  onToggleSecure,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  inputRef,
  onFocus,
  onBlur,
  required = false,
  ...props
}) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const charCount = value?.length || 0;
  const isMaxReached = maxLength && charCount === maxLength;

  const handleFocus = (event) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  const borderColor = error
    ? palette.status.danger
    : focused
      ? palette.primary.start
      : palette.surface.borderStrong;

  const bgColor = disabled ? palette.surface.soft : focused ? palette.surface.light : palette.surface.soft;

  const defaultAutofillProps = Platform.select({
    android: {
      autoComplete: 'off',
      textContentType: 'none',
      importantForAutofill: 'noExcludeDescendants',
    },
    ios: {
      autoComplete: 'off',
      textContentType: 'none',
    },
    default: {
      autoComplete: 'off',
    },
  });

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: palette.text.primary }]}>
            {label}
            {required && <Text style={{ color: palette.status.danger }}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: bgColor,
          },
          error && styles.inputError,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={error ? palette.status.danger : palette.text.tertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.text.tertiary}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          style={[
            styles.input,
            { color: palette.text.primary },
            multiline && styles.multilineInput,
          ]}
          {...defaultAutofillProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Right Icons/Actions */}
        <View style={styles.rightIcons}>
          {typeof secureTextEntry !== 'undefined' && onToggleSecure && (
            <TouchableOpacity
              onPress={onToggleSecure}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconButton}
            >
              <Ionicons
                name={secureTextEntry ? 'eye-off' : 'eye'}
                size={18}
                color={palette.text.tertiary}
              />
            </TouchableOpacity>
          )}

          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconButton}
            >
              <Ionicons
                name={rightIcon}
                size={18}
                color={palette.text.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Helper Text and Character Count */}
      <View style={styles.footerContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color={palette.status.danger} />
            <Text style={[styles.errorText, { color: palette.status.danger }]}>{error}</Text>
          </View>
        )}

        {hint && !error && (
          <Text style={[styles.hintText, { color: palette.text.tertiary }]}>{hint}</Text>
        )}

        {maxLength && (
          <Text
            style={[
              styles.counterText,
              {
                color: isMaxReached ? palette.status.warning : palette.text.tertiary,
              },
            ]}
          >
            {charCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputError: {
    borderWidth: 1.5,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingVertical: spacing.md,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  errorText: {
    ...typography.caption,
  },
  hintText: {
    ...typography.caption,
    flex: 1,
  },
  counterText: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
});

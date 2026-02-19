import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const AuthTextField = forwardRef(function AuthTextField(
  {
    label,
    icon,
    secureTextEntry = false,
    onToggleSecure,
    onFocus,
    onBlur,
    editable = true,
    containerStyle,
    ...props
  },
  ref
) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={[styles.label, { color: palette.text.primary }]}>{label}</Text> : null}

      <View
        style={[
          styles.field,
          {
            borderColor: focused ? '#8CCFA3' : '#E6E6E6',
            backgroundColor: '#FFFFFF',
            opacity: editable ? 1 : 0.65,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color="#A7A7A7" style={styles.leftIcon} /> : null}

        <TextInput
          ref={ref}
          style={[styles.input, { color: '#2F2F2F' }]}
          placeholderTextColor="#B0B0B0"
          selectionColor={palette.primary.solid}
          secureTextEntry={secureTextEntry}
          showSoftInputOnFocus={true}
          editable={editable}
          onFocus={(event) => {
            setFocused(true);
            if (typeof onFocus === 'function') {
              onFocus(event);
            }
          }}
          onBlur={(event) => {
            setFocused(false);
            if (typeof onBlur === 'function') {
              onBlur(event);
            }
          }}
          {...props}
        />

        {typeof onToggleSecure === 'function' ? (
          <Pressable
            onPress={onToggleSecure}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
            style={styles.eyeButton}
          >
            <Ionicons
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#A7A7A7"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export default AuthTextField;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 12,
  },
  eyeButton: {
    marginLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
});

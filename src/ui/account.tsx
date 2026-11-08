import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Brand, Icon, IconButton } from './components';
import { C, S } from './theme';
export function AppHeader({
  title,
  back = false,
  action,
}: {
  title?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View style={[S.between, { minHeight: 44 }]}>
      {back ? (
        <View style={[S.row, { gap: 12 }]}>
          <IconButton
            name="arrow-back"
            label="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{title}</Text>
        </View>
      ) : (
        <Brand />
      )}
      {action}
    </View>
  );
}
export function Avatar({
  name,
  size = 48,
  dark = false,
  onPress,
}: {
  name?: string;
  size?: number;
  dark?: boolean;
  onPress?: () => void;
}) {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toUpperCase();
  const face = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: dark ? '#EEE8FF' : C.lavender,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: dark ? '#FFFFFF60' : C.white,
      }}
    >
      {initials ? (
        <Text style={{ fontSize: size * 0.34, fontWeight: '800', color: C.purpleDark }}>
          {initials}
        </Text>
      ) : (
        <Icon name="person-outline" size={size * 0.48} color={C.purple} />
      )}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open your profile"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {face}
    </Pressable>
  ) : (
    face
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false),
    [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.ink, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <View
        style={[
          S.row,
          {
            borderWidth: 1.5,
            borderColor: error ? C.coral : focused ? C.purple : C.line,
            borderRadius: 15,
            backgroundColor: focused ? C.white : '#F8F7FB',
            minHeight: 56,
            paddingHorizontal: 15,
          },
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          secureTextEntry={props.secureTextEntry && !visible}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#9693A6"
          style={[
            { flex: 1, color: C.ink, fontSize: 15, minHeight: 53, paddingVertical: 12 },
            props.style,
          ]}
        />
        {props.secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible(!visible)}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} color={C.muted} size={20} />
          </Pressable>
        )}
      </View>
      {error && <Text style={{ color: '#A34333', fontSize: 12, lineHeight: 18 }}>{error}</Text>}
    </View>
  );
}
export function Notice({
  children,
  kind = 'info',
}: {
  children: React.ReactNode;
  kind?: 'info' | 'error' | 'success';
}) {
  const color = kind === 'error' ? '#A34333' : kind === 'success' ? '#34715A' : C.purpleDark;
  return (
    <View
      style={[
        S.row,
        {
          alignItems: 'flex-start',
          gap: 10,
          backgroundColor:
            kind === 'error' ? C.coralSoft : kind === 'success' ? '#EAF4EE' : C.lavender,
          padding: 14,
          borderRadius: 14,
        },
      ]}
    >
      <Icon
        name={
          kind === 'error'
            ? 'alert-circle-outline'
            : kind === 'success'
              ? 'checkmark-circle-outline'
              : 'information-circle-outline'
        }
        color={color}
        size={18}
      />
      <Text
        accessibilityRole={kind === 'error' ? 'alert' : undefined}
        style={{ flex: 1, color, fontSize: 12, lineHeight: 19 }}
      >
        {children}
      </Text>
    </View>
  );
}
export function CheckRow({
  checked,
  onPress,
  title,
  detail,
}: {
  checked: boolean;
  onPress: () => void;
  title: string;
  detail?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={[S.row, { gap: 12, minHeight: 48, paddingVertical: 6 }]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: checked ? C.purple : '#D4CFDF',
          backgroundColor: checked ? C.purple : C.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Icon name="checkmark" color={C.white} size={17} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>{title}</Text>
        {detail && <Text style={{ color: C.muted, fontSize: 11, lineHeight: 17 }}>{detail}</Text>}
      </View>
    </Pressable>
  );
}
export function GoogleButton({
  onPress,
  loading = false,
  disabled = false,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        S.row,
        {
          minHeight: 56,
          justifyContent: 'center',
          gap: 13,
          borderWidth: 1.3,
          borderColor: '#DED9E8',
          backgroundColor: C.white,
          borderRadius: 16,
          opacity: pressed ? 0.75 : disabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.purple} />
      ) : (
        <Svg width={19} height={19} viewBox="0 0 48 48" aria-hidden>
          <Path
            fill="#4285F4"
            d="M43.6 24.46c0-1.36-.12-2.67-.35-3.93H24v7.43h11a9.4 9.4 0 0 1-4.08 6.17v5h6.6c3.86-3.55 6.08-8.78 6.08-14.67Z"
          />
          <Path
            fill="#34A853"
            d="M24 44c5.5 0 10.12-1.82 13.5-4.87l-6.6-5c-1.83 1.23-4.18 1.96-6.9 1.96-5.31 0-9.81-3.58-11.42-8.4H5.76v5.17A20.4 20.4 0 0 0 24 44Z"
          />
          <Path
            fill="#FBBC05"
            d="M12.58 27.69A12.3 12.3 0 0 1 12 24c0-1.28.21-2.52.58-3.69v-5.17H5.76A20 20 0 0 0 4 24c0 3.22.77 6.26 2.13 8.94l6.45-5.25Z"
          />
          <Path
            fill="#EA4335"
            d="M24 11.91c3 0 5.69 1.04 7.81 3.08l5.86-5.86C34.1 5.82 29.5 4 24 4A20.4 20.4 0 0 0 5.76 15.14l6.82 5.17c1.61-4.82 6.11-8.4 11.42-8.4Z"
          />
        </Svg>
      )}
      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 14 }}>Continue with Google</Text>
    </Pressable>
  );
}
export function SettingsRow({
  icon,
  title,
  detail,
  onPress,
  right,
  last = false,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  detail?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  destructive?: boolean;
}) {
  const content = (
    <>
      <View
        style={{
          width: 37,
          height: 37,
          borderRadius: 12,
          backgroundColor: destructive ? C.coralSoft : '#F4F1FA',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={destructive ? '#B14E3C' : C.purple} size={19} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: destructive ? '#B14E3C' : C.ink }}>
          {title}
        </Text>
        {detail && <Text style={{ color: C.muted, fontSize: 11, lineHeight: 17 }}>{detail}</Text>}
      </View>
      {right || (onPress && <Icon name="chevron-forward" size={16} color={C.muted} />)}
    </>
  );
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 17,
    minHeight: 76,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: '#F0EDF5',
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

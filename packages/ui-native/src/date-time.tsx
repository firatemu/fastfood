import { Input, type InputSize } from './input.js';
import type { NativeTheme } from './theme.js';

export type DateTimeKind = 'date' | 'time' | 'datetime-local';

export interface DateTimeProps {
  kind: DateTimeKind;
  size?: InputSize;
  invalid?: boolean;
  disabled?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  label?: string;
  accessibilityLabel?: string;
  testID?: string;
  theme: NativeTheme;
}

export function DateTime(props: DateTimeProps) {
  const { kind, theme, ...rest } = props;
  // The native platform exposes @react-native-community/datetimepicker;
  // this wrapper keeps the canonical token-driven shape until that
  // dependency is introduced. Demo behavior is a plain text input.
  const keyboardType = kind === 'date' || kind === 'datetime-local' ? 'numeric' : 'numeric';
  return (
    <Input
      {...rest}
      theme={theme}
      keyboardType={keyboardType}
      placeholder={kind === 'time' ? 'SS:DD' : kind === 'date' ? 'YYYY-AA-GG' : 'YYYY-AA-GG SS:DD'}
      accessibilityLabel={rest.accessibilityLabel ?? rest.label ?? 'Tarih'}
    />
  );
}

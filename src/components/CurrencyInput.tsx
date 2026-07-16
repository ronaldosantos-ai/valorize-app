import React from 'react';
import { TextInput, TextStyle, StyleProp } from 'react-native';
import { COLORS } from '../constants';

interface CurrencyInputProps {
  value: string; // valor com vírgula, ex: "12,34" — mesmo formato usado no resto do app
  onChangeValue: (value: string) => void;
  style?: StyleProp<TextStyle>;
  placeholder?: string;
  placeholderTextColor?: string;
}

// Campo de valor em dinheiro onde os dígitos entram da direita para a
// esquerda, como numa calculadora ou maquininha — evita ter que apagar
// um "0" que já estava lá antes de digitar o valor certo.
// Ex: digitando 1, 2, 3, 4 vira: 0,01 → 0,12 → 1,23 → 12,34
export default function CurrencyInput({
  value,
  onChangeValue,
  style,
  placeholder = '0,00',
  placeholderTextColor = COLORS.gray300,
}: CurrencyInputProps) {
  function formatFromDigits(digits: string): string {
    const clean = digits.replace(/^0+(?=\d)/, ''); // evita zeros à esquerda acumulando
    const cents = parseInt(clean || '0', 10);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function handleChange(text: string) {
    const digitsOnly = text.replace(/\D/g, '');
    if (!digitsOnly) {
      onChangeValue('');
      return;
    }
    onChangeValue(formatFromDigits(digitsOnly));
  }

  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      keyboardType="number-pad"
    />
  );
}

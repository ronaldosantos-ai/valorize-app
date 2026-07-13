import React from 'react';
import { TouchableOpacity, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface InfoTipProps {
  title: string;
  description: string;
  size?: number;
}

// Ícone pequeno de "i" — ao tocar, mostra a explicação num alerta.
// Usado para não poluir a tela com textos explicativos sempre visíveis.
export default function InfoTip({ title, description, size = 16 }: InfoTipProps) {
  return (
    <TouchableOpacity
      onPress={() => Alert.alert(title, description)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="information-circle-outline" size={size} color={COLORS.gray500} />
    </TouchableOpacity>
  );
}

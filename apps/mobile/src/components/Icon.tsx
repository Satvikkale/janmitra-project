import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, ICON_NAMES } from '../constants/theme';

type IconName = keyof typeof ICON_NAMES;

interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Icon component wrapper for MaterialIcons
 * Usage: <Icon name="camera" size={24} color={COLORS.primary} />
 */
export function Icon({ name, size = 24, color = COLORS.text, style }: IconProps) {
  // Check if it's a predefined icon name, otherwise use it directly
  const iconName = ICON_NAMES[name as IconName] || name;
  
  // Fallback to 'help' icon if invalid
  const validIconName = iconName || 'help';
  
  return (
    <MaterialIcons 
      name={validIconName as any}
      size={size} 
      color={color} 
      style={style}
    />
  );
}

// Convenience components for common icon sizes
export function IconSmall(props: Omit<IconProps, 'size'>) {
  return <Icon {...props} size={16} />;
}

export function IconMedium(props: Omit<IconProps, 'size'>) {
  return <Icon {...props} size={20} />;
}

export function IconLarge(props: Omit<IconProps, 'size'>) {
  return <Icon {...props} size={32} />;
}

export function IconXLarge(props: Omit<IconProps, 'size'>) {
  return <Icon {...props} size={48} />;
}

import { Wallet } from 'lucide-react';
import { createElement } from 'react';

interface WalletIconProps {
  size?: number;
  color?: string;
}

export const WalletIcon = ({ size = 24, color = '#3A86FF' }: WalletIconProps) => {
  return createElement(Wallet, { 
    size, 
    color,
    strokeWidth: 2,
    absoluteStrokeWidth: true
  });
};
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

// Іконки Lucide підключені шрифтом (assets/fonts/Lucide.ttf), а не SVG:
// шрифт вантажиться через expo-font і не потребує нативного модуля та перезбірки.
// Коди символів узято з lucide-static/font/info.json.
const ICONS = {
  'add': 0xe13d, // plus
  'remove': 0xe11c, // minus
  'close': 0xe1b2, // x
  'check': 0xe06c, // check
  'delete': 0xe18e, // trash-2
  'settings': 0xe154, // settings
  'person': 0xe19f, // user
  'group': 0xe1a4, // users
  'home': 0xe0f5, // house
  'details': 0xe5ac, // receipt-text
  'receipt': 0xe3d3, // receipt
  'logout': 0xe10e, // log-out
  'photo-camera': 0xe064, // camera
  'no-photography': 0xe065, // camera-off
  'qr-code-scanner': 0xe5f6, // scan-qr-code
  'visibility': 0xe0ba, // eye
  'visibility-off': 0xe0bb, // eye-off
  'call-split': 0xe440, // split
  'more-vert': 0xe0b7, // ellipsis-vertical
  'arrow-forward': 0xe049, // arrow-right
  'chevron-right': 0xe06f, // chevron-right
  'keyboard-arrow-up': 0xe070, // chevron-up
  'keyboard-arrow-down': 0xe06d, // chevron-down
  'arrow-drop-up': 0xe070, // chevron-up
  'arrow-drop-down': 0xe06d, // chevron-down
  'check-box': 0xe559, // square-check
  'check-box-outline-blank': 0xe167, // square
  'radio-button-checked': 0xe345, // circle-dot
  'radio-button-unchecked': 0xe076, // circle
  'wifi': 0xe1ae, // wifi
  'wifi-off': 0xe1af, // wifi-off
  'storage': 0xe0ad, // database
  'cloud-download': 0xe089, // cloud-download
  'update': 0xe087, // clock
  'sync': 0xe145, // refresh-cw
  'refresh': 0xe148, // rotate-ccw
  'bell': 0xe059, // bell
  'search': 0xe151, // search
  'swap': 0xe37d, // arrow-up-down
  'swap-horizontal': 0xe417, // arrow-right-left
  'edit': 0xe1f9, // pencil
  'success': 0xe226, // circle-check
  'theme': 0xe2b2, // sun-moon
  'palette': 0xe1dd, // palette
  'text-size': 0xe587, // a-large-small
  'rounded-corner': 0xe648, // square-round-corner
  'coins': 0xe097, // coins
  'currency': 0xe052, // banknote
  'flashlight': 0xe0d3, // flashlight
  'flashlight-off': 0xe0d4, // flashlight-off
  'alert': 0xe077, // circle-alert
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export default function Icon({ name, size = 24, color, style }: IconProps) {
  return (
    <Text
      allowFontScaling={false}
      accessible={false}
      style={[{ fontFamily: 'Lucide', fontSize: size, lineHeight: size, color }, style]}
    >
      {String.fromCodePoint(ICONS[name])}
    </Text>
  );
}

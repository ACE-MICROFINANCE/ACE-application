import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { NativeWindStyleSheet } from 'nativewind';
import App from './src/App';

// CHANGED: bật inline style cho NativeWind trên web (không cần CSS riêng)
NativeWindStyleSheet.setOutput({
  default: 'native',
});

registerRootComponent(App);

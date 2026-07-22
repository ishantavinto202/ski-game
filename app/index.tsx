import { StyleSheet, View } from 'react-native';

import { SkiGameScreen } from '@/src/components/ski-game';

const rootStyle = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function Index() {
  return (
    <View style={rootStyle.root}>
      <SkiGameScreen />
    </View>
  );
}

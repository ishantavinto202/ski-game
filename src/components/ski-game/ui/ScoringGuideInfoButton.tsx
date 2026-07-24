import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ScoringGuideInfoButtonProps } from './ScoringGuideTypes';
import { SCORING_GUIDE_INFO_BUTTON_SIZE } from './ScoringGuideTypes';

const infoStyles = StyleSheet.create({
  hit: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: SCORING_GUIDE_INFO_BUTTON_SIZE,
    height: SCORING_GUIDE_INFO_BUTTON_SIZE,
    borderRadius: SCORING_GUIDE_INFO_BUTTON_SIZE / 2,
    borderWidth: 2,
    borderColor: '#1D3557',
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D3557',
    lineHeight: 20,
  },
});

export const ScoringGuideInfoButton = memo(function ScoringGuideInfoButton({
  onPress,
}: ScoringGuideInfoButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scoring Guide"
      hitSlop={8}
      onPress={onPress}
      style={infoStyles.hit}
    >
      <Text style={infoStyles.label}>i</Text>
    </Pressable>
  );
});

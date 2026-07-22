import { StyleSheet } from 'react-native';

import { SKI_GAME_COLORS } from '../utils/colors';

export const hudStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topCluster: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heartsRow: {
    gap: 4,
    marginBottom: 6,
  },
  heart: {
    fontSize: 22,
    lineHeight: 24,
    color: '#E11D48',
    fontWeight: '700',
  },
  heartEmpty: {
    color: '#FDA4AF',
  },
  metricBlock: {
    alignItems: 'flex-start',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SKI_GAME_COLORS.playerPlaceholderBorder,
    padding: 0,
    margin: 0,
    minWidth: 48,
    textAlign: 'left',
  },
  coinPrefix: {
    fontSize: 16,
    marginRight: 4,
  },
});

export const HUD_HORIZONTAL_INSET = 12;
export const HUD_TOP_OFFSET = 8;
/** Horizontal space reserved under the top HUD cluster so metrics do not sit under the pause control. */
export const HUD_PAUSE_CLEARANCE = 56;

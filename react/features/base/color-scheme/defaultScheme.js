// @flow

import { ColorPalette, getRGBAFormat } from '../styles';

/**
 * The default color scheme of the application.
 */
export default {
    '_defaultTheme': {
        // Generic app theme colors that are used accross the entire app.
        // All scheme definitions below inherit these values.
        background: 'rgb(255, 255, 255)',
        errorText: ColorPalette.red,
        icon: 'rgb(28, 32, 37)',
        text: 'rgb(28, 32, 37)'
    },
    'Conference': {
        inviteButtonBackground: 'rgb(0, 119, 225)',
        onVideoText: 'white'
    },
    'Dialog': {
        border: 'rgba(0, 3, 6, 0.6)',
        buttonBackground: ColorPalette.blue,
        buttonLabel: ColorPalette.white
    },
    'Header': {
        background: ColorPalette.blue,
        icon: ColorPalette.white,
        statusBar: ColorPalette.blueHighlight,
        statusBarContent: ColorPalette.white,
        text: ColorPalette.white
    },
    'Modal': {},
    'LargeVideo': {
        background: 'rgb(42, 58, 75)'
    },
    'LoadConfigOverlay': {
        background: 'rgb(249, 249, 249)'
    },
    'Thumbnail': {
        activeParticipantHighlight: 'rgb(81, 214, 170)',
        activeParticipantTint: 'rgba(49, 183, 106, 0.3)',
        background: 'rgb(94, 109, 122)'
    },
    'Toolbox': {
        button: 'rgb(255, 255, 255)',
        buttonToggled: 'rgb(38, 58, 76)',
        buttonToggledBorder: getRGBAFormat('#a4b8d1', 0.6),
        hangup: 'rgb(225, 45, 45)'
    }
};

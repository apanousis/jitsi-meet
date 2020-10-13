// @flow

import React, { Component } from 'react';

import { isMobileBrowser } from '../../../base/environment/utils';
import { IconArrowDown } from '../../../base/icons';
import JitsiMeetJS from '../../../base/lib-jitsi-meet/_';
import { connect } from '../../../base/redux';
import { ToolboxButtonWithIcon } from '../../../base/toolbox/components';
import { getMediaPermissionPromptVisibility } from '../../../overlay';
import { AudioSettingsPopup, toggleAudioSettings } from '../../../settings';
import { isAudioSettingsButtonDisabled } from '../../functions';
import AudioMuteButton from '../AudioMuteButton';

type Props = {

    /**
     * Click handler for the small icon. Opens audio options.
     */
    onAudioOptionsClick: Function,

    /**
     * Whether the permission prompt is visible or not.
     * Useful for enabling the button on permission grant.
     */
    permissionPromptVisibility: boolean,

    /**
     * If the button should be disabled.
     */
    isDisabled: boolean,

    /**
     * Flag controlling the visibility of the button.
     * AudioSettings popup is disabled on mobile browsers.
     */
    visible: boolean,
};

/**
 * Button used for audio & audio settings.
 *
 * @returns {ReactElement}
 */
class AudioSettingsButton extends Component<Props, State> {
    _isMounted: boolean;

    /**
     * Initializes a new {@code AudioSettingsButton} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this._isMounted = true;
    }

    /**
     * Implements React's {@link Component#componentWillUnmount}.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._isMounted = false;
    }

    /**
     * Implements React's {@link Component#render}.
     *
     * @inheritdoc
     */
    render() {
        const { isDisabled, onAudioOptionsClick, visible } = this.props;
        const settingsDisabled = isDisabled
            || !JitsiMeetJS.mediaDevices.isMultipleAudioInputSupported();

        return visible ? (
            <AudioSettingsPopup>
                <ToolboxButtonWithIcon
                    icon = { IconArrowDown }
                    iconDisabled = { settingsDisabled }
                    onIconClick = { onAudioOptionsClick }>
                    <AudioMuteButton />
                </ToolboxButtonWithIcon>
            </AudioSettingsPopup>
        ) : <AudioMuteButton />;
    }
}

/**
 * Function that maps parts of Redux state tree into component props.
 *
 * @param {Object} state - Redux state.
 * @returns {Object}
 */
function mapStateToProps(state) {
    return {
        isDisabled: isAudioSettingsButtonDisabled(state),
        permissionPromptVisibility: getMediaPermissionPromptVisibility(state),
        visible: !isMobileBrowser()
    };
}

const mapDispatchToProps = {
    onAudioOptionsClick: toggleAudioSettings
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AudioSettingsButton);

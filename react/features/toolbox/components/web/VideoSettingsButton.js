// @flow

import React, { Component } from 'react';

import { isMobileBrowser } from '../../../base/environment/utils';
import { IconArrowDown } from '../../../base/icons';
import JitsiMeetJS from '../../../base/lib-jitsi-meet/_';
import { connect } from '../../../base/redux';
import { ToolboxButtonWithIcon } from '../../../base/toolbox/components';
import { getLocalJitsiVideoTrack } from '../../../base/tracks';
import { getMediaPermissionPromptVisibility } from '../../../overlay';
import { toggleVideoSettings, VideoSettingsPopup } from '../../../settings';
import { isVideoSettingsButtonDisabled } from '../../functions';
import VideoMuteButton from '../VideoMuteButton';

type Props = {

    /**
     * Click handler for the small icon. Opens video options.
     */
    onVideoOptionsClick: Function,

    /**
     * Whether the permission prompt is visible or not.
     * Useful for enabling the button on initial permission grant.
     */
    permissionPromptVisibility: boolean,

    /**
     * Whether there is a video track or not.
     */
    hasVideoTrack: boolean,

    /**
     * If the button should be disabled
     */
    isDisabled: boolean,

    /**
     * Flag controlling the visibility of the button.
     * VideoSettings popup is currently disabled on mobile browsers
     * as mobile devices do not support capture of more than one
     * camera at a time.
     */
    visible: boolean,
};

/**
 * Button used for video & video settings.
 *
 * @returns {ReactElement}
 */
class VideoSettingsButton extends Component<Props, State> {
    _isMounted: boolean;

    /**
     * Initializes a new {@code VideoSettingsButton} instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this._isMounted = true;
    }

    /**
     * Returns true if the settings icon is disabled.
     *
     * @returns {boolean}
     */
    _isIconDisabled() {
        const { hasVideoTrack, isDisabled } = this.props;

        return isDisabled && !hasVideoTrack;
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
        const { onVideoOptionsClick, visible } = this.props;

        return visible ? (
            <VideoSettingsPopup>
                <ToolboxButtonWithIcon
                    icon = { IconArrowDown }
                    iconDisabled = { this._isIconDisabled() }
                    onIconClick = { onVideoOptionsClick }>
                    <VideoMuteButton />
                </ToolboxButtonWithIcon>
            </VideoSettingsPopup>
        ) : <VideoMuteButton />;
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
        hasVideoTrack: Boolean(getLocalJitsiVideoTrack(state)),
        isDisabled: isVideoSettingsButtonDisabled(state),
        permissionPromptVisibility: getMediaPermissionPromptVisibility(state),
        visible: !isMobileBrowser()
    };
}

const mapDispatchToProps = {
    onVideoOptionsClick: toggleVideoSettings
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(VideoSettingsButton);
